import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { listarDiagnosticosDeCliente } from '../../services/diagnosticos.service';

export default function ClienteListado() {
  const { usuario } = useAuth();
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!usuario) return;
    let cancelado = false;
    (async () => {
      setCargando(true);
      setError('');
      try {
        const diags = await listarDiagnosticosDeCliente(usuario.id);
        if (!cancelado) setDiagnosticos(diags);
      } catch (err) {
        if (!cancelado)
          setError(
            err.response?.data?.error || 'No se pudieron cargar los diagnósticos',
          );
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [usuario]);

  return (
    <Layout>
      <section className="card">
        <h2 className="font-display text-xl font-semibold mb-1 text-slate-100">Mis diagnósticos</h2>
        <p className="text-sm text-slate-400 mb-4">
          Aquí están los análisis que tu asesor ha preparado para ti.
        </p>

        {cargando && <p className="text-sm text-slate-400">Cargando…</p>}
        {error && <p className="text-sm text-estratego-danger">{error}</p>}

        {!cargando && !error && diagnosticos.length === 0 && (
          <p className="text-sm text-slate-400">
            Aún no tienes diagnósticos disponibles.
          </p>
        )}

        {diagnosticos.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-estratego-border">
                  <th className="py-2 pr-4 font-medium">#</th>
                  <th className="py-2 pr-4 font-medium">Nombre</th>
                  <th className="py-2 pr-4 font-medium">Fecha</th>
                  <th className="py-2 pr-4 font-medium text-right">Acción</th>
                </tr>
              </thead>
              <tbody>
                {diagnosticos.map((d) => (
                  <tr key={d.id} className="border-b border-estratego-border/50">
                    <td className="py-2 pr-4">#{d.id}</td>
                    <td className="py-2 pr-4 text-slate-200">
                      {d.nombre || <span className="text-slate-500">—</span>}
                    </td>
                    <td className="py-2 pr-4 text-slate-400">
                      {new Date(d.actualizado_en).toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <Link
                        to={`diagnosticos/${d.id}`}
                        className="text-xs border border-estratego-border rounded px-2 py-1 hover:bg-white/5"
                      >
                        Ver resultados
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Layout>
  );
}
