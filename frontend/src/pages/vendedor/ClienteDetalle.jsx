import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import { obtenerCliente } from '../../services/diagnosticos.service';
import {
  listarDiagnosticosDeCliente,
  crearDiagnostico,
  eliminarDiagnostico,
} from '../../services/diagnosticos.service';

const ETIQUETA_ESTADO = {
  borrador: { texto: 'Borrador', clase: 'bg-estratego-warning/15 text-estratego-warning' },
  completado: { texto: 'Completado', clase: 'bg-estratego-success/15 text-estratego-success' },
};

export default function ClienteDetalle() {
  const { id } = useParams();
  const clienteId = Number(id);
  const navigate = useNavigate();

  const [cliente, setCliente] = useState(null);
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [creando, setCreando] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      const [c, diags] = await Promise.all([
        obtenerCliente(clienteId),
        listarDiagnosticosDeCliente(clienteId),
      ]);
      setCliente(c);
      setDiagnosticos(diags);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo cargar la información del cliente');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (!Number.isInteger(clienteId) || clienteId <= 0) {
      setError('ID de cliente inválido');
      setCargando(false);
      return;
    }
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clienteId]);

  async function handleEliminar(d) {
    const etiqueta = d.estado === 'completado' ? 'completado' : 'borrador';
    const ok = window.confirm(
      `¿Eliminar el diagnóstico #${d.id} (${etiqueta})?\nEsta acción no se puede deshacer.`,
    );
    if (!ok) return;
    setError('');
    setEliminandoId(d.id);
    try {
      await eliminarDiagnostico(d.id);
      setDiagnosticos((prev) => prev.filter((x) => x.id !== d.id));
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo eliminar el diagnóstico');
    } finally {
      setEliminandoId(null);
    }
  }

  async function handleNuevoDiagnostico() {
    setCreando(true);
    try {
      const d = await crearDiagnostico(clienteId);
      navigate(`/vendedor/diagnosticos/${d.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo crear el diagnóstico');
    } finally {
      setCreando(false);
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <Link to="/vendedor" className="text-sm text-slate-400 hover:text-estratego-gold">
            ← Volver a mis clientes
          </Link>
        </div>

        {cargando && <p className="text-sm text-slate-400">Cargando…</p>}
        {error && <p className="text-sm text-estratego-danger">{error}</p>}

        {cliente && (
          <section className="card">
            <h2 className="font-display text-xl font-semibold text-slate-100">{cliente.nombre}</h2>
            <div className="mt-2 grid gap-2 text-sm text-slate-300 md:grid-cols-2">
              <div>
                <span className="text-slate-400">Email:</span>{' '}
                <span className="font-mono">{cliente.email}</span>
              </div>
              <div>
                <span className="text-slate-400">Empresa:</span> {cliente.empresa || '—'}
              </div>
              <div>
                <span className="text-slate-400">Industria:</span> {cliente.industria || '—'}
              </div>
              <div>
                <span className="text-slate-400">Teléfono:</span> {cliente.telefono || '—'}
              </div>
            </div>
            {cliente.notas && (
              <p className="mt-3 text-sm text-slate-300">
                <span className="text-slate-400">Notas:</span> {cliente.notas}
              </p>
            )}
          </section>
        )}

        {cliente && (
          <section className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-semibold text-slate-100">Diagnósticos</h2>
              <button
                onClick={handleNuevoDiagnostico}
                disabled={creando}
                className="btn-gold"
              >
                {creando ? 'Creando…' : 'Nuevo diagnóstico'}
              </button>
            </div>

            {diagnosticos.length === 0 && (
              <p className="text-sm text-slate-400">
                Este cliente aún no tiene diagnósticos. Crea el primero para iniciar.
              </p>
            )}

            {diagnosticos.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-estratego-border">
                      <th className="py-2 pr-4 font-medium">#</th>
                      <th className="py-2 pr-4 font-medium">Nombre</th>
                      <th className="py-2 pr-4 font-medium">Estado</th>
                      <th className="py-2 pr-4 font-medium">Creado</th>
                      <th className="py-2 pr-4 font-medium">Actualizado</th>
                      <th className="py-2 pr-4 font-medium text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagnosticos.map((d) => {
                      const e = ETIQUETA_ESTADO[d.estado] || ETIQUETA_ESTADO.borrador;
                      return (
                        <tr key={d.id} className="border-b border-estratego-border/50">
                          <td className="py-2 pr-4">#{d.id}</td>
                          <td className="py-2 pr-4 text-slate-200">
                            {d.nombre || <span className="text-slate-500">—</span>}
                          </td>
                          <td className="py-2 pr-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${e.clase}`}>
                              {e.texto}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-slate-400">
                            {new Date(d.creado_en).toLocaleString()}
                          </td>
                          <td className="py-2 pr-4 text-slate-400">
                            {new Date(d.actualizado_en).toLocaleString()}
                          </td>
                          <td className="py-2 pr-4 text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <Link
                                to={`/vendedor/diagnosticos/${d.id}`}
                                className="text-xs border border-estratego-border rounded px-2 py-1 hover:bg-white/5"
                              >
                                {d.estado === 'completado' ? 'Ver' : 'Continuar'}
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleEliminar(d)}
                                disabled={eliminandoId === d.id}
                                className="text-xs border border-estratego-border rounded px-2 py-1 hover:bg-estratego-danger/10 hover:border-estratego-danger hover:text-estratego-danger disabled:opacity-60"
                              >
                                {eliminandoId === d.id ? 'Eliminando…' : 'Eliminar'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </Layout>
  );
}
