import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import {
  obtenerDiagnostico,
  actualizarDiagnostico,
  calcularDiagnostico,
} from '../../services/diagnosticos.service';
import ResultadosDiagnostico from '../../components/ResultadosDiagnostico';

const FACTURACION_OPCIONES = [
  { value: 'menor_15k', label: '< USD 15,000' },
  { value: '15k_30k', label: 'USD 15,000 – 30,000' },
  { value: '30k_60k', label: 'USD 30,000 – 60,000' },
  { value: '60k_100k', label: 'USD 60,000 – 100,000' },
  { value: 'mayor_100k', label: '> USD 100,000' },
];

const CANALES_OPCIONES = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'referidos', label: 'Referidos' },
  { value: 'web', label: 'Sitio web' },
  { value: 'llamadas', label: 'Llamadas' },
  { value: 'otro', label: 'Otro' },
];

const SECTOR_OPCIONES = [
  { value: 'retail', label: 'Retail' },
  { value: 'saas', label: 'SaaS' },
  { value: 'servicios_profesionales', label: 'Servicios profesionales' },
  { value: 'salud', label: 'Salud' },
  { value: 'educacion', label: 'Educación' },
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'inmobiliaria', label: 'Inmobiliaria' },
  { value: 'restaurantes', label: 'Restaurantes' },
  { value: 'construccion', label: 'Construcción' },
  { value: 'manufactura', label: 'Manufactura' },
  { value: 'otro', label: 'Otro' },
];

const TIEMPO_RESPUESTA_OPCIONES = [
  { value: 'menor_1h', label: 'Menos de 1 hora' },
  { value: '1h_4h', label: '1 a 4 horas' },
  { value: '4h_24h', label: '4 a 24 horas' },
  { value: 'mayor_24h', label: 'Más de 24 horas' },
];

const CRM_OPCIONES = [
  { value: 'tiempo_real', label: 'Se actualiza en tiempo real' },
  { value: 'con_retraso', label: 'Se actualiza con retraso' },
  { value: 'no_tiene', label: 'No tiene CRM' },
];

const BLOQUE_A_INICIAL = {
  facturacion_mensual_rango: '',
  leads_semana: '',
  canales_leads: [],
  equipo_ventas: '',
  ticket_promedio: '',
  sector: '',
  sector_otro: '',
  inversion_publicidad_mensual: '',
};
const BLOQUE_B_INICIAL = {
  leads_respondidos_mismo_dia: '',
  tiempo_respuesta: '',
  reuniones_de_10_contactados: '',
  asistencia_de_10: '',
  cierres_de_10_reuniones: '',
  tiene_seguimiento: false,
  seguimiento_descripcion: '',
  crm_actualizacion: '',
};
const BLOQUE_C_INICIAL = {
  costo_por_lead: '',
  clientes_activos: '',
  ltv_cliente: '',
};
const BLOQUE_D_INICIAL = {
  horas_semanales_seguimiento: '',
  tiene_horario_atencion: false,
  horario_atencion: '',
  leads_fuera_horario: '',
  ventas_perdidas_conocidas: '',
};

function normalizar(inicial, guardado) {
  if (!guardado || typeof guardado !== 'object') return { ...inicial };
  const resultado = { ...inicial };
  for (const [k, v] of Object.entries(guardado)) {
    if (v == null) continue;
    resultado[k] = v;
  }
  return resultado;
}

const claseInput = 'input';
const claseLabel =
  'text-[11px] font-medium text-slate-400 mb-1.5 uppercase tracking-wider';

export default function DiagnosticoEditor() {
  const { id } = useParams();
  const diagId = Number(id);

  const [diagnostico, setDiagnostico] = useState(null);
  const [data, setData] = useState({
    a: BLOQUE_A_INICIAL,
    b: BLOQUE_B_INICIAL,
    c: BLOQUE_C_INICIAL,
    d: BLOQUE_D_INICIAL,
  });
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState('');
  const [ultimoGuardado, setUltimoGuardado] = useState(null);
  const [calculando, setCalculando] = useState(false);
  const [errorCalculo, setErrorCalculo] = useState('');

  const listoParaAutosave = useRef(false);

  useEffect(() => {
    if (!Number.isInteger(diagId) || diagId <= 0) {
      setErrorCarga('ID de diagnóstico inválido');
      setCargando(false);
      return;
    }
    let cancelado = false;
    (async () => {
      setCargando(true);
      setErrorCarga('');
      try {
        const d = await obtenerDiagnostico(diagId);
        if (cancelado) return;
        setDiagnostico(d);
        setData({
          a: normalizar(BLOQUE_A_INICIAL, d.bloque_a),
          b: normalizar(BLOQUE_B_INICIAL, d.bloque_b),
          c: normalizar(BLOQUE_C_INICIAL, d.bloque_c),
          d: normalizar(BLOQUE_D_INICIAL, d.bloque_d),
        });
        setUltimoGuardado(new Date(d.actualizado_en));
        queueMicrotask(() => {
          listoParaAutosave.current = true;
        });
      } catch (err) {
        if (!cancelado) {
          setErrorCarga(
            err.response?.data?.error || 'No se pudo cargar el diagnóstico',
          );
        }
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [diagId]);

  const bloqueado = diagnostico?.estado === 'completado';

  useEffect(() => {
    if (!listoParaAutosave.current) return;
    if (bloqueado) return;
    const t = setTimeout(async () => {
      setGuardando(true);
      setErrorGuardado('');
      try {
        const actualizado = await actualizarDiagnostico(diagId, {
          bloque_a: data.a,
          bloque_b: data.b,
          bloque_c: data.c,
          bloque_d: data.d,
        });
        setUltimoGuardado(new Date(actualizado.actualizado_en));
      } catch (err) {
        setErrorGuardado(err.response?.data?.error || 'No se pudo guardar');
      } finally {
        setGuardando(false);
      }
    }, 900);
    return () => clearTimeout(t);
  }, [data, bloqueado, diagId]);

  function setBloque(key, updater) {
    setData((prev) => ({
      ...prev,
      [key]: typeof updater === 'function' ? updater(prev[key]) : updater,
    }));
  }

  function toggleCanal(valor) {
    setBloque('a', (a) => {
      const existe = a.canales_leads.includes(valor);
      return {
        ...a,
        canales_leads: existe
          ? a.canales_leads.filter((v) => v !== valor)
          : [...a.canales_leads, valor],
      };
    });
  }

  async function handleCalcular() {
    const ok = window.confirm(
      'Al calcular los resultados el diagnóstico quedará marcado como completado y no podrá editarse. ¿Continuar?',
    );
    if (!ok) return;
    setCalculando(true);
    setErrorCalculo('');
    try {
      const actualizado = await calcularDiagnostico(diagId);
      listoParaAutosave.current = false;
      setDiagnostico(actualizado);
    } catch (err) {
      setErrorCalculo(
        err.response?.data?.error || 'No se pudo calcular el diagnóstico',
      );
    } finally {
      setCalculando(false);
    }
  }

  const costoPorLeadSugerido = useMemo(() => {
    const inv = Number(data.a.inversion_publicidad_mensual);
    const leadsSem = Number(data.a.leads_semana);
    if (!Number.isFinite(inv) || !Number.isFinite(leadsSem)) return null;
    if (inv <= 0 || leadsSem <= 0) return null;
    return +(inv / (leadsSem * 4)).toFixed(2);
  }, [data.a.inversion_publicidad_mensual, data.a.leads_semana]);

  const estadoGuardadoTexto = guardando
    ? 'Guardando…'
    : errorGuardado
      ? errorGuardado
      : ultimoGuardado
        ? `Guardado ${ultimoGuardado.toLocaleTimeString()}`
        : '';

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Link
            to={
              diagnostico?.cliente_id
                ? `/vendedor/clientes/${diagnostico.cliente_id}`
                : '/vendedor'
            }
            className="text-sm text-slate-400 hover:text-estratego-primary"
          >
            ← Volver al cliente
          </Link>
          <div className="text-xs text-slate-400">
            {estadoGuardadoTexto && (
              <span
                className={
                  errorGuardado
                    ? 'text-estratego-danger'
                    : guardando
                      ? 'text-slate-400'
                      : 'text-estratego-success'
                }
              >
                {estadoGuardadoTexto}
              </span>
            )}
          </div>
        </div>

        {cargando && <p className="text-sm text-slate-400">Cargando…</p>}
        {errorCarga && <p className="text-sm text-estratego-danger">{errorCarga}</p>}

        {diagnostico && (
          <>
            <section className="card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl font-semibold text-slate-100">
                    Diagnóstico #{diagnostico.id}
                  </h2>
                  <p className="text-sm text-slate-300 mt-1">
                    {diagnostico.cliente_nombre}
                    {diagnostico.cliente_empresa
                      ? ` — ${diagnostico.cliente_empresa}`
                      : ''}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full self-start ${
                    bloqueado
                      ? 'bg-estratego-success/15 text-estratego-success'
                      : 'bg-estratego-warning/15 text-estratego-warning'
                  }`}
                >
                  {bloqueado ? 'Completado' : 'Borrador'}
                </span>
              </div>
              {bloqueado && (
                <p className="mt-3 text-xs text-slate-400">
                  Este diagnóstico está completado y no puede editarse.
                </p>
              )}
            </section>

            <fieldset disabled={bloqueado} className="space-y-6">
              <BloqueA
                data={data.a}
                onChange={(v) => setBloque('a', v)}
                onToggleCanal={toggleCanal}
              />
              <BloqueB data={data.b} onChange={(v) => setBloque('b', v)} />
              <BloqueC
                data={data.c}
                onChange={(v) => setBloque('c', v)}
                costoSugerido={costoPorLeadSugerido}
              />
              <BloqueD data={data.d} onChange={(v) => setBloque('d', v)} />
            </fieldset>

            {!bloqueado && (
              <section className="card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-display text-lg font-semibold text-slate-100">Calcular resultados</h3>
                  <p className="text-sm text-slate-400">
                    Genera el análisis final y marca el diagnóstico como completado.
                    Esta acción no se puede deshacer.
                  </p>
                  {errorCalculo && (
                    <p className="text-sm text-estratego-danger mt-2">
                      {errorCalculo}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCalcular}
                  disabled={calculando || guardando}
                  className="btn-gold px-5 py-2.5"
                >
                  {calculando ? 'Calculando…' : 'Calcular resultados'}
                </button>
              </section>
            )}

            {bloqueado && diagnostico.resultados && (
              <ResultadosDiagnostico
                resultados={diagnostico.resultados}
                diagnosticoId={diagnostico.id}
                cliente={{
                  nombre: diagnostico.cliente_nombre,
                  email: diagnostico.cliente_email,
                  empresa: diagnostico.cliente_empresa,
                }}
                fecha={diagnostico.actualizado_en}
              />
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

function Card({ titulo, descripcion, tag, children }) {
  return (
    <section className="card">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold text-slate-100">
            {titulo}
          </h3>
          {descripcion && (
            <p className="text-sm text-slate-400 mt-1">{descripcion}</p>
          )}
        </div>
        {tag && (
          <span className="pill bg-estratego-gold text-estratego-ink shrink-0">
            {tag}
          </span>
        )}
      </header>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Campo({ label, children, full = false }) {
  return (
    <div className={`flex flex-col ${full ? 'md:col-span-2' : ''}`}>
      <label className={claseLabel}>{label}</label>
      {children}
    </div>
  );
}

function BloqueA({ data, onChange, onToggleCanal }) {
  const set = (campo, valor) => onChange((a) => ({ ...a, [campo]: valor }));
  return (
    <Card
      titulo="Contexto del negocio"
      descripcion="Información base para dimensionar el embudo y la inversión comercial."
      tag="Bloque A"
    >
      <Campo label="Facturación mensual">
        <select
          className={claseInput}
          value={data.facturacion_mensual_rango}
          onChange={(e) => set('facturacion_mensual_rango', e.target.value)}
        >
          <option value="">Selecciona…</option>
          {FACTURACION_OPCIONES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Campo>

      <Campo label="Leads por semana">
        <input
          type="number"
          min={0}
          className={claseInput}
          value={data.leads_semana}
          onChange={(e) => set('leads_semana', e.target.value)}
        />
      </Campo>

      <Campo label="Canales de captación de leads" full>
        <div className="flex flex-wrap gap-2">
          {CANALES_OPCIONES.map((c) => {
            const activo = data.canales_leads.includes(c.value);
            return (
              <button
                type="button"
                key={c.value}
                onClick={() => onToggleCanal(c.value)}
                className={`text-xs rounded-full px-3 py-1 border ${
                  activo
                    ? 'bg-estratego-gold text-estratego-ink border-estratego-gold'
                    : 'bg-estratego-ink text-slate-300 border-estratego-border hover:border-estratego-gold hover:text-estratego-gold'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </Campo>

      <Campo label="Personas en el equipo de ventas">
        <input
          type="number"
          min={0}
          className={claseInput}
          value={data.equipo_ventas}
          onChange={(e) => set('equipo_ventas', e.target.value)}
        />
      </Campo>

      <Campo label="Ticket promedio (USD)">
        <input
          type="number"
          min={0}
          step="0.01"
          className={claseInput}
          value={data.ticket_promedio}
          onChange={(e) => set('ticket_promedio', e.target.value)}
        />
      </Campo>

      <Campo label="Sector">
        <select
          className={claseInput}
          value={data.sector}
          onChange={(e) => set('sector', e.target.value)}
        >
          <option value="">Selecciona…</option>
          {SECTOR_OPCIONES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Campo>

      {data.sector === 'otro' && (
        <Campo label="Especifica el sector">
          <input
            type="text"
            maxLength={100}
            className={claseInput}
            value={data.sector_otro}
            onChange={(e) => set('sector_otro', e.target.value)}
          />
        </Campo>
      )}

      <Campo label="Inversión publicitaria mensual (USD)">
        <input
          type="number"
          min={0}
          step="0.01"
          className={claseInput}
          value={data.inversion_publicidad_mensual}
          onChange={(e) => set('inversion_publicidad_mensual', e.target.value)}
        />
      </Campo>
    </Card>
  );
}

function BloqueB({ data, onChange }) {
  const set = (campo, valor) => onChange((b) => ({ ...b, [campo]: valor }));
  return (
    <Card
      titulo="Embudo y operación comercial"
      descripcion="Tasas reales del proceso de ventas actual."
      tag="Bloque B"
    >
      <Campo label="De 10 leads, ¿a cuántos responden el mismo día?">
        <input
          type="number"
          min={0}
          max={10}
          className={claseInput}
          value={data.leads_respondidos_mismo_dia}
          onChange={(e) => set('leads_respondidos_mismo_dia', e.target.value)}
        />
      </Campo>

      <Campo label="Tiempo promedio de primera respuesta">
        <select
          className={claseInput}
          value={data.tiempo_respuesta}
          onChange={(e) => set('tiempo_respuesta', e.target.value)}
        >
          <option value="">Selecciona…</option>
          {TIEMPO_RESPUESTA_OPCIONES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Campo>

      <Campo label="De 10 contactados, ¿cuántos agendan reunión?">
        <input
          type="number"
          min={0}
          max={10}
          className={claseInput}
          value={data.reuniones_de_10_contactados}
          onChange={(e) => set('reuniones_de_10_contactados', e.target.value)}
        />
      </Campo>

      <Campo label="De 10 reuniones agendadas, ¿cuántas asisten?">
        <input
          type="number"
          min={0}
          max={10}
          className={claseInput}
          value={data.asistencia_de_10}
          onChange={(e) => set('asistencia_de_10', e.target.value)}
        />
      </Campo>

      <Campo label="De 10 reuniones, ¿cuántas cierran venta?">
        <input
          type="number"
          min={0}
          max={10}
          className={claseInput}
          value={data.cierres_de_10_reuniones}
          onChange={(e) => set('cierres_de_10_reuniones', e.target.value)}
        />
      </Campo>

      <Campo label="Actualización del CRM">
        <select
          className={claseInput}
          value={data.crm_actualizacion}
          onChange={(e) => set('crm_actualizacion', e.target.value)}
        >
          <option value="">Selecciona…</option>
          {CRM_OPCIONES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Campo>

      <Campo label="¿Hay proceso de seguimiento?" full>
        <label className="inline-flex items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={!!data.tiene_seguimiento}
            onChange={(e) => set('tiene_seguimiento', e.target.checked)}
          />
          Sí, existe un proceso definido
        </label>
        {data.tiene_seguimiento && (
          <textarea
            rows={2}
            placeholder="Describe brevemente cómo se hace el seguimiento"
            className={`${claseInput} mt-2`}
            value={data.seguimiento_descripcion}
            onChange={(e) => set('seguimiento_descripcion', e.target.value)}
          />
        )}
      </Campo>
    </Card>
  );
}

function BloqueC({ data, onChange, costoSugerido }) {
  const set = (campo, valor) => onChange((c) => ({ ...c, [campo]: valor }));
  return (
    <Card
      titulo="Economía por cliente"
      descripcion="Costos de adquisición y valor de vida del cliente."
      tag="Bloque C"
    >
      <Campo label="Costo por lead (USD)">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            step="0.01"
            className={`${claseInput} flex-1`}
            value={data.costo_por_lead}
            onChange={(e) => set('costo_por_lead', e.target.value)}
          />
          <button
            type="button"
            disabled={costoSugerido == null}
            onClick={() => set('costo_por_lead', String(costoSugerido))}
            title={
              costoSugerido == null
                ? 'Completa inversión publicitaria y leads por semana'
                : `Usar ${costoSugerido}`
            }
            className="text-xs border border-estratego-border rounded px-2 py-1 hover:border-estratego-gold hover:text-estratego-gold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {costoSugerido == null ? 'Auto' : `Auto: ${costoSugerido}`}
          </button>
        </div>
        <span className="text-[11px] text-slate-400 mt-1">
          Sugerencia = inversión mensual ÷ (leads/sem × 4)
        </span>
      </Campo>

      <Campo label="Clientes activos">
        <input
          type="number"
          min={0}
          className={claseInput}
          value={data.clientes_activos}
          onChange={(e) => set('clientes_activos', e.target.value)}
        />
      </Campo>

      <Campo label="LTV por cliente (USD)">
        <input
          type="number"
          min={0}
          step="0.01"
          className={claseInput}
          value={data.ltv_cliente}
          onChange={(e) => set('ltv_cliente', e.target.value)}
        />
      </Campo>
    </Card>
  );
}

function BloqueD({ data, onChange }) {
  const set = (campo, valor) => onChange((d) => ({ ...d, [campo]: valor }));
  return (
    <Card
      titulo="Capacidad y fugas"
      descripcion="Tiempo dedicado al seguimiento y leads que se pierden por falta de atención."
      tag="Bloque D"
    >
      <Campo label="Horas semanales dedicadas a seguimiento">
        <input
          type="number"
          min={0}
          step="0.5"
          className={claseInput}
          value={data.horas_semanales_seguimiento}
          onChange={(e) => set('horas_semanales_seguimiento', e.target.value)}
        />
      </Campo>

      <Campo label="Ventas perdidas conocidas (último mes)">
        <input
          type="number"
          min={0}
          className={claseInput}
          value={data.ventas_perdidas_conocidas}
          onChange={(e) => set('ventas_perdidas_conocidas', e.target.value)}
        />
      </Campo>

      <Campo label="¿Tiene horario de atención definido?" full>
        <label className="inline-flex items-center gap-2 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={!!data.tiene_horario_atencion}
            onChange={(e) => set('tiene_horario_atencion', e.target.checked)}
          />
          Sí, hay horario de atención
        </label>
        {data.tiene_horario_atencion && (
          <input
            type="text"
            placeholder="Ej. Lun–Vie 9:00 a 18:00"
            className={`${claseInput} mt-2`}
            value={data.horario_atencion}
            onChange={(e) => set('horario_atencion', e.target.value)}
          />
        )}
      </Campo>

      <Campo label="¿Qué pasa con los leads fuera de horario?" full>
        <textarea
          rows={2}
          placeholder="Describe qué sucede con los leads que llegan fuera del horario de atención"
          className={claseInput}
          value={data.leads_fuera_horario}
          onChange={(e) => set('leads_fuera_horario', e.target.value)}
        />
      </Campo>
    </Card>
  );
}
