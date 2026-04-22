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

export default router;
