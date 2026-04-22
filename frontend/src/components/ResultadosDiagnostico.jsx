import { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  BarChart,
  Bar,
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
  axis: '#64748b',
  grid: '#2a2a3f',
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

function sanitizarNombreArchivo(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() || 'diagnostico';
}

function Card({ titulo, descripcion, children }) {
  return (
    <section className="card">
      <header className="mb-4">
        <h3 className="font-display text-lg font-semibold text-slate-100">
          {titulo}
        </h3>
        {descripcion && (
          <p className="text-sm text-slate-400 mt-1">{descripcion}</p>
        )}
      </header>
      {children}
    </section>
  );
}

function KPI({ label, valor, tono = 'gold' }) {
  const tonos = {
    gold: 'text-estratego-gold',
    success: 'text-estratego-success',
    danger: 'text-estratego-danger',
  };
  return (
    <div className="card p-4">
      <p className="text-[10px] uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p
        className={`font-display text-2xl font-semibold mt-1 ${tonos[tono] || tonos.gold}`}
      >
        {valor}
      </p>
    </div>
  );
}

export default function ResultadosDiagnostico({
  resultados,
  diagnosticoId,
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

  const embudoData = [
    { etapa: 'Leads', valor: embudo.leads },
    { etapa: 'Contactados', valor: embudo.contactados },
    { etapa: 'Reuniones', valor: embudo.reuniones },
    { etapa: 'Asistidas', valor: embudo.asistidas },
    { etapa: 'Ventas', valor: embudo.ventas },
  ];

  const comparativoData = [
    { etapa: 'Leads', actual: embudo.leads, optimizado: opt.leads },
    { etapa: 'Contactados', actual: embudo.contactados, optimizado: opt.contactados },
    { etapa: 'Reuniones', actual: embudo.reuniones, optimizado: opt.reuniones },
    { etapa: 'Asistidas', actual: embudo.asistidas, optimizado: opt.asistidas },
    { etapa: 'Ventas', actual: embudo.ventas, optimizado: opt.ventas },
  ];

  const fugaData = [
    { concepto: 'Leads no respondidos', valor: fuga.fuga_por_no_responder_mes },
    { concepto: 'Ventas perdidas declaradas', valor: fuga.fuga_declarada_mes },
  ];

  async function descargarPDF() {
    const nodo = reporteRef.current;
    if (!nodo) return;
    setExportando(true);
    try {
      const canvas = await html2canvas(nodo, {
        scale: 2,
        backgroundColor: '#08080f',
        useCORS: true,
        logging: false,
        windowWidth: nodo.scrollWidth,
      });

      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: pdfHeight >= pdfWidth ? 'p' : 'l',
        unit: 'mm',
        format: [pdfWidth, pdfHeight],
      });

      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      const slug = sanitizarNombreArchivo(cliente?.nombre);
      const nombre = diagnosticoId
        ? `diagnostico_${diagnosticoId}_${slug}.pdf`
        : `diagnostico_${slug}.pdf`;
      pdf.save(nombre);
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
        <button
          type="button"
          onClick={descargarPDF}
          disabled={exportando}
          className="btn-gold"
        >
          {exportando ? 'Generando PDF…' : 'Descargar PDF'}
        </button>
      </div>

      <div
        ref={reporteRef}
        className="space-y-6 p-4 rounded-2xl"
        style={{ backgroundColor: '#08080f' }}
      >
        <section className="card">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-estratego-gold">
                AnalyticsEstratego
              </p>
              <h2 className="font-display text-2xl font-semibold text-slate-100 mt-1">
                Diagnóstico comercial
                {diagnosticoId ? ` #${diagnosticoId}` : ''}
              </h2>
              {cliente?.nombre && (
                <p className="text-sm text-slate-300 mt-2">
                  <span className="text-slate-400">Cliente:</span>{' '}
                  <span className="font-medium">{cliente.nombre}</span>
                  {cliente.empresa ? ` — ${cliente.empresa}` : ''}
                </p>
              )}
              {cliente?.email && (
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {cliente.email}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                Fecha
              </p>
              <p className="text-sm text-slate-200 mt-1">{fechaTxt}</p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-4">
          <KPI label="Ingresos actuales / mes" valor={fmtUSD(embudo.ingresos_mes)} />
          <KPI
            label="Potencial mensual"
            valor={fmtUSD(opt.ingresos_mes)}
            tono="success"
          />
          <KPI label="Fuga anual" valor={fmtUSD(fuga.fuga_anual)} tono="danger" />
          <KPI
            label="ROI anual Estratego"
            valor={`${roi.roi_porcentaje}%`}
            tono={roi.roi_porcentaje >= 0 ? 'success' : 'danger'}
          />
        </div>

        <Card
          titulo="Embudo de conversión (mensual)"
          descripcion={`Tasa global actual: ${embudo.tasa_conversion_global_pct}% · De ${fmtNum(embudo.leads)} leads se cierran ${fmtNum(embudo.ventas)} ventas.`}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={embudoData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 40, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
              <XAxis
                type="number"
                tickFormatter={fmtNum}
                tick={AXIS_TICK}
                stroke={COLORS.grid}
              />
              <YAxis
                type="category"
                dataKey="etapa"
                width={90}
                tick={AXIS_TICK}
                stroke={COLORS.grid}
              />
              <Tooltip
                formatter={(v) => fmtNum(v)}
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: 'rgba(233,193,88,0.08)' }}
              />
              <Bar
                dataKey="valor"
                fill={COLORS.gold}
                radius={[0, 6, 6, 0]}
                name="Volumen"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card
          titulo="Fuga de capital mensual"
          descripcion={`Total mes: ${fmtUSD(fuga.fuga_mensual)} · Total año: ${fmtUSD(fuga.fuga_anual)}. ${fmtNum(fuga.leads_no_respondidos_mes)} leads no se responden el mismo día.`}
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={fugaData}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
              <XAxis dataKey="concepto" tick={AXIS_TICK} stroke={COLORS.grid} />
              <YAxis
                tickFormatter={(v) => `$${fmtNum(v)}`}
                tick={AXIS_TICK}
                stroke={COLORS.grid}
              />
              <Tooltip
                formatter={(v) => fmtUSD(v)}
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: 'rgba(248,113,113,0.08)' }}
              />
              <Bar
                dataKey="valor"
                fill={COLORS.danger}
                radius={[6, 6, 0, 0]}
                name="USD / mes"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card
          titulo="Escenario actual vs optimizado"
          descripcion={`Mejora mensual proyectada: ${fmtUSD(opt.mejora_mes)} · Mejora anual: ${fmtUSD(opt.mejora_anual)}`}
        >
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={comparativoData}>
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
              <XAxis dataKey="etapa" tick={AXIS_TICK} stroke={COLORS.grid} />
              <YAxis tickFormatter={fmtNum} tick={AXIS_TICK} stroke={COLORS.grid} />
              <Tooltip
                formatter={(v) => fmtNum(v)}
                contentStyle={TOOLTIP_STYLE}
                cursor={{ fill: 'rgba(233,193,88,0.08)' }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#cbd5e1' }} />
              <Bar
                dataKey="actual"
                fill="#475569"
                radius={[4, 4, 0, 0]}
                name="Actual"
              />
              <Bar
                dataKey="optimizado"
                fill={COLORS.gold}
                radius={[4, 4, 0, 0]}
                name="Optimizado"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card titulo="Retorno de inversión con Estratego">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-white/5 border border-estratego-border rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                Inversión anual Estratego
              </p>
              <p className="font-display text-xl font-semibold mt-1 text-slate-100">
                {fmtUSD(roi.inversion_anual)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Basado en fee mensual de {fmtUSD(roi.fee_mensual_estratego)}
              </p>
            </div>
            <div className="bg-estratego-success/10 border border-estratego-success/20 rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                Mejora anual proyectada
              </p>
              <p className="font-display text-xl font-semibold text-estratego-success mt-1">
                {fmtUSD(roi.mejora_anual)}
              </p>
            </div>
            <div
              className={`rounded-xl p-4 border ${roi.roi_porcentaje >= 0 ? 'bg-estratego-gold/10 border-estratego-gold/30' : 'bg-estratego-danger/10 border-estratego-danger/30'}`}
            >
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                ROI anual
              </p>
              <p
                className={`font-display text-2xl font-semibold mt-1 ${roi.roi_porcentaje >= 0 ? 'text-estratego-gold' : 'text-estratego-danger'}`}
              >
                {roi.roi_porcentaje}%
              </p>
              {roi.meses_recuperacion != null && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Recuperación en ~{roi.meses_recuperacion} mes
                  {roi.meses_recuperacion === 1 ? '' : 'es'}
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
