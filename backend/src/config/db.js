import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  console.error('[db] error inesperado en cliente del pool', err);
  process.exit(1);
});

export async function pingDb() {
  const { rows } = await pool.query('SELECT NOW() AS now');
  return rows[0].now;
}
