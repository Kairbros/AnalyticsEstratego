import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import {
  obtenerDiagnostico,
  actualizarDiagnostico,
  calcularDiagnostico,
  descargarPropuestaPDF,
} from '../../services/diagnosticos.service';
import ResultadosDiagnostico from '../../components/ResultadosDiagnostico';

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

const CRM_OPCIONES = [
  { value: 'tiempo_real', label: 'Se actualiza en tiempo real' },
  { value: 'con_retraso', label: 'Se actualiza con retraso' },
  { value: 'no_tiene', label: 'No tiene CRM' },
];

const BLOQUE_A_INICIAL = {
  facturacion_mensual_usd: '',
  leads_mes: '',
  canales_leads: [],
  equipo_ventas: '',
  ticket_promedio: '',
  sector: '',
  sector_otro: '',
  inversion_publicidad_mensual: '',
};

// Compat: diagnósticos viejos guardaban `leads_semana`. Si llega un payload
// legacy, lo convertimos a `leads_mes` al cargar para que el formulario use
// solo el campo nuevo.
function normalizarBloqueA(guardado) {
  const base = normalizar(BLOQUE_A_INICIAL, guardado);
  if (
    (base.leads_mes == null || base.leads_mes === '') &&
    guardado &&
    guardado.leads_semana != null &&
    guardado.leads_semana !== ''
  ) {
    base.leads_mes = String(Number(guardado.leads_semana) * 4);
  }
  return base;
}
const BLOQUE_B_INICIAL = {
  leads_respondidos_mismo_dia: '',
  tiempo_respuesta_valor: '',
  tiempo_respuesta_unidad: 'min',
  reuniones_de_10_contactados: '',
  asistencia_de_10: '',
  cierres_de_10_reuniones: '',
  tiene_seguimiento: false,
  seguimiento_descripcion: '',
  crm_actualizacion: '',
};

// Penalización aplicada al potencial de contacto/agendamiento por velocidad
// de respuesta. Coincide con la matriz `factoresRespuesta` del backend.
// Valor = (1 - F_contact) * 100, capado a 0 cuando la velocidad es óptima.
//   0-5 min: 0%, 5-10 min: 15%, 10-30 min: 35%, 30-60 min: 48%,
//   1-4 h: 58%, 4-24 h: 68%, >24 h: 80%
export function calcularPenalizacionRespuesta(minutos) {
  const m = Number(minutos);
  if (!Number.isFinite(m) || m <= 5) return 0;
  if (m <= 10) return 15;
  if (m <= 30) return 35;
  if (m <= 60) return 48;
  if (m <= 240) return 58;
  if (m <= 1440) return 68;
  return 80;
}

function tiempoRespuestaEnMinutos(valor, unidad) {
  const v = Number(valor);
  if (!Number.isFinite(v) || v < 0) return null;
  return unidad === 'h' ? v * 60 : v;
}
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
  // 0 es un valor válido: mucha gente no tiene este dato registrado.
  // Lo inicializamos como '0' (no '') para que el slider no quede en estado
  // "sin tocar" y el validador no lo rechace.
  ventas_perdidas_conocidas: '0',
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
  const [nombre, setNombre] = useState('');
  const [propuestaAcordada, setPropuestaAcordada] = useState('');
  const [descargandoPropuesta, setDescargandoPropuesta] = useState(false);
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
  const [infoCorreo, setInfoCorreo] = useState('');
  const [erroresValidacion, setErroresValidacion] = useState([]);

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
        setNombre(d.nombre || '');
        setPropuestaAcordada(d.propuesta_acordada || '');
        setData({
          a: normalizarBloqueA(d.bloque_a),
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
    const t = setTimeout(async () => {
      setGuardando(true);
      setErrorGuardado('');
      try {
        const payload = {
          nombre: nombre.trim() ? nombre.trim() : null,
        };
        if (!bloqueado) {
          payload.bloque_a = data.a;
          payload.bloque_b = data.b;
          payload.bloque_c = data.c;
          payload.bloque_d = data.d;
          payload.propuesta_acordada = propuestaAcordada.trim()
            ? propuestaAcordada.trim()
            : null;
        }
        const actualizado = await actualizarDiagnostico(diagId, payload);
        setUltimoGuardado(new Date(actualizado.actualizado_en));
      } catch (err) {
        setErrorGuardado(err.response?.data?.error || 'No se pudo guardar');
      } finally {
        setGuardando(false);
      }
    }, 900);
    return () => clearTimeout(t);
  }, [data, nombre, propuestaAcordada, bloqueado, diagId]);

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

  function validarCampos() {
    const errores = [];
    const a = data.a, b = data.b, c = data.c, d = data.d;
    const lleno = (v) => v !== '' && v != null;
    const llenoPositivo = (v) => lleno(v) && Number(v) > 0;

    if (!llenoPositivo(a.facturacion_mensual_usd)) errores.push('Facturación mensual');
    if (!llenoPositivo(a.leads_mes)) errores.push('Leads por mes');
    if (!a.canales_leads || a.canales_leads.length === 0) errores.push('Canales de captación de leads');
    if (!lleno(a.equipo_ventas)) errores.push('Personas en el equipo de ventas');
    if (!llenoPositivo(a.ticket_promedio)) errores.push('Ticket promedio');
    if (!a.sector) errores.push('Sector');
    if (a.sector === 'otro' && !a.sector_otro?.trim()) errores.push('Detalle del sector');
    if (!llenoPositivo(a.inversion_publicidad_mensual)) errores.push('Inversión publicitaria mensual');

    if (!lleno(b.leads_respondidos_mismo_dia)) errores.push('Leads respondidos el mismo día');
    if (!llenoPositivo(b.tiempo_respuesta_valor)) errores.push('Tiempo promedio de primera respuesta');
    if (!lleno(b.reuniones_de_10_contactados)) errores.push('Reuniones agendadas (de 10)');
    if (!lleno(b.asistencia_de_10)) errores.push('Asistencia a reuniones (de 10)');
    if (!lleno(b.cierres_de_10_reuniones)) errores.push('Cierres de venta (de 10)');
    if (!b.crm_actualizacion) errores.push('Actualización del CRM');
    if (b.tiene_seguimiento && !b.seguimiento_descripcion?.trim())
      errores.push('Descripción del proceso de seguimiento');

    if (!llenoPositivo(c.costo_por_lead)) errores.push('Costo por lead');
    if (!llenoPositivo(c.clientes_activos)) errores.push('Clientes activos');
    if (!llenoPositivo(c.ltv_cliente)) errores.push('LTV por cliente');

    if (!lleno(d.horas_semanales_seguimiento)) errores.push('Horas semanales de seguimiento');
    if (d.tiene_horario_atencion && !d.horario_atencion?.trim())
      errores.push('Detalle del horario de atención');
    if (!d.leads_fuera_horario?.trim()) errores.push('Qué pasa con los leads fuera de horario');
    if (!lleno(d.ventas_perdidas_conocidas)) errores.push('Ventas perdidas conocidas');

    if (!propuestaAcordada.trim() || propuestaAcordada.trim().length < 20) {
      errores.push('Propuesta acordada con el cliente (mínimo 20 caracteres)');
    }

    return errores;
  }

  async function handleCalcular() {
    const faltantes = validarCampos();
    if (faltantes.length > 0) {
      setErroresValidacion(faltantes);
      setErrorCalculo('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setErroresValidacion([]);
    const ok = window.confirm(
      'Al calcular los resultados el diagnóstico quedará marcado como completado y no podrá editarse. ¿Continuar?',
    );
    if (!ok) return;
    setCalculando(true);
    setErrorCalculo('');
    setInfoCorreo('');
    try {
      const resp = await calcularDiagnostico(diagId);
      listoParaAutosave.current = false;
      setDiagnostico(resp.diagnostico);
      const partes = [];
      if (resp.correoEnviado) {
        partes.push(
          'Se envió un correo al cliente con su nueva contraseña y el enlace.',
        );
      } else if (resp.avisoCorreo) {
        partes.push(resp.avisoCorreo);
      }
      if (resp.propuestaPlan) {
        partes.push(
          `Propuesta generada (plan ${resp.propuestaPlan.toUpperCase()}) y adjunta al correo.`,
        );
      } else if (resp.avisoPropuesta) {
        partes.push(resp.avisoPropuesta);
      }
      if (partes.length) setInfoCorreo(partes.join(' '));
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
    const leadsMes = Number(data.a.leads_mes);
    if (!Number.isFinite(inv) || !Number.isFinite(leadsMes)) return null;
    if (inv <= 0 || leadsMes <= 0) return null;
    return +(inv / leadsMes).toFixed(2);
  }, [data.a.inversion_publicidad_mensual, data.a.leads_mes]);

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
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-estratego-gold">
                    Diagnóstico #{diagnostico.id}
                  </p>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    maxLength={200}
                    placeholder="Nombre del diagnóstico (opcional)"
                    className="mt-1 w-full bg-transparent border-0 border-b border-transparent hover:border-estratego-border focus:border-estratego-gold focus:outline-none font-display text-xl font-semibold text-slate-100 placeholder:text-slate-500 placeholder:font-normal px-0 py-1"
                  />
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

              <section className="card">
                <header className="mb-3">
                  <h3 className="font-display text-lg font-semibold text-slate-100">
                    Propuesta acordada con el cliente
                    <span className="text-estratego-danger ml-1">*</span>
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Escribe lo que conversaste con el cliente: plan tentativo, alcance,
                    canales, tiempos y cualquier detalle que quieras que el agente IA
                    considere al armar la propuesta final.
                  </p>
                </header>
                <textarea
                  rows={5}
                  maxLength={5000}
                  placeholder="Ej. Cliente acordó implementación tipo LAUNCH con WhatsApp como canal principal, foco en automatizar respuesta inicial y agendamiento. Disponible para arrancar la próxima semana. Quiere enfatizar el ROI a 3 meses…"
                  className={claseInput}
                  value={propuestaAcordada}
                  onChange={(e) => setPropuestaAcordada(e.target.value)}
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  {propuestaAcordada.length} / 5000
                </p>
              </section>
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

            {erroresValidacion.length > 0 && (
              <section className="card border-estratego-danger/40 bg-estratego-danger/5">
                <h3 className="font-display text-sm font-semibold text-estratego-danger uppercase tracking-wider mb-2">
                  Faltan campos obligatorios ({erroresValidacion.length})
                </h3>
                <ul className="text-sm text-slate-300 list-disc pl-5 space-y-0.5">
                  {erroresValidacion.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </section>
            )}

            {infoCorreo && (
              <p className="text-sm text-estratego-success bg-estratego-success/10 border border-estratego-success/20 rounded-lg px-3 py-2">
                {infoCorreo}
              </p>
            )}

            {bloqueado && diagnostico.propuesta_plan && (
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
                  disabled={descargandoPropuesta}
                  onClick={async () => {
                    setDescargandoPropuesta(true);
                    try {
                      await descargarPropuestaPDF(
                        diagId,
                        `propuesta_${diagnostico.propuesta_plan}_${diagnostico.cliente_nombre || diagId}.pdf`,
                      );
                    } finally {
                      setDescargandoPropuesta(false);
                    }
                  }}
                  className="btn-gold"
                >
                  {descargandoPropuesta ? 'Descargando…' : 'Descargar propuesta PDF'}
                </button>
              </section>
            )}

            {bloqueado && diagnostico.resultados && (
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

function Campo({ label, children, full = false, required = false }) {
  return (
    <div className={`flex flex-col ${full ? 'md:col-span-2' : ''}`}>
      <label className={claseLabel}>
        {label}
        {required && <span className="text-estratego-danger ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function BarraSegmentada({ valor, max = 10, onChange }) {
  const num = Number(valor);
  const v = Number.isFinite(num) ? Math.min(max, Math.max(0, Math.round(num))) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-0.5 flex-1">
        {Array.from({ length: max }).map((_, i) => {
          const activo = i < v;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onChange(String(i + 1))}
              className={`flex-1 h-5 rounded transition-colors ${
                activo
                  ? 'bg-estratego-gold hover:bg-estratego-gold/90'
                  : 'bg-estratego-border/50 hover:bg-estratego-border'
              }`}
              aria-label={`Seleccionar ${i + 1}`}
            />
          );
        })}
      </div>
      <span className="font-display text-sm font-semibold text-estratego-gold whitespace-nowrap min-w-[36px] text-right">
        {v}<span className="text-slate-500 font-normal">/{max}</span>
      </span>
    </div>
  );
}

function Slider({ valor, min = 0, max, step = 1, sufijo = '', onChange }) {
  const num = Number(valor);
  const v = Number.isFinite(num) ? Math.min(max, Math.max(min, num)) : min;
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={v}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 accent-estratego-gold cursor-pointer"
      />
      <span className="font-display text-sm font-semibold text-estratego-gold whitespace-nowrap min-w-[60px] text-right">
        {v}{sufijo ? <span className="text-slate-500 font-normal">{sufijo}</span> : null}
      </span>
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
      <Campo label="Facturación mensual (USD)" required>
        <input
          type="number"
          min={0}
          step="0.01"
          className={claseInput}
          placeholder="Ej. 25000"
          value={data.facturacion_mensual_usd}
          onChange={(e) => set('facturacion_mensual_usd', e.target.value)}
        />
      </Campo>

      <Campo label="Leads por mes" required>
        <input
          type="number"
          min={0}
          placeholder="Ej. 100"
          className={claseInput}
          value={data.leads_mes}
          onChange={(e) => set('leads_mes', e.target.value)}
        />
      </Campo>

      <Campo label="Canales de captación de leads" full required>
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

      <Campo label="Personas en el equipo de ventas" required>
        <Slider
          valor={data.equipo_ventas}
          min={0}
          max={30}
          step={1}
          sufijo=" personas"
          onChange={(v) => set('equipo_ventas', v)}
        />
      </Campo>

      <Campo label="Ticket promedio (USD)" required>
        <input
          type="number"
          min={0}
          step="0.01"
          placeholder="Ej. 450"
          className={claseInput}
          value={data.ticket_promedio}
          onChange={(e) => set('ticket_promedio', e.target.value)}
        />
      </Campo>

      <Campo label="Sector" required>
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
        <Campo label="Especifica el sector" required>
          <input
            type="text"
            maxLength={100}
            placeholder="Ej. Turismo, Agroindustria…"
            className={claseInput}
            value={data.sector_otro}
            onChange={(e) => set('sector_otro', e.target.value)}
          />
        </Campo>
      )}

      <Campo label="Inversión publicitaria mensual (USD)" required>
        <input
          type="number"
          min={0}
          step="0.01"
          placeholder="Ej. 1500"
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
      <Campo label="De 10 leads, ¿a cuántos responden el mismo día?" required>
        <BarraSegmentada
          valor={data.leads_respondidos_mismo_dia}
          max={10}
          onChange={(v) => set('leads_respondidos_mismo_dia', v)}
        />
      </Campo>

      <Campo label="De 10 contactados, ¿cuántos agendan reunión?" required>
        <BarraSegmentada
          valor={data.reuniones_de_10_contactados}
          max={10}
          onChange={(v) => set('reuniones_de_10_contactados', v)}
        />
      </Campo>

      <Campo label="De 10 reuniones agendadas, ¿cuántas asisten?" required>
        <BarraSegmentada
          valor={data.asistencia_de_10}
          max={10}
          onChange={(v) => set('asistencia_de_10', v)}
        />
      </Campo>

      <Campo label="De 10 reuniones, ¿cuántas cierran venta?" required>
        <BarraSegmentada
          valor={data.cierres_de_10_reuniones}
          max={10}
          onChange={(v) => set('cierres_de_10_reuniones', v)}
        />
      </Campo>

      <Campo label="Tiempo promedio de primera respuesta" required>
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            step="1"
            placeholder="Ej. 30"
            className={`${claseInput} flex-1`}
            value={data.tiempo_respuesta_valor}
            onChange={(e) => set('tiempo_respuesta_valor', e.target.value)}
          />
          <div className="flex rounded border border-estratego-border overflow-hidden text-xs">
            {[
              { value: 'min', label: 'min' },
              { value: 'h', label: 'h' },
            ].map((u) => (
              <button
                key={u.value}
                type="button"
                onClick={() => set('tiempo_respuesta_unidad', u.value)}
                className={`px-3 py-1 ${
                  data.tiempo_respuesta_unidad === u.value
                    ? 'bg-estratego-gold text-estratego-ink font-semibold'
                    : 'bg-transparent text-slate-400 hover:bg-white/5'
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>
        {(() => {
          const min = tiempoRespuestaEnMinutos(
            data.tiempo_respuesta_valor,
            data.tiempo_respuesta_unidad,
          );
          const p = calcularPenalizacionRespuesta(min);
          if (min == null || min <= 0) {
            return (
              <p className="text-[11px] text-slate-500 mt-1">
                Ingresa cuánto tarda en promedio la primera respuesta a un lead.
              </p>
            );
          }
          if (p === 0) {
            return (
              <div className="mt-1 space-y-1">
                <p className="text-[11px] text-estratego-success">
                  Velocidad óptima — sin penalización sobre el potencial.
                </p>
                <p className="text-[11px] text-estratego-gold">
                  Control del Instante™ mantiene la respuesta en{' '}
                  <strong>&lt;60 segundos</strong>, conservando el bonus{' '}
                  <strong>+10%</strong> sobre el contacto.
                </p>
              </div>
            );
          }
          return (
            <div className="mt-1 space-y-1">
              <p className="text-[11px] text-estratego-danger">
                Penalización aplicada al potencial proyectado:{' '}
                <strong>−{p}%</strong>
              </p>
              <p className="text-[11px] text-estratego-success">
                Con Control del Instante™ tu respuesta media baja a{' '}
                <strong>&lt;60 segundos</strong>, eliminando esta penalización y
                agregando un bonus de <strong>+10%</strong> al contacto.
              </p>
            </div>
          );
        })()}
      </Campo>

      <Campo label="Actualización del CRM" required>
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
      <Campo label="Costo por lead (USD)" required>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            step="0.01"
            placeholder="Ej. 15"
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
          Sugerencia = inversión mensual ÷ leads por mes
        </span>
      </Campo>

      <Campo label="Clientes activos" required>
        <input
          type="number"
          min={0}
          placeholder="Ej. 120"
          className={claseInput}
          value={data.clientes_activos}
          onChange={(e) => set('clientes_activos', e.target.value)}
        />
      </Campo>

      <Campo label="Valor total por cliente (USD)" required>
        <input
          type="number"
          min={0}
          step="0.01"
          placeholder="Ej. 1200"
          className={claseInput}
          value={data.ltv_cliente}
          onChange={(e) => set('ltv_cliente', e.target.value)}
        />
        <p className="text-[11px] text-slate-500 mt-1">
          Cuánto gasta un cliente en promedio durante todo el tiempo que compra contigo.
        </p>
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
      <Campo label="Horas semanales dedicadas a seguimiento" required>
        <Slider
          valor={data.horas_semanales_seguimiento}
          min={0}
          max={40}
          step={1}
          sufijo=" h/sem"
          onChange={(v) => set('horas_semanales_seguimiento', v)}
        />
      </Campo>

      <Campo label="Ventas perdidas conocidas (último mes)" required>
        <Slider
          valor={data.ventas_perdidas_conocidas}
          min={0}
          max={50}
          step={1}
          sufijo=" ventas"
          onChange={(v) => set('ventas_perdidas_conocidas', v)}
        />
        <p className="text-[11px] text-slate-500 mt-1">
          Si no tienes el dato, déjalo en 0. Solo cuenta ventas que sepas
          confirmadamente que se perdieron (no estimaciones).
        </p>
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

      <Campo label="¿Qué pasa con los leads fuera de horario?" full required>
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
