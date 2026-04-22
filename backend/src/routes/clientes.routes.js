import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  crearUsuarioConPasswordGenerada,
  listarPorRol,
  regenerarPasswordDeUsuario,
  obtenerPorId as obtenerUsuarioPorId,
} from '../services/usuarios.service.js';
import {
  crearBorrador as crearBorradorDiagnostico,
  listarPorCliente as listarDiagnosticosPorCliente,
} from '../services/diagnosticos.service.js';

const router = Router();

const crearClienteSchema = z.object({
  email: z.string().email(),
  nombre: z.string().min(1).max(200),
  empresa: z.string().max(200).optional().nullable(),
  telefono: z.string().max(50).optional().nullable(),
  industria: z.string().max(100).optional().nullable(),
  notas: z.string().optional().nullable(),
});

// Solo vendedor crea clientes
router.post('/', requireAuth, requireRole('vendedor'), async (req, res, next) => {
  const parsed = crearClienteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
  }
  try {
    const { usuario, passwordPlano } = await crearUsuarioConPasswordGenerada({
      ...parsed.data,
      rol: 'cliente',
      creadoPor: req.user.id,
    });
    res.status(201).json({ usuario, passwordTemporal: passwordPlano });
  } catch (err) {
    if (err.status === 409) return res.status(409).json({ error: err.message });
    next(err);
  }
});

// Vendedor ve solo SUS clientes. Super admin ve todos.
router.get('/', requireAuth, requireRole('vendedor', 'super_admin'), async (req, res, next) => {
  try {
    const filtro = req.user.rol === 'vendedor' ? { creadoPor: req.user.id } : {};
    const clientes = await listarPorRol('cliente', filtro);
    res.json({ clientes });
  } catch (err) {
    next(err);
  }
});

// Vendedor ve un cliente puntual (si es suyo). Super admin ve cualquiera.
router.get(
  '/:id',
  requireAuth,
  requireRole('vendedor', 'super_admin'),
  async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });
    try {
      const cliente = await obtenerUsuarioPorId(id);
      if (!cliente || cliente.rol !== 'cliente') {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }
      if (req.user.rol === 'vendedor' && cliente.creado_por !== req.user.id) {
        return res.status(403).json({ error: 'Este cliente no te pertenece' });
      }
      res.json({ cliente });
    } catch (err) {
      next(err);
    }
  },
);

// Crea un nuevo diagnóstico (borrador) para un cliente del vendedor
router.post(
  '/:id/diagnosticos',
  requireAuth,
  requireRole('vendedor'),
  async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });
    try {
      const cliente = await obtenerUsuarioPorId(id);
      if (!cliente || cliente.rol !== 'cliente') {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }
      if (cliente.creado_por !== req.user.id) {
        return res.status(403).json({ error: 'Este cliente no te pertenece' });
      }
      const diagnostico = await crearBorradorDiagnostico({
        clienteId: id,
        vendedorId: req.user.id,
      });
      res.status(201).json({ diagnostico });
    } catch (err) {
      next(err);
    }
  },
);

// Lista diagnósticos de un cliente. Acceso: vendedor-dueño, super_admin, cliente-propio.
router.get(
  '/:id/diagnosticos',
  requireAuth,
  async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'ID inválido' });
    try {
      const cliente = await obtenerUsuarioPorId(id);
      if (!cliente || cliente.rol !== 'cliente') {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }
      const { rol, id: userId } = req.user;
      const autorizado =
        rol === 'super_admin' ||
        (rol === 'vendedor' && cliente.creado_por === userId) ||
        (rol === 'cliente' && cliente.id === userId);
      if (!autorizado) return res.status(403).json({ error: 'Sin acceso' });

      let diagnosticos = await listarDiagnosticosPorCliente(id);
      // El cliente solo ve los completados
      if (rol === 'cliente') diagnosticos = diagnosticos.filter((d) => d.estado === 'completado');
      res.json({ diagnosticos });
    } catch (err) {
      next(err);
    }
  },
);

// Vendedor regenera contraseña solo de SUS clientes. Super admin puede regenerar cualquiera.
router.post(
  '/:id/regenerar-password',
  requireAuth,
  requireRole('vendedor', 'super_admin'),
  async (req, res, next) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    try {
      const opciones = { rolEsperado: 'cliente' };
      if (req.user.rol === 'vendedor') opciones.creadoPorEsperado = req.user.id;
      const { usuario, passwordPlano } = await regenerarPasswordDeUsuario(id, opciones);
      res.json({ usuario, passwordTemporal: passwordPlano });
    } catch (err) {
      if (err.status) return res.status(err.status).json({ error: err.message });
      next(err);
    }
  },
);

export default router;
