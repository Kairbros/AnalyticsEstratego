import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  obtenerPorId,
  actualizarCampos,
  completarConResultados,
  guardarPropuestaGenerada,
  eliminar,
} from '../services/diagnosticos.service.js';
import { calcularResultados } from '../services/calculo.service.js';
import {
  regenerarPasswordDeUsuario,
  obtenerPorId as obtenerUsuarioPorId,
} from '../services/usuarios.service.js';
import { enviarCorreoDiagnosticoCompletado } from '../services/email.service.js';
import { generarPropuesta } from '../services/propuesta.service.js';
import { renderizarPropuestaPDF } from '../services/propuesta-pdf.service.js';

const router = Router();

const bloqueSchema = z.record(z.any());
const actualizarSchema = z.object({
  nombre: z.string().trim().max(200).nullable().optional(),
  bloque_a: bloqueSchema.optional(),
  bloque_b: bloqueSchema.optional(),
  bloque_c: bloqueSchema.optional(),
  bloque_d: bloqueSchema.optional(),
  propuesta_acordada: z.string().max(5000).nullable().optional(),
});

// Autoriza acceso a un diagnóstico según el rol del usuario.
// - super_admin: siempre
// - vendedor: solo si es el dueño del cliente
// - cliente: solo si es suyo y ya está completado (no ve borradores)
function autorizarAcceso(diagnostico, user, { permiteLectura = true } = {}) {
  if (user.rol === 'super_admin') return true;
  if (user.rol === 'vendedor') {
    return diagnostico.cliente_creado_por === user.id;
  }
  if (user.rol === 'cliente' && permiteLectura) {
    return diagnostico.cliente_id === user.id && diagnostico.estado === 'completado';
  }
  return false;
}

router.get('/:id', requireAuth, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });
  try {
    const diagnostico = await obtenerPorId(id);
    if (!diagnostico) return res.status(404).json({ error: 'Diagnóstico no encontrado' });
    if (!autorizarAcceso(diagnostico, req.user)) {
      return res.status(403).json({ error: 'No tienes acceso a este diagnóstico' });
    }
    res.json({ diagnostico });
  } catch (err) {
    next(err);
  }
});

// Solo el vendedor dueño del cliente puede editar bloques (autosave)
router.patch('/:id', requireAuth, requireRole('vendedor'), async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });
  const parsed = actualizarSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }
  try {
    const diagnostico = await obtenerPorId(id);
    if (!diagnostico) return res.status(404).json({ error: 'Diagnóstico no encontrado' });
    if (diagnostico.cliente_creado_por !== req.user.id) {
      return res.status(403).json({ error: 'No puedes editar este diagnóstico' });
    }
    const tocaBloques = ['bloque_a', 'bloque_b', 'bloque_c', 'bloque_d'].some(
      (k) => parsed.data[k] !== undefined,
    );
    if (tocaBloques && diagnostico.estado === 'completado') {
      return res.status(409).json({ error: 'El diagnóstico ya está completado' });
    }
    const actualizado = await actualizarCampos(id, parsed.data);
    res.json({ diagnostico: actualizado });
  } catch (err) {
    next(err);
  }
});

// Calcula los resultados, los persiste y marca el diagnóstico como completado.
router.post(
  '/:id/calcular',
  requireAuth,
  requireRole('vendedor'),
  async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0)
      return res.status(400).json({ error: 'ID inválido' });
    try {
      const diagnostico = await obtenerPorId(id);
      if (!diagnostico)
        return res.status(404).json({ error: 'Diagnóstico no encontrado' });
      if (diagnostico.cliente_creado_por !== req.user.id) {
        return res
          .status(403)
          .json({ error: 'No puedes calcular este diagnóstico' });
      }
      if (diagnostico.estado === 'completado') {
        return res
          .status(409)
          .json({ error: 'El diagnóstico ya está completado' });
      }
      const resultados = calcularResultados(diagnostico);
      let actualizado = await completarConResultados(id, resultados);
      const vendedor = await obtenerUsuarioPorId(req.user.id);

      // 1) Generar propuesta con OpenAI (opcional via env var)
      const PROPUESTA_ENABLED =
        (process.env.PROPUESTA_ENABLED ?? 'true').toLowerCase() !== 'false';
      let propuestaPlan = null;
      let propuestaPDF = null;
      let avisoPropuesta = null;
      if (PROPUESTA_ENABLED) {
        try {
          const prop = await generarPropuesta({
            diagnostico: actualizado,
            resultados,
            cliente: {
              nombre: diagnostico.cliente_nombre,
              email: diagnostico.cliente_email,
              empresa: diagnostico.cliente_empresa,
            },
            vendedor,
            propuestaAcordada: actualizado.propuesta_acordada || '',
          });
          actualizado = await guardarPropuestaGenerada(id, {
            plan: prop.plan,
            texto: prop.propuesta_texto,
          });
          propuestaPlan = prop.plan;
          propuestaPDF = await renderizarPropuestaPDF({
            textoPropuesta: prop.propuesta_texto,
            nombreCliente: diagnostico.cliente_nombre,
            nombreEmpresa: diagnostico.cliente_empresa,
            plan: prop.plan,
          });
        } catch (errProp) {
          console.error('[calcular] Error al generar propuesta:', errProp);
          avisoPropuesta =
            'El diagnóstico se completó, pero no se pudo generar la propuesta comercial automáticamente.';
        }
      } else {
        console.log('[calcular] Generación de propuesta desactivada (PROPUESTA_ENABLED=false)');
      }

      // 2) Regenerar contraseña + enviar correo con PDF adjunto
      let correoEnviado = false;
      let avisoCorreo = null;
      try {
        const { passwordPlano } = await regenerarPasswordDeUsuario(
          diagnostico.cliente_id,
          { rolEsperado: 'cliente', creadoPorEsperado: req.user.id },
        );
        const adjuntos = [];
        if (propuestaPDF) {
          adjuntos.push({
            filename: `propuesta_${propuestaPlan}_${diagnostico.cliente_id}.pdf`,
            content: propuestaPDF,
            contentType: 'application/pdf',
          });
        }
        await enviarCorreoDiagnosticoCompletado({
          clienteEmail: diagnostico.cliente_email,
          clienteNombre: diagnostico.cliente_nombre,
          vendedorNombre: vendedor?.nombre || 'Tu asesor',
          diagnosticoId: actualizado.id,
          diagnosticoNombre: actualizado.nombre,
          password: passwordPlano,
          fechaCompletado: actualizado.actualizado_en,
          adjuntos,
          propuestaPlan,
        });
        correoEnviado = true;
      } catch (errCorreo) {
        console.error('[calcular] Error al enviar correo al cliente:', errCorreo);
        avisoCorreo =
          'El diagnóstico se completó pero no se pudo enviar el correo al cliente.';
      }

      res.json({
        diagnostico: actualizado,
        correoEnviado,
        avisoCorreo,
        propuestaPlan,
        avisoPropuesta,
      });
    } catch (err) {
      next(err);
    }
  },
);

// Re-descarga la propuesta como PDF. Accesible por cliente dueño o vendedor.
router.get('/:id/propuesta.pdf', requireAuth, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0)
    return res.status(400).json({ error: 'ID inválido' });
  try {
    const diagnostico = await obtenerPorId(id);
    if (!diagnostico)
      return res.status(404).json({ error: 'Diagnóstico no encontrado' });
    if (!autorizarAcceso(diagnostico, req.user)) {
      return res
        .status(403)
        .json({ error: 'No tienes acceso a esta propuesta' });
    }
    if (!diagnostico.propuesta_generada) {
      return res
        .status(404)
        .json({ error: 'Este diagnóstico aún no tiene propuesta generada' });
    }
    const pdf = await renderizarPropuestaPDF({
      textoPropuesta: diagnostico.propuesta_generada,
      nombreCliente: diagnostico.cliente_nombre,
      nombreEmpresa: diagnostico.cliente_empresa,
      plan: diagnostico.propuesta_plan,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="propuesta_${diagnostico.propuesta_plan || 'estratego'}.pdf"`,
    );
    res.send(pdf);
  } catch (err) {
    next(err);
  }
});

// Elimina un diagnóstico. Permitido tanto en borrador como completado.
// Autorización: vendedor dueño del cliente o super_admin.
router.delete('/:id', requireAuth, async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0)
    return res.status(400).json({ error: 'ID inválido' });
  try {
    const diagnostico = await obtenerPorId(id);
    if (!diagnostico)
      return res.status(404).json({ error: 'Diagnóstico no encontrado' });
    const esAdmin = req.user.rol === 'super_admin';
    const esVendedorDueno =
      req.user.rol === 'vendedor' &&
      diagnostico.cliente_creado_por === req.user.id;
    if (!esAdmin && !esVendedorDueno) {
      return res
        .status(403)
        .json({ error: 'No puedes eliminar este diagnóstico' });
    }
    const ok = await eliminar(id);
    if (!ok) return res.status(404).json({ error: 'Diagnóstico no encontrado' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
