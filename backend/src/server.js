import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pingDb } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import vendedoresRoutes from './routes/vendedores.routes.js';
import clientesRoutes from './routes/clientes.routes.js';
import diagnosticosRoutes from './routes/diagnosticos.routes.js';

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
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
});
