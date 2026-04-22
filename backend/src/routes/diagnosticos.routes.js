import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  obtenerPorId,
  actualizarBloques,
  completarConResultados,
} from '../services/diagnosticos.service.js';
import { calcularResultados } from '../services/calculo.service.js';

const router = Router();

const bloqueSchema = z.record(z.any());
const actualizarSchema = z.object({
  bloque_a: bloqueSchema.optional(),
  bloque_b: bloqueSchema.optional(),
  bloque_c: bloqueSchema.optional(),
  bloque_d: bloqueSchema.optional(),
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
    if (diagnostico.estado === 'completado') {
      return res.status(409).json({ error: 'El diagnóstico ya está completado' });
    }
    const actualizado = await actualizarBloques(id, parsed.data);
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
      const actualizado = await completarConResultados(id, resultados);
      res.json({ diagnostico: actualizado });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
