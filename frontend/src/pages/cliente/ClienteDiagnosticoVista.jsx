import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import {
  obtenerDiagnostico,
  descargarPropuestaPDF,
} from '../../services/diagnosticos.service';
import ResultadosDiagnostico from '../../components/ResultadosDiagnostico';

export default function ClienteDiagnosticoVista() {
  const { id } = useParams();
  const diagId = Number(id);
  const [diagnostico, setDiagnostico] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [descargando, setDescargando] = useState(false);

  useEffect(() => {
    if (!Number.isInteger(diagId) || diagId <= 0) {
      setError('ID de diagnóstico inválido');
      setCargando(false);
      return;
    }
    let cancelado = false;
    (async () => {
      setCargando(true);
      setError('');
      try {
        const d = await obtenerDiagnostico(diagId);
        if (!cancelado) setDiagnostico(d);
      } catch (err) {
        if (!cancelado)
          setError(
            err.response?.data?.error || 'No se pudo cargar el diagnóstico',
          );
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [diagId]);

  async function handleDescargar() {
    setDescargando(true);
    try {
      await descargarPropuestaPDF(
        diagId,
        `propuesta_${diagnostico.propuesta_plan}.pdf`,
      );
    } finally {
      setDescargando(false);
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <Link
          to="/cliente"
          className="text-sm text-slate-400 hover:text-estratego-gold"
        >
          ← Volver a mis diagnósticos
        </Link>

        {cargando && <p className="text-sm text-slate-400">Cargando…</p>}
        {error && <p className="text-sm text-estratego-danger">{error}</p>}

        {diagnostico && (
          <>
            {diagnostico.propuesta_plan && (
              <section className="card flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-semibold text-slate-100">
                    Propuesta comercial
                  </h3>
                  <p className="text-sm text-slate-400">
                    Plan recomendado:{' '}
                    <span className="text-estratego-gold font-semibold">
                      {String(diagnostico.propuesta_plan).toUpperCase()}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  disabled={descargando}
                  onClick={handleDescargar}
                  className="btn-gold"
                >
                  {descargando ? 'Descargando…' : 'Descargar propuesta PDF'}
                </button>
              </section>
            )}

            {diagnostico.resultados ? (
              <ResultadosDiagnostico
                resultados={diagnostico.resultados}
                diagnosticoId={diagnostico.id}
                nombreDiagnostico={diagnostico.nombre}
                cliente={{
                  nombre: diagnostico.cliente_nombre,
                  email: diagnostico.cliente_email,
                  empresa: diagnostico.cliente_empresa,
                }}
                fecha={diagnostico.actualizado_en}
              />
            ) : (
              <p className="text-sm text-slate-400">
                Este diagnóstico aún no tiene resultados calculados.
              </p>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
