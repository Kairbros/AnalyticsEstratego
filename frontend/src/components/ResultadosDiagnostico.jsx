import { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = {
  gold: '#e9c158',
  success: '#34d399',
  danger: '#f87171',
  warning: '#f59e0b',
  axis: '#64748b',
  grid: '#2a2a3f',
  ink: '#08080f',
  panel: '#13131f',
  border: '#2a2a3f',
};

const TOOLTIP_STYLE = {
  backgroundColor: '#13131f',
  border: '1px solid #2a2a3f',
  borderRadius: 8,
  color: '#e2e8f0',
  fontSize: 12,
};
const AXIS_TICK = { fill: COLORS.axis, fontSize: 11 };

const fmtUSD = (n) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(+n) ? +n : 0);

const fmtNum = (n) =>
  new Intl.NumberFormat('es-CO').format(Math.round(Number.isFinite(+n) ? +n : 0));

const MES_NOMBRES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Resumen visual de cada plan para mostrar en la sección "Nivel recomendado".
// Los detalles completos viven en backend/resources/propuesta/*.txt; aquí
// solo necesitamos lo esencial para que el cliente sepa qué compra.
const PLAN_RESUMEN = {
  starter: {
    nombre: 'STARTER',
    titulo: 'Activación de Control del Instante™',
    primer_pago: 900,
    mensual: 600,
    permanencia: 6,
    para_quien: 'Negocios pequeños con < 100 leads/mes, sin CRM.',
    incluye: [
      'Canal comercial principal configurado',
      'Agente IA core (respuesta + calificación básica)',
      'CRM con pipeline simple',
      'Tablero KPI esencial',
      'Hasta 200 conversaciones/mes',
      'QA mensual durante el primer trimestre',
    ],
  },
  launch: {
    nombre: 'LAUNCH',
    titulo: 'Implementación Core de Control del Instante™',
    primer_pago: 2500,
    mensual: 900,
    permanencia: 3,
    para_quien: 'Operación establecida con 100–500 leads/mes.',
    incluye: [
      'Canal comercial + agente IA con calificación',
      'CRM personalizado (hasta 6 etapas)',
      'Tablero KPI con tasas por etapa',
      'Hasta 2 secuencias de seguimiento automático',
      'Agendamiento básico (Calendar / GHL / Calendly)',
      'Hasta 500 conversaciones/mes',
      'QA semanal el primer mes, quincenal después',
    ],
  },
  scale: {
    nombre: 'SCALE',
    titulo: 'Operación Escalada de Control del Instante™',
    primer_pago: 5000,
    mensual: 1000,
    permanencia: 3,
    para_quien: 'Operación con volumen, 500–1.500 leads/mes.',
    incluye: [
      'Multi-canal (WhatsApp, Instagram, web, llamadas)',
      'Agente IA avanzado con ramas por segmento',
      'CRM multi-pipeline + automatizaciones',
      'Secuencias de seguimiento por sub-segmento',
      'Hasta 1.500 conversaciones/mes',
      'Integraciones con herramientas existentes',
      'QA quincenal + ajustes mensuales incluidos',
    ],
  },
  premium: {
    nombre: 'PREMIUM',
    titulo: 'Arquitectura Comercial Completa Control del Instante™',
    primer_pago: 9000,
    mensual: 1500,
    permanencia: 6,
    para_quien: 'Operaciones complejas con > 1.500 leads/mes.',
    incluye: [
      'Arquitectura multi-canal + multi-equipo',
      'Agente IA personalizado por unidad de negocio',
      'CRM con pipelines paralelos + tableros ejecutivos',
      'Secuencias inteligentes con scoring de leads',
      'Conversaciones sin tope dentro del alcance',
      'Integraciones avanzadas + APIs custom',
      'QA semanal + Business AI Architect asignado',
    ],
  },
};

function sanitizarNombreArchivo(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'diagnostico';
}

function SeccionNumerada({ numero, titulo, descripcion, tono = 'gold', children, className = '' }) {
  const tonos = {
    gold: 'bg-estratego-gold text-estratego-ink',
    success: 'bg-estratego-success text-estratego-ink',
    danger: 'bg-estratego-danger text-estratego-ink',
    warning: 'bg-amber-500 text-estratego-ink',
    slate: 'bg-slate-600 text-slate-100',
  };
  return (
    <section className={`card h-full flex flex-col ${className}`}>
      <header className="mb-4 flex items-start gap-3">
        <span className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-md font-display font-bold text-sm leading-none ${tonos[tono] || tonos.gold}`}>
          <span className="block leading-none translate-y-px">{numero}</span>
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-base md:text-lg font-semibold text-slate-100 uppercase tracking-wide">
            {titulo}
          </h3>
          {descripcion && (
            <p className="text-sm text-slate-400 mt-0.5">{descripcion}</p>
          )}
        </div>
      </header>
      <div className="flex-1 flex flex-col">{children}</div>
    </section>
  );
}

function IconoCirculo({ children, tono = 'gold' }) {
  const fondos = {
    gold: 'bg-estratego-gold/15 border-estratego-gold/30 text-estratego-gold',
    success: 'bg-estratego-success/15 border-estratego-success/30 text-estratego-success',
    danger: 'bg-estratego-danger/15 border-estratego-danger/30 text-estratego-danger',
    indigo: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300',
  };
  return (
    <div className={`shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center ${fondos[tono] || fondos.gold}`}>
      {children}
    </div>
  );
}

const Icono = {
  Rayo: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" {...props}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor" />
    </svg>
  ),
  Calendario: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Usuarios: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Diana: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" {...props}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  Alerta: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" {...props}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Equis: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Check: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Info: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3" {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
  Logo: (props) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" {...props}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
};

function FilaEmbudoActual({ paso, etiqueta, sub, valor, perdida, max, tono }) {
  const ancho = max > 0 ? Math.max(2, (Number(valor) / max) * 100) : 2;
  const fondoBarra = {
    gold: 'bg-estratego-gold',
    warning: 'bg-amber-500',
    danger: 'bg-estratego-danger',
  };
  return (
    <div className="grid grid-cols-12 items-center gap-2 py-1.5">
      <div className="col-span-1 flex justify-center">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-estratego-border text-slate-300 text-[11px] font-semibold">
          {paso}
        </span>
      </div>
      <div className="col-span-4">
        <p className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold leading-tight">
          {etiqueta}
        </p>
        <p className="text-[10px] text-slate-500 leading-tight">{sub}</p>
      </div>
      <div className="col-span-4">
        <div className="relative h-7 bg-estratego-border/40 rounded overflow-hidden">
          <div
            className={`absolute inset-y-0 left-0 rounded ${fondoBarra[tono] || fondoBarra.gold}`}
            style={{ width: `${ancho}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-end pr-2">
            <span className="text-xs font-bold text-slate-100 drop-shadow">{fmtNum(valor)}</span>
          </div>
        </div>
      </div>
      <div className="col-span-3 text-right text-[11px]">
        {perdida ? (
          <div
            className={perdida.tooltip ? 'cursor-help' : ''}
            title={perdida.tooltip || undefined}
          >
            <p className="text-slate-400">{perdida.label}</p>
            <p className="text-estratego-danger font-semibold">{fmtUSD(-perdida.usd).replace('-', '−')}</p>
          </div>
        ) : (
          <p className="text-slate-500">—</p>
        )}
      </div>
    </div>
  );
}

function FilaRecuperable({ icono, titulo, sub, valor, acumulado, max }) {
  const ancho = max > 0 ? Math.max(10, (Number(valor) / max) * 100) : 10;
  return (
    <div className="py-2">
      <div className="flex items-start gap-3">
        <IconoCirculo tono="gold">{icono}</IconoCirculo>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm text-slate-200 font-semibold leading-tight">
              {titulo}
            </p>
            <p className="text-sm text-estratego-success font-bold whitespace-nowrap">
              +{fmtUSD(valor)}<span className="text-slate-400 font-normal text-xs"> /mes</span>
            </p>
          </div>
          <p className="text-[11px] text-slate-500 leading-tight">{sub}</p>
          <div className="relative h-2 bg-estratego-border/40 rounded-full mt-2">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-estratego-gold"
              style={{ width: `${ancho}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1 text-right">
            Acumulado: {fmtUSD(acumulado)}
          </p>
        </div>
      </div>
    </div>
  );
}

function FilaEmbudoCompacta({ pct, etiqueta, valor, max, tono }) {
  const ancho = max > 0 ? Math.max(8, (Number(valor) / max) * 100) : 8;
  const colores = {
    actual: 'bg-slate-500/70',
    optimizado: 'bg-estratego-gold/80',
  };
  return (
    <div className="grid grid-cols-12 items-center gap-2 py-1">
      <div className="col-span-2 text-right text-[11px] text-slate-400 font-mono">{pct}%</div>
      <div className="col-span-7 relative h-7 bg-estratego-border/30 rounded overflow-hidden border border-estratego-border/40">
        <div
          className={`absolute inset-y-0 left-0 ${colores[tono]}`}
          style={{ width: `${ancho}%` }}
        />
        <span className="relative z-10 h-full flex items-center px-2 text-[11px] text-slate-100 font-medium whitespace-nowrap overflow-hidden text-ellipsis">
          {etiqueta}
        </span>
      </div>
      <div className="col-span-3 text-right text-sm font-semibold text-slate-100">{fmtNum(valor)}</div>
    </div>
  );
}

function PersonasGrid({ totalNoResponden = 30, total = 100 }) {
  const cols = 20;
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
      {Array.from({ length: total }).map((_, i) => {
        const esRojo = i < totalNoResponden;
        return (
          <span
            key={i}
            className={`block w-3 h-4 rounded-sm ${esRojo ? 'bg-estratego-danger' : 'bg-slate-600'}`}
            title={esRojo ? 'No responde' : 'Responde'}
          />
        );
      })}
    </div>
  );
}

export default function ResultadosDiagnostico({
  resultados,
  diagnosticoId,
  nombreDiagnostico,
  cliente,
  fecha,
}) {
  const reporteRef = useRef(null);
  const [exportando, setExportando] = useState(false);

  if (!resultados) return null;

  const embudo = resultados.embudo_actual;
  const opt = resultados.escenario_optimizado;
  const fuga = resultados.fuga_capital;
  const roi = resultados.roi;
  // Helpers visuales para tooltips sin librerías extra.
  // `title` nativo + cursor-help → suficiente para diagnóstico técnico.
  const titleAttr = (texto) => ({ title: texto });

  const maxEmbudo = Math.max(
    embudo.leads,
    embudo.contactados,
    embudo.reuniones,
    embudo.asistidas,
    embudo.ventas,
    1,
  );
  const maxOpt = Math.max(
    opt.leads,
    opt.contactados,
    opt.reuniones,
    opt.asistidas,
    opt.ventas,
    1,
  );
  const maxComparativo = Math.max(maxEmbudo, maxOpt, 1);

  const ticket = resultados.entradas?.ticket_promedio ?? 0;
  const sinAgendar = Math.max(0, embudo.contactados - embudo.reuniones);
  const noShow = Math.max(0, embudo.reuniones - embudo.asistidas);
  const sinCerrar = Math.max(0, embudo.asistidas - embudo.ventas);

  // === Modelo único de mejora (realista) ===========================
  // Todo el reporte (fuga, recuperable, decisión) se ancla a la mejora real
  // del ROI: la anual con ramp-up + tope del backend. El mensual se deriva
  // como anual ÷ 12 para que /mes × 12 == /año SIEMPRE (lo contrario era el
  // bug: $14k/mes pero $8.8k/año). La proyección y el payback explican la
  // forma del ramp-up; aquí solo importa que los totales cuadren.
  const mejoraAnualReal = roi.mejora_anual ?? opt.mejora_anual ?? 0;
  const mejoraMensualReal = mejoraAnualReal / 12;

  const penalizacionPct = opt.penalizacion_tiempo_respuesta_pct || 0;
  const tiempoRespMin = opt.tiempo_respuesta_min || 0;

  // Proporción por palanca basada en pérdidas teóricas por etapa, incluyendo el impacto de velocidad en la primera respuesta.
  const propTeorica = (() => {
    const pResp = (fuga.fuga_por_no_responder_mes || 0) + (embudo.leads * (penalizacionPct / 100) * ticket * (embudo.ventas / Math.max(1, embudo.leads)));
    const pAgenda = sinAgendar * ticket * (embudo.ventas / Math.max(1, embudo.contactados));
    const pShow = noShow * ticket * (embudo.ventas / Math.max(1, embudo.reuniones));
    const pCierre = sinCerrar * ticket;
    return [pResp, pAgenda, pShow, pCierre];
  })();
  const pesos = propTeorica;
  const sumaPesos = pesos.reduce((s, v) => s + v, 0);
  const repartir = (i) =>
    sumaPesos > 0 ? mejoraMensualReal * (pesos[i] / sumaPesos) : 0;
  const recResponder = repartir(0);
  const recAgendar = repartir(1);
  const recAsistir = repartir(2);
  const recCerrar = repartir(3);

  const respondeMismoDiaPct = embudo.leads
    ? (embudo.contactados / embudo.leads) * 100
    : 0;
  const noRespondenPct = Math.min(
    100,
    Math.max(
      0,
      Math.round(100 - respondeMismoDiaPct)
    )
  );

  const reunionesEfectivas = embudo.reuniones;
  const contactadosEfectivos = embudo.contactados;

  const leadsPerdidosFinal = embudo.leads - contactadosEfectivos;
  const sinAgendarEfectivo = Math.max(0, contactadosEfectivos - reunionesEfectivas);
  const noShowEfectivo = Math.max(0, reunionesEfectivas - embudo.asistidas);

  const factorMejora = embudo.ventas > 0 && opt.ventas > 0
    ? +(opt.ventas / embudo.ventas).toFixed(1)
    : null;
  const factorAbs = embudo.ventas === 0 && opt.ventas > 0 ? Math.round(opt.ventas) : null;

  const ingresosActuales = embudo.ingresos_mes || 0;
  const ingresosOpt = opt.ingresos_mes || 0;
  // Usamos la proyección del backend que ya incluye ramp-up ease-out:
  // los primeros meses la mejora es parcial, alcanza el potencial completo
  // alrededor del mes 6. Acumulamos para mostrar como curva de ingresos
  // totales acumulados año a año.
  const proyeccionBackend = Array.isArray(resultados.proyeccion_12m)
    ? resultados.proyeccion_12m
    : [];
  let acumActual = 0;
  let acumPlan = 0;
  const proyeccionData = (
    proyeccionBackend.length === 12
      ? proyeccionBackend.map((p) => {
        acumActual += ingresosActuales;
        acumPlan += p.con_plan;
        return {
          mes: p.etiqueta || MES_NOMBRES[p.mes - 1] || `M${p.mes}`,
          actual: Math.round(acumActual),
          optimizado: Math.round(acumPlan),
        };
      })
      : MES_NOMBRES.map((m, i) => ({
        mes: m,
        actual: Math.round(ingresosActuales * (i + 1)),
        optimizado: Math.round(ingresosOpt * (i + 1)),
      }))
  );

  // Se reporta el payback siempre en meses (con un decimal). Mostrar días
  // no era realista — un sistema con ramp-up no se paga en horas.
  const mesesRecuperacion = roi.meses_recuperacion != null
    ? Math.max(0.5, Number(roi.meses_recuperacion))
    : null;

  // Datos del plan recomendado. Preferimos los campos del backend; si el
  // diagnóstico es viejo y no los trae, caemos al resumen local del plan.
  const planKey = String(roi.plan_recomendado || '').toLowerCase();
  const planInfo = PLAN_RESUMEN[planKey] || null;
  const setupInicial = roi.inversion_total ?? roi.inversion_anual ?? planInfo?.primer_pago ?? 0;
  const feeMensualContinuidad = roi.fee_mensual_continuidad ?? planInfo?.mensual ?? null;
  const permanenciaMeses = roi.permanencia_meses ?? planInfo?.permanencia ?? null;
  const mejoraMensualMadura = roi.mejora_mensual ?? opt.mejora_mes ?? 0;
  // La continuidad mensual se "sostiene sola" solo si la mejora mensual madura
  // la supera. No lo afirmamos a ciegas: comparamos los números.
  const mejoraCubreFee =
    feeMensualContinuidad != null && mejoraMensualMadura >= feeMensualContinuidad;
  // Cuando el retorno a 12 meses es negativo (volumen/conversión chicos para
  // el plan), no mostramos un "-78%" en rojo: lideramos con el payback real
  // y un mensaje medido. El número sigue siendo honesto, solo mejor enmarcado.
  const roiPositivo = Number(roi.roi_porcentaje) >= 0;

  // Costo actual / costo de oportunidad / beneficio esperado. Vienen del
  // backend (bloque `costos`); con fallback para diagnósticos viejos.
  const costos = resultados.costos || {};
  const cpl = costos.costo_por_lead ?? resultados.entradas?.costo_por_lead ?? 0;
  const leadsPerdidosMes =
    costos.leads_perdidos_mes ?? Math.max(0, embudo.leads - embudo.ventas);
  const costoActualMes = costos.costo_actual_mes ?? leadsPerdidosMes * cpl;
  const costoActualAnual = costos.costo_actual_anual ?? costoActualMes * 12;
  const tasaAlcanzablePct =
    costos.tasa_conversion_alcanzable_pct ??
    Math.round((opt.ventas / Math.max(1, opt.leads)) * 100);
  const costoOportunidadMes =
    costos.costo_oportunidad_mes ??
    leadsPerdidosMes * (tasaAlcanzablePct / 100) * ticket;
  const costoOportunidadAnual =
    costos.costo_oportunidad_anual ?? costoOportunidadMes * 12;
  const beneficioMes = mejoraMensualReal;
  const beneficioAnual = costos.beneficio_anual ?? mejoraAnualReal;
  const ventasAdicionalesMes =
    costos.ventas_adicionales_mes ?? Math.max(0, opt.ventas - embudo.ventas);

  const recuperablesData = [
    {
      icono: <Icono.Rayo />,
      titulo: 'Responder a tiempo (menos de 60 seg.)',
      sub: 'Más leads calientes convertidos',
      valor: recResponder,
    },
    {
      icono: <Icono.Calendario />,
      titulo: 'Agendar más reuniones calificadas',
      sub: 'Calificación automática + scripts',
      valor: recAgendar,
    },
    {
      icono: <Icono.Usuarios />,
      titulo: 'Aumentar asistencia a reuniones',
      sub: 'Recordatorios + confirmaciones',
      valor: recAsistir,
    },
    {
      icono: <Icono.Diana />,
      titulo: 'Cerrar más ventas',
      sub: 'Seguimiento inteligente + objeciones',
      valor: recCerrar,
    },
  ];
  const maxRecuperable = Math.max(...recuperablesData.map((r) => r.valor), 1);
  let acum = 0;
  const recuperablesConAcum = recuperablesData.map((r) => {
    acum += r.valor;
    return { ...r, acumulado: acum };
  });
  // Total recuperable = mejora mensual realista (el reparto por palanca suma
  // esto por construcción). /año = mejora anual realista → /mes × 12 == /año.
  const totalRecuperable = mejoraMensualReal;
  const fugaMensualEmbudo = mejoraMensualReal;
  const fugaAnualEmbudo = mejoraAnualReal;

  async function descargarPDF() {
    const nodo = reporteRef.current;
    if (!nodo) return;
    setExportando(true);
    try {
      const canvas = await html2canvas(nodo, {
        scale: 2,
        backgroundColor: COLORS.ink,
        useCORS: true,
        logging: false,
        windowWidth: nodo.scrollWidth,
      });
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pdf = new jsPDF({
        orientation: pdfHeight >= pdfWidth ? 'p' : 'l',
        unit: 'mm',
        format: [pdfWidth, pdfHeight],
      });
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      const nombreArchivo = nombreDiagnostico?.trim()
        ? sanitizarNombreArchivo(nombreDiagnostico)
        : 'diagnostico';
      pdf.save(`${nombreArchivo}.pdf`);
    } finally {
      setExportando(false);
    }
  }

  const fechaTxt = fecha
    ? new Date(fecha).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    : new Date().toLocaleDateString('es-CO');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button type="button" onClick={descargarPDF} disabled={exportando} className="btn-gold">
          {exportando ? 'Generando PDF…' : 'Descargar PDF'}
        </button>
      </div>

      <div ref={reporteRef} className="space-y-4 p-4 rounded-2xl" style={{ backgroundColor: COLORS.ink }}>
        {/* HEADER */}
        <section className="card">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-estratego-gold/15 border border-estratego-gold/30 flex items-center justify-center text-estratego-gold">
                <Icono.Logo className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-estratego-gold leading-none">AnalyticsEstratego</p>
                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                  {diagnosticoId ? `Diagnóstico #${diagnosticoId}` : ''}
                </p>
              </div>
            </div>
            <div className="text-center flex-1 min-w-[200px]">
              <h2 className="font-display text-xl md:text-2xl font-bold text-slate-100 tracking-wide">
                {nombreDiagnostico?.trim() || 'DIAGNÓSTICO COMERCIAL'}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wider">
                Tu negocio hoy vs. tu negocio optimizado
              </p>
            </div>
            <div className="text-right text-xs text-slate-300">
              {cliente?.nombre && (
                <p>
                  <span className="text-slate-500">Cliente:</span>{' '}
                  <span className="font-semibold text-slate-100">{cliente.nombre}</span>
                </p>
              )}
              <p>
                <span className="text-slate-500">Fecha:</span>{' '}
                <span className="text-slate-100">{fechaTxt}</span>
              </p>
            </div>
          </div>
        </section>

        {/* SECCIÓN 1: IMPACTO ACTUAL (full width) */}
        <SeccionNumerada
          numero="1"
          tono="danger"
          titulo="Impacto actual"
          descripcion="¿Cuánto dinero estás perdiendo cada mes?"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="font-display text-5xl md:text-6xl font-bold text-estratego-danger leading-none">
                {fmtUSD(fugaMensualEmbudo)}
                <span className="text-lg text-slate-400 font-normal ml-2">/ MES</span>
              </p>
              <p className="font-display text-2xl font-semibold text-estratego-danger/80 mt-3">
                {fmtUSD(fugaAnualEmbudo)}
                <span className="text-sm text-slate-400 font-normal ml-2">/ AÑO</span>
              </p>
              <p className="text-xs text-slate-400 mt-3 max-w-md flex items-start gap-1.5">
                <Icono.Alerta className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Mejora que el sistema proyecta recuperar al corregir las fugas
                  del embudo, con tope prudente y ramp-up de adopción. El valor
                  anual es el del ROI; el mensual es ese anual ÷ 12.
                </span>
              </p>
            </div>
            <div className="bg-estratego-ink/60 border border-estratego-border rounded-xl p-4">
              <p className="text-sm text-slate-200">
                De cada 100 personas interesadas,{' '}
                <strong className="text-estratego-danger">{noRespondenPct} se pierden o enfrían</strong> por demoras o falta de respuesta.
              </p>
              <div className="my-3">
                <PersonasGrid totalNoResponden={noRespondenPct} total={100} />
              </div>
              <p className="text-[11px] text-slate-400 border-t border-estratego-border pt-2 mt-2 flex items-start gap-1.5">
                <Icono.Equis className="w-3.5 h-3.5 text-estratego-danger shrink-0 mt-0.5" />
                <span>{noRespondenPct} oportunidades que se pierden o enfrían antes de que puedas hablar con ellas.</span>
              </p>
            </div>
          </div>
        </SeccionNumerada>

        {/* SECCIONES 2 + 3 lado a lado */}
        <div className="grid gap-4 md:grid-cols-2">
          <SeccionNumerada
            numero="2"
            tono="warning"
            titulo="Tu embudo actual"
            descripcion="Dónde se escapa el dinero"
          >
            <div className="flex-1 flex flex-col justify-around gap-1">
              <FilaEmbudoActual paso="1" etiqueta="Leads que llegan" sub="Personas interesadas" valor={embudo.leads} max={maxEmbudo} tono="gold" />
              <FilaEmbudoActual
                paso="2"
                etiqueta="Respondidos"
                sub="Respuesta el mismo día"
                valor={contactadosEfectivos}
                max={maxEmbudo}
                tono="warning"
                perdida={{
                  label: `${fmtNum(leadsPerdidosFinal)} sin resp. o con demora`,
                  usd: recResponder,
                  tooltip: `Parte de la mejora mensual realista que aporta atender a los leads sin respuesta el mismo día e incrementar la velocidad de respuesta. Proporción tomada del desglose de mejora.`,
                }}
              />
              <FilaEmbudoActual
                paso="3"
                etiqueta="Reuniones agendadas"
                sub="Logramos agendar"
                valor={reunionesEfectivas}
                max={maxEmbudo}
                tono="warning"
                perdida={{
                  label: `${fmtNum(sinAgendarEfectivo)} sin agendar (o por demora)`,
                  usd: recAgendar,
                  tooltip: `Parte de la mejora mensual realista que aporta agendar más reuniones (incluyendo evitar que los leads se enfríen por demora). Proporción tomada del desglose de mejora.`,
                }}
              />
              <FilaEmbudoActual
                paso="4"
                etiqueta="Asisten a la reunión"
                sub="Se presentan"
                valor={embudo.asistidas}
                max={maxEmbudo}
                tono="danger"
                perdida={{
                  label: `${fmtNum(noShowEfectivo)} no-shows`,
                  usd: recAsistir,
                  tooltip: `Parte de la mejora mensual realista que aporta reducir no-shows: hoy ${fmtNum(noShowEfectivo)} agendados no asisten. Proporción tomada del desglose de mejora del sistema.`,
                }}
              />
              <FilaEmbudoActual
                paso="5"
                etiqueta="Ventas cerradas"
                sub="Se convierte en cliente"
                valor={embudo.ventas}
                max={maxEmbudo}
                tono="danger"
                perdida={{
                  label: `${fmtNum(sinCerrar)} sin cerrar`,
                  usd: recCerrar,
                  tooltip: `Parte de la mejora mensual realista que aporta cerrar más ventas: hoy ${fmtNum(sinCerrar)} asistentes no compran. Proporción tomada del desglose de mejora del sistema.`,
                }}
              />
            </div>
            <div
              className="mt-3 bg-estratego-danger/10 border border-estratego-danger/30 rounded-lg px-3 py-2 flex items-center justify-between cursor-help"
              {...titleAttr(
                'Mejora mensual realista que el sistema proyecta recuperar (anual del ROI ÷ 12), repartida entre las 4 etapas según el desglose de mejora.'
              )}
            >
              <span className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">Total dinero que se escapa cada mes</span>
              <span className="text-lg font-bold text-estratego-danger">−{fmtUSD(fugaMensualEmbudo)}</span>
            </div>
          </SeccionNumerada>

          <SeccionNumerada
            numero="3"
            tono="success"
            titulo="Lo que puedes recuperar"
            descripcion="Corrigiendo cada fuga de tu embudo"
          >
            <div className="flex-1 flex flex-col justify-around divide-y divide-estratego-border/50">
              {recuperablesConAcum.map((r) => (
                <FilaRecuperable
                  key={r.titulo}
                  icono={r.icono}
                  titulo={r.titulo}
                  sub={r.sub}
                  valor={r.valor}
                  acumulado={r.acumulado}
                  max={maxRecuperable}
                />
              ))}
            </div>
            <div className="mt-3 bg-estratego-success/10 border border-estratego-success/30 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">Dinero recuperable cada mes</span>
              <span className="text-lg font-bold text-estratego-success">+{fmtUSD(totalRecuperable)}</span>
            </div>
          </SeccionNumerada>
        </div>

        {/* SECCIÓN 4: COMPARATIVA (full width) */}
        <SeccionNumerada
          numero="4"
          tono="gold"
          titulo="Comparativa: tu embudo hoy vs. optimizado"
        >
          <div className="grid gap-4 md:grid-cols-[1fr,1fr,auto] items-center">
            <div>
              <p className="text-center text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Tu embudo hoy</p>
              <div className="space-y-1">
                <FilaEmbudoCompacta pct={100} etiqueta="Leads que llegan" valor={embudo.leads} max={maxComparativo} tono="actual" />
                <FilaEmbudoCompacta pct={Math.round((contactadosEfectivos / Math.max(1, embudo.leads)) * 100)} etiqueta="Respondidos" valor={contactadosEfectivos} max={maxComparativo} tono="actual" />
                <FilaEmbudoCompacta pct={Math.round((reunionesEfectivas / Math.max(1, embudo.leads)) * 100)} etiqueta="Reuniones agendadas" valor={reunionesEfectivas} max={maxComparativo} tono="actual" />
                <FilaEmbudoCompacta pct={Math.round((embudo.asistidas / Math.max(1, embudo.leads)) * 100)} etiqueta="Asisten" valor={embudo.asistidas} max={maxComparativo} tono="actual" />
                <FilaEmbudoCompacta pct={Math.round((embudo.ventas / Math.max(1, embudo.leads)) * 100)} etiqueta="Ventas cerradas" valor={embudo.ventas} max={maxComparativo} tono="actual" />
              </div>
              <div className="mt-2 mx-auto w-fit bg-estratego-danger/10 border border-estratego-danger/30 rounded px-3 py-1 text-center">
                <span className="text-[10px] text-slate-400">Conversión final</span>
                <span className="ml-2 text-lg font-bold text-estratego-danger">{embudo.tasa_conversion_global_pct}%</span>
              </div>
            </div>

            <div>
              <p className="text-center text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2">Tu embudo optimizado</p>
              <div className="space-y-1">
                <FilaEmbudoCompacta pct={100} etiqueta="Leads que llegan" valor={opt.leads} max={maxComparativo} tono="optimizado" />
                <FilaEmbudoCompacta pct={Math.round((opt.contactados / Math.max(1, opt.leads)) * 100)} etiqueta="Respondidos" valor={opt.contactados} max={maxComparativo} tono="optimizado" />
                <FilaEmbudoCompacta pct={Math.round((opt.reuniones / Math.max(1, opt.leads)) * 100)} etiqueta="Reuniones agendadas" valor={opt.reuniones} max={maxComparativo} tono="optimizado" />
                <FilaEmbudoCompacta pct={Math.round((opt.asistidas / Math.max(1, opt.leads)) * 100)} etiqueta="Asisten" valor={opt.asistidas} max={maxComparativo} tono="optimizado" />
                <FilaEmbudoCompacta pct={Math.round((opt.ventas / Math.max(1, opt.leads)) * 100)} etiqueta="Ventas cerradas" valor={opt.ventas} max={maxComparativo} tono="optimizado" />
              </div>
              <div className="mt-2 mx-auto w-fit bg-estratego-success/10 border border-estratego-success/30 rounded px-3 py-1 text-center">
                <span className="text-[10px] text-slate-400">Conversión final</span>
                <span className="ml-2 text-lg font-bold text-estratego-success">
                  {Math.round((opt.ventas / Math.max(1, opt.leads)) * 100)}%
                </span>
              </div>
            </div>

            {/* {(factorMejora || factorAbs) && (
              <div className="text-center px-4">
                <p className="font-display text-5xl md:text-6xl font-bold text-estratego-gold leading-none">
                  {factorMejora ? `${factorMejora}X` : `+${factorAbs}`}
                </p>
                <p className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold mt-2">
                  {factorMejora ? 'Más ventas' : 'Ventas nuevas / mes'}
                </p>
                <p className="text-[10px] text-slate-500 max-w-[140px] mx-auto mt-1">
                  {factorMejora ? 'con el mismo número de leads' : 'con el mismo flujo de leads'}
                </p>
              </div>
            )} */}
          </div>
          {/* {factorMejora && (
            <p className="text-[11px] text-slate-400 mt-3 bg-estratego-ink/40 border border-estratego-border rounded-lg px-3 py-2 flex items-start gap-2">
              <Icono.Info className="w-3.5 h-3.5 text-estratego-gold shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-200">¿Por qué {factorMejora}X y no solo +{Math.max(0, Math.round((opt.ventas / Math.max(1, opt.leads)) * 100) - embudo.tasa_conversion_global_pct)}%?</strong>{' '}
                La conversión sube +{Math.max(0, Math.round((opt.ventas / Math.max(1, opt.leads)) * 100) - embudo.tasa_conversion_global_pct)} puntos en términos
                absolutos (de {embudo.tasa_conversion_global_pct}% a {Math.round((opt.ventas / Math.max(1, opt.leads)) * 100)}%).
                En términos relativos eso significa cerrar <strong className="text-estratego-gold">{factorMejora}×</strong> el
                número de ventas: {fmtNum(embudo.ventas)} → {fmtNum(opt.ventas)} con el mismo flujo de leads.
              </span>
            </p>
          )} */}
        </SeccionNumerada>

        {/* SECCIÓN 5: COSTO ACTUAL · COSTO DE OPORTUNIDAD · BENEFICIO ESPERADO */}
        <SeccionNumerada
          numero="5"
          tono="warning"
          titulo="El costo de no actuar"
          descripcion="Lo que ya pierdes hoy, lo que dejas de ganar y lo que recuperarías"
        >
          <div className="grid gap-4 md:grid-cols-3">
            {/* Costo actual */}
            <div className="bg-estratego-danger/5 border border-estratego-danger/25 rounded-xl p-4 flex flex-col">
              <p className="text-[11px] uppercase tracking-wider text-estratego-danger font-semibold flex items-center gap-1.5">
                <Icono.Equis className="w-4 h-4" /> Costo actual
              </p>
              <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                Inversión publicitaria que se va en leads que no cierran.
              </p>
              <p className="font-display text-3xl font-bold text-estratego-danger leading-none mt-3">
                {fmtUSD(costoActualMes)}<span className="text-sm text-slate-400 font-normal"> /mes</span>
              </p>
              <p className="text-sm text-estratego-danger/80 font-semibold mt-1">
                {fmtUSD(costoActualAnual)} <span className="text-slate-500 font-normal">/año</span>
              </p>
              <p
                className="text-[10px] text-slate-500 mt-3 border-t border-estratego-border pt-2 cursor-help"
                {...titleAttr(
                  `${fmtNum(leadsPerdidosMes)} leads que llegan y no cierran × ${fmtUSD(cpl)} de costo por lead.`
                )}
              >
                {fmtNum(leadsPerdidosMes)} leads/mes sin cerrar × {fmtUSD(cpl)} c/u
              </p>
            </div>

            {/* Costo de oportunidad */}
            <div className="bg-amber-500/5 border border-amber-500/25 rounded-xl p-4 flex flex-col">
              <p className="text-[11px] uppercase tracking-wider text-amber-400 font-semibold flex items-center gap-1.5">
                <Icono.Alerta className="w-4 h-4" /> Costo de oportunidad
              </p>
              <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                Ventas alcanzables que hoy dejas sobre la mesa por no actuar.
              </p>
              <p className="font-display text-3xl font-bold text-amber-400 leading-none mt-3">
                {fmtUSD(costoOportunidadMes)}<span className="text-sm text-slate-400 font-normal"> /mes</span>
              </p>
              <p className="text-sm text-amber-400/80 font-semibold mt-1">
                {fmtUSD(costoOportunidadAnual)} <span className="text-slate-500 font-normal">/año</span>
              </p>
              <p
                className="text-[10px] text-slate-500 mt-3 border-t border-estratego-border pt-2 cursor-help"
                {...titleAttr(
                  `${fmtNum(leadsPerdidosMes)} leads no cerrados × ${fmtUSD(ticket)} ticket × ${tasaAlcanzablePct}% de conversión alcanzable. Es el techo a régimen, no lo comprometido.`
                )}
              >
                {/* Sobre {fmtNum(leadsPerdidosMes)} leads no cerrados × {tasaAlcanzablePct}% conv. × ticket {fmtUSD(ticket)} */}
                A tu conversión alcanzable ({tasaAlcanzablePct}%) × ticket {fmtUSD(ticket)}
              </p>

            </div>

            {/* Beneficio esperado */}
            <div className="bg-estratego-success/5 border border-estratego-success/30 rounded-xl p-4 flex flex-col">
              <p className="text-[11px] uppercase tracking-wider text-estratego-success font-semibold flex items-center gap-1.5">
                <Icono.Check className="w-4 h-4" /> Beneficio esperado
              </p>
              <p className="text-[11px] text-slate-400 mt-1 leading-tight">
                Lo que proyectamos recuperar con la solución (prudente).
              </p>
              <p className="font-display text-3xl font-bold text-estratego-success leading-none mt-3">
                +{fmtUSD(beneficioMes)}<span className="text-sm text-slate-400 font-normal"> /mes</span>
              </p>
              <p className="text-sm text-estratego-success/80 font-semibold mt-1">
                {fmtUSD(beneficioAnual)} <span className="text-slate-500 font-normal">/año</span>
              </p>
              <p
                className="text-[10px] text-slate-500 mt-3 border-t border-estratego-border pt-2 cursor-help"
                {...titleAttr(
                  'Mejora comprometida con tope prudente.'
                )}
              >
                ≈ {fmtNum(ventasAdicionalesMes)} ventas más/mes
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-4 bg-estratego-ink/40 border border-estratego-border rounded-lg px-3 py-2 flex items-start gap-2">
            <Icono.Info className="w-3.5 h-3.5 text-estratego-gold shrink-0 mt-0.5" />
            <span>
              El <strong className="text-amber-400">costo de oportunidad</strong> es el techo
              alcanzable a tu tasa optimizada; el <strong className="text-estratego-success">beneficio
                esperado</strong> es lo que proyectamos recuperar con el plan optimizado.
              La diferencia entre ambos es tu margen de crecimiento al escalar.
            </span>
          </p>
        </SeccionNumerada>

        {/* SECCIONES 6 + 7 lado a lado */}
        <div className="grid gap-4 md:grid-cols-2">
          <SeccionNumerada numero="6" tono="gold" titulo="Proyección a 12 meses">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={proyeccionData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                <XAxis dataKey="mes" tick={AXIS_TICK} stroke={COLORS.grid} />
                <YAxis tickFormatter={(v) => `$${fmtNum(v)}`} tick={AXIS_TICK} stroke={COLORS.grid} />
                <Tooltip formatter={(v) => fmtUSD(v)} contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="actual" stroke="#94a3b8" strokeWidth={2} dot={{ r: 2 }} name="Ingresos actuales acumulados" />
                <Line type="monotone" dataKey="optimizado" stroke={COLORS.gold} strokeWidth={3} dot={{ r: 3 }} name="Ingresos optimizados acumulados" />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-2 bg-estratego-gold/10 border border-estratego-gold/30 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold">Diferencia acumulada en 12 meses</span>
              <span className="text-base font-bold text-estratego-gold">+{fmtUSD(opt.mejora_anual)}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 bg-estratego-ink/40 border border-estratego-border rounded-lg px-3 py-2 flex items-start gap-2">
              <Icono.Info className="w-3.5 h-3.5 text-estratego-gold shrink-0 mt-0.5" />
              <span>
                Cada línea acumula ingresos mes a mes. La línea dorada muestra el ingreso
                optimizado acumulado sumando la mejora de forma inmediata y constante
                mes a mes.
              </span>
            </p>
            {/* {penalizacionPct > 0 && (
              <p className="text-[11px] text-estratego-danger bg-estratego-danger/10 border border-estratego-danger/20 rounded-lg px-3 py-2 mt-2">
                Penalización por velocidad de respuesta ({tiempoRespMin} min):{' '}
                <strong>−{penalizacionPct}%</strong> sobre el potencial bruto.
              </p>
            )} */}
          </SeccionNumerada>

          <SeccionNumerada numero="7" tono="success" titulo="ROI del sistema">
            <div className="flex-1 flex flex-col justify-center gap-3">
              <div className="text-center">
                <p className="font-display text-5xl md:text-6xl font-bold leading-none text-estratego-success">
                  {fmtUSD(roi.mejora_anual)}
                </p>
                <p className="text-[11px] uppercase tracking-wider text-slate-400 mt-2">Ganancia adicional el primer año</p>
              </div>
              <div className="bg-estratego-success/10 border border-estratego-success/30 rounded-lg p-3 text-center max-w-md mx-auto w-full">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Ganancia 12 meses</p>
                <p className="font-display text-xl font-bold text-estratego-success">{fmtUSD(roi.mejora_anual)}</p>
              </div>
              {/* {feeMensualContinuidad != null && (
                <p className="text-[11px] text-center text-slate-300 bg-estratego-ink/50 border border-estratego-border rounded px-2 py-1.5 mt-2">
                  Continuidad operativa: <strong className="text-slate-100">{fmtUSD(feeMensualContinuidad)}/mes</strong> desde el mes 2
                  {permanenciaMeses ? ` · permanencia mínima ${permanenciaMeses} meses` : ''}.
                </p>
              )} */}
              {/* <p className="text-[11px] text-slate-400 bg-estratego-ink/40 border border-estratego-border rounded-lg px-3 py-2 flex items-start gap-2">
                <Icono.Info className="w-3.5 h-3.5 text-estratego-gold shrink-0 mt-0.5" />
                <span>
                  {feeMensualContinuidad != null && (
                    <>
                      La continuidad de {fmtUSD(feeMensualContinuidad)}/mes (desde el mes 2){' '}
                      {mejoraCubreFee ? (
                        <>la sostiene la propia mejora: el sistema proyecta cerca de{' '}
                          <strong className="text-estratego-success">{fmtUSD(mejoraMensualMadura)}/mes</strong>{' '}
                          de mejora ya maduro, por encima del fee de continuidad.</>
                      ) : (
                        <>se compara contra la mejora mensual proyectada (~{fmtUSD(mejoraMensualMadura)}/mes
                          ya maduro).</>
                      )}
                    </>
                  )}
                </span>
              </p> */}
            </div>
          </SeccionNumerada>
        </div>

        {/* SECCIÓN 8: QUÉ PASA DESPUÉS DE APROBAR */}
        <SeccionNumerada
          numero="8"
          tono="gold"
          titulo="Qué pasa después de aprobar"
          descripcion="Hay un plan claro — esto no es un salto al vacío"
        >
          <div className="grid gap-3 md:grid-cols-5">
            {[
              { num: 1, titulo: 'Aprobación', sub: 'Firmas la propuesta y se procesa el primer pago.', dia: 'Día 0' },
              { num: 2, titulo: 'Onboarding', sub: 'Sesión inicial: entregas accesos, reglas comerciales y materiales.', dia: 'Días 1-3' },
              { num: 3, titulo: 'Construcción', sub: 'Configuramos canales, agente IA, CRM, tablero y flujos.', dia: 'Semanas 1-3' },
              { num: 4, titulo: 'Aprobación del flujo', sub: 'Revisas, ajustas y aprobamos el flujo operativo inicial.', dia: 'Semana 3-4' },
              { num: 5, titulo: 'Puesta en operación', sub: 'El sistema entra en producción con QA semanal el primer mes.', dia: 'Semana 4+' },
            ].map((paso) => (
              <div
                key={paso.num}
                className="bg-estratego-ink/40 border border-estratego-border rounded-lg p-3 flex flex-col"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-estratego-gold text-estratego-ink font-display font-bold text-xs">
                    {paso.num}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
                    {paso.dia}
                  </span>
                </div>
                <p className="text-xs text-slate-100 font-semibold leading-tight">{paso.titulo}</p>
                <p className="text-[10px] text-slate-400 mt-1 leading-tight">{paso.sub}</p>
              </div>
            ))}
          </div>
        </SeccionNumerada>

        {/* SECCIÓN 9: GARANTÍA Y DIFERENCIAL */}
        <SeccionNumerada
          numero="9"
          tono="success"
          titulo="Garantía técnica y diferencial"
          descripcion="Lo que cubre Estratego y lo que nos hace distintos"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <div className="bg-estratego-success/5 border border-estratego-success/20 rounded-lg p-4">
              <p className="text-[11px] uppercase tracking-wider text-estratego-success font-semibold mb-2 flex items-center gap-1.5">
                <Icono.Check className="w-4 h-4" /> Garantía técnica de operación
              </p>
              <p className="text-xs text-slate-200 leading-relaxed">
                Si en las primeras <strong className="text-slate-100">4 semanas</strong> el flujo aprobado no
                ejecuta el estándar técnico pactado, corregimos sin costo adicional hasta dejarlo en el funcionamiento comprometido.
              </p>
              <p className="text-[10px] text-slate-500 mt-2 italic">
                Cubre funcionamiento técnico. No promete volumen ni cierres (dependen de oferta,
                reputación, precios y decisiones internas del negocio).
              </p>
            </div>
            <div className="bg-estratego-gold/5 border border-estratego-gold/20 rounded-lg p-4">
              <p className="text-[11px] uppercase tracking-wider text-estratego-gold font-semibold mb-2 flex items-center gap-1.5">
                <Icono.Logo className="w-4 h-4" /> Diferencial Estratego
              </p>
              <ul className="space-y-1.5 text-xs text-slate-200">
                <li className="flex items-start gap-1.5">
                  <span className="text-estratego-gold mt-0.5">•</span>
                  <span>Setup <strong>único</strong>, no licencia mensual: el sistema queda instalado en tu operación.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-estratego-gold mt-0.5">•</span>
                  <span>Tú conservas tus datos, contactos y conversaciones.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-estratego-gold mt-0.5">•</span>
                  <span>QA y monitoreo continuo incluido durante todo el programa.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-estratego-gold mt-0.5">•</span>
                  <span>Cero "caja negra": cada flujo, prompt y métrica es trazable y revisable.</span>
                </li>
              </ul>
            </div>
          </div>
        </SeccionNumerada>

        {/* SECCIÓN 10: DECISIÓN (full width) */}
        <SeccionNumerada numero="10" tono="slate" titulo="La decisión es tuya">
          <div className="grid gap-3 md:grid-cols-[1fr,auto,1fr]">
            <div className="bg-estratego-danger/10 border border-estratego-danger/30 rounded-xl p-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-estratego-danger/20 border border-estratego-danger/40 flex items-center justify-center text-estratego-danger">
                <Icono.Equis className="w-5 h-5" />
              </span>
              <div className="flex-1">
                <p className="text-xs text-slate-300 font-semibold">Seguir perdiendo</p>
                <p className="font-display text-2xl font-bold text-estratego-danger leading-tight">
                  {fmtUSD(fugaMensualEmbudo)}
                  <span className="text-xs text-slate-400 font-normal ml-1">/ mes</span>
                </p>
                <p className="text-xs text-slate-400">
                  {fmtUSD(fugaAnualEmbudo)} <span className="text-slate-500">/ año</span>
                </p>
              </div>
            </div>

            <div className="hidden md:flex items-center justify-center">
              <span className="w-10 h-10 rounded-full border border-estratego-border flex items-center justify-center text-slate-400 text-sm font-bold">VS</span>
            </div>

            <div className="bg-estratego-success/10 border border-estratego-success/30 rounded-xl p-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-estratego-success/20 border border-estratego-success/40 flex items-center justify-center text-estratego-success">
                <Icono.Check className="w-5 h-5" />
              </span>
              <div className="flex-1">
                <p className="text-xs text-slate-300 font-semibold">Recuperar</p>
                <p className="font-display text-2xl font-bold text-estratego-success leading-tight">
                  +{fmtUSD(totalRecuperable)}
                  <span className="text-xs text-slate-400 font-normal ml-1">/ mes</span>
                </p>
                <p className="text-xs text-slate-400">
                  {fmtUSD(fugaAnualEmbudo)} <span className="text-slate-500">/ año</span>
                </p>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-center text-slate-500 mt-3 italic">
            AnalyticsEstratego — Transformamos tu proceso comercial en resultados reales.
          </p>
        </SeccionNumerada>
      </div>
    </div>
  );
}
