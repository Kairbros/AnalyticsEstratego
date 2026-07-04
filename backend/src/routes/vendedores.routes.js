import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  crearUsuarioConPasswordGenerada,
  listarPorRol,
  regenerarPasswordDeUsuario,
} from '../services/usuarios.service.js';

const router = Router();

const crearVendedorSchema = z.object({
  email: z.string().email(),
  nombre: z.string().min(1).max(200),
  telefono: z.string().max(50).optional().nullable(),
});

// Solo super_admin puede crear vendedores
router.post('/', requireAuth, requireRole('super_admin'), async (req, res, next) => {
  const parsed = crearVendedorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }
  try {
    const { usuario, passwordPlano } = await crearUsuarioConPasswordGenerada({
      ...parsed.data,
      rol: 'vendedor',
      creadoPor: req.user.id,
    });
    res.status(201).json({ usuario, passwordTemporal: passwordPlano });
  } catch (err) {
    if (err.status === 409) return res.status(409).json({ error: err.message });
    next(err);
  }
});

// Solo super_admin lista todos los vendedores
router.get('/', requireAuth, requireRole('super_admin'), async (_req, res, next) => {
  try {
    const vendedores = await listarPorRol('vendedor');
    res.json({ vendedores });
  } catch (err) {
    next(err);
  }
});

// Super admin lista los clientes asignados a un vendedor
router.get('/:id/clientes', requireAuth, requireRole('super_admin'), async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID inválido' });
  }
  try {
    const clientes = await listarPorRol('cliente', { creadoPor: id });
    res.json({ clientes });
  } catch (err) {
    next(err);
  }
});

// Super admin regenera la contraseña de un vendedor
router.post('/:id/regenerar-password', requireAuth, requireRole('super_admin'), async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID inválido' });
  }
  try {
    const { usuario, passwordPlano } = await regenerarPasswordDeUsuario(id, { rolEsperado: 'vendedor' });
    res.json({ usuario, passwordTemporal: passwordPlano });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

// Proxy para solicitar demo webhook (evita CORS en frontend)
router.post('/solicitar-demo', requireAuth, requireRole('vendedor'), async (req, res, next) => {
  const { telefono } = req.body;
  if (!telefono) {
    return res.status(400).json({ error: 'El teléfono es requerido' });
  }

  try {
    const webhookUrl = 'https://bestai.bestvoiper.com/api/outbound/webhook/5474cf64da846350cb51a278c35cecd9e399bd1e27a3a0d0da97bd41aabab47d';
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ telefono }),
    });

    if (response.status === 200) {
      return res.status(200).json({ success: true });
    }

    let errorDetails = '';
    try {
      errorDetails = await response.text();
    } catch {}

    return res.status(response.status).json({
      error: errorDetails || response.statusText || 'Error en webhook externo',
    });
  } catch (err) {
    return res.status(500).json({ error: `Error de red en el proxy: ${err.message}` });
  }
});

export default router;
