import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pingDb } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import vendedoresRoutes from './routes/vendedores.routes.js';
import clientesRoutes from './routes/clientes.routes.js';
import diagnosticosRoutes from './routes/diagnosticos.routes.js';

const app = express();

// CORS: acepta una lista de orígenes (coma-separada) además del valor único.
// Devuelve siempre el header correcto incluso en respuestas 4xx/5xx.
const ORIGENES_PERMITIDOS = (process.env.CORS_ORIGIN ?? '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Requests server-to-server (sin Origin) → permitir.
      if (!origin) return cb(null, true);
      if (ORIGENES_PERMITIDOS.includes('*')) return cb(null, true);
      if (ORIGENES_PERMITIDOS.includes(origin)) return cb(null, true);
      return cb(new Error(`Origen no permitido: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  try {
    const now = await pingDb();
    res.json({ status: 'ok', db: 'connected', timestamp: now });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected', message: err.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/vendedores', vendedoresRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/diagnosticos', diagnosticosRoutes);

app.get('/', (_req, res) => {
  res.json({ name: 'AnalyticsEstratego API', version: '0.1.0' });
});

// Handler de errores global
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`[api] escuchando en http://localhost:${PORT}`);
  const k = process.env.OPENAI_API_KEY || '';
  console.log(
    '[env] OPENAI_API_KEY:',
    k ? `${k.slice(0, 8)}…${k.slice(-4)} (len ${k.length})` : 'NO configurada',
  );
  console.log('[env] OPENAI_MODEL:', process.env.OPENAI_MODEL || '(default)');
  console.log('[env] SMTP_USER:', process.env.SMTP_USER || 'NO configurado');
  console.log('[env] FRONTEND_URL:', process.env.FRONTEND_URL || '(default)');
  console.log('[env] DB_HOST:', process.env.DB_HOST || 'NO configurado');
  console.log('[env] DB_PORT:', process.env.DB_PORT || 'NO configurado');
  console.log('[env] DB_USER:', process.env.DB_USER || 'NO configurado');
  console.log('[env] DB_NAME:', process.env.DB_NAME || 'NO configurado');
  console.log(
    '[env] DB_PASSWORD:',
    process.env.DB_PASSWORD ? `(${process.env.DB_PASSWORD.length} chars)` : 'NO configurado',
  );
});
