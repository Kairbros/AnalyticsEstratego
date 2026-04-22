import 'dotenv/config';
import { pool } from '../config/db.js';
import { hashPassword } from '../services/password.service.js';

async function seed() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const nombre = process.env.SUPER_ADMIN_NOMBRE ?? 'Super Admin';

  if (!email || !password) {
    console.error('[seed] falta SUPER_ADMIN_EMAIL o SUPER_ADMIN_PASSWORD en .env');
    process.exit(1);
  }

  const existing = await pool.query('SELECT id FROM usuarios WHERE email = $1', [email]);
  if (existing.rowCount > 0) {
    console.log(`[seed] super admin ya existe (${email}), nada que hacer.`);
    await pool.end();
    return;
  }

  const hash = await hashPassword(password);

  await pool.query(
    `INSERT INTO usuarios (email, password_hash, rol, nombre)
     VALUES ($1, $2, 'super_admin', $3)`,
    [email, hash, nombre],
  );

  console.log(`[seed] super admin creado: ${email}`);
  await pool.end();
}

seed().catch((err) => {
  console.error('[seed] error:', err);
  process.exit(1);
});
