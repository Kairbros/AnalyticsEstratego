import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../config/db.js';
import { comparePassword } from '../services/password.service.js';
import { signToken } from '../services/token.service.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Email o contraseña inválidos', detalles: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;

  const { rows } = await pool.query(
    `SELECT id, email, password_hash, rol, nombre, activo
       FROM usuarios WHERE email = $1`,
    [email],
  );

  const user = rows[0];
  if (!user || !user.activo) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const ok = await comparePassword(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  const token = signToken({ id: user.id, email: user.email, rol: user.rol });
  res.json({
    token,
    usuario: { id: user.id, email: user.email, rol: user.rol, nombre: user.nombre },
  });
});

router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, email, rol, nombre, empresa, telefono, industria, creado_en
       FROM usuarios WHERE id = $1`,
    [req.user.id],
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ usuario: rows[0] });
});

export default router;
