import { useEffect, useState } from 'react';
import { getHealth } from '../services/api';

export default function Home() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-estratego-primary mb-2">
          AnalyticsEstratego
        </h1>
        <p className="text-slate-600 mb-6">
          Diagnóstico comercial en tiempo real
        </p>

        <div className="border-t pt-4">
          <h2 className="text-sm font-semibold uppercase text-slate-500 mb-2">
            Estado del sistema
          </h2>
          {error && (
            <div className="bg-red-50 text-estratego-danger p-3 rounded-lg text-sm">
              Error conectando al backend: {error}
            </div>
          )}
          {!error && !health && (
            <div className="text-slate-400 text-sm">Conectando…</div>
          )}
          {health && (
            <div className="bg-emerald-50 text-estratego-success p-3 rounded-lg text-sm">
              <div>API: {health.status}</div>
              <div>BD: {health.db}</div>
              <div className="text-xs text-slate-500 mt-1">
                {new Date(health.timestamp).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
