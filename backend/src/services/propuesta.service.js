import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import OpenAI from 'openai';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESOURCES_DIR = path.resolve(__dirname, '../../resources/propuesta');

const PLANES = ['starter', 'launch', 'scale', 'premium'];
const PRECIOS = {
  starter: { primer_pago: 900, mensual: 600, permanencia: 6 },
  launch: { primer_pago: 2500, mensual: 900, permanencia: 3 },
  scale: { primer_pago: 5000, mensual: 1000, permanencia: 3 },
  premium: { primer_pago: 9000, mensual: 1500, permanencia: 6 },
};

let plantillasCache = null;

async function cargarPlantillas() {
  if (plantillasCache) return plantillasCache;
  const entries = await Promise.all(
    PLANES.map(async (plan) => {
      const file = path.join(
        RESOURCES_DIR,
        `propuesta_vendedora_${plan}_estratego.txt`,
      );
      const contenido = await fs.readFile(file, 'utf8');
      return [plan, contenido];
    }),
  );
  plantillasCache = Object.fromEntries(entries);
  return plantillasCache;
}

let openaiCliente = null;
function getOpenAI() {
  if (openaiCliente) return openaiCliente;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY no configurada');
  openaiCliente = new OpenAI({ apiKey });
  return openaiCliente;
}

function fmtUSD(n) {
  if (!Number.isFinite(+n)) return '$0';
  return `$${Math.round(+n).toLocaleString('en-US')}`;
}

function resumirDiagnostico({ diagnostico, resultados, cliente, vendedor }) {
  const a = diagnostico.bloque_a || {};
  const b = diagnostico.bloque_b || {};
  const c = diagnostico.bloque_c || {};
  const d = diagnostico.bloque_d || {};
  const embudo = resultados.embudo_actual || {};
  const opt = resultados.escenario_optimizado || {};
  const fuga = resultados.fuga_capital || {};
  const roi = resultados.roi || {};
  const ctx = resultados.contexto_facturacion || null;
  const planRec = roi.plan_recomendado || null;
  const setupRec = roi.setup_inicial || roi.inversion_total || null;

  const tiempoRespMin = opt.tiempo_respuesta_min || 0;
  const tiempoRespStr =
    tiempoRespMin >= 60
      ? `${Math.round(tiempoRespMin / 60)} h`
      : `${tiempoRespMin} min`;

  return `
DATOS DEL CLIENTE
- Nombre: ${cliente.nombre}
- Empresa: ${cliente.empresa || '(no informada)'}
- Email: ${cliente.email}
- Industria/Sector: ${a.sector || '(no informado)'}${a.sector === 'otro' && a.sector_otro ? ` (${a.sector_otro})` : ''}

CONTEXTO DEL NEGOCIO
- Facturación mensual declarada: ${ctx?.total_estimado ? fmtUSD(ctx.total_estimado) : '(no informada)'}
- Leads por semana: ${a.leads_semana}
- Canales de captación: ${(a.canales_leads || []).join(', ') || '(ninguno)'}
- Equipo de ventas: ${a.equipo_ventas || 0} personas
- Ticket promedio: ${fmtUSD(a.ticket_promedio)}
- Inversión publicitaria mensual: ${fmtUSD(a.inversion_publicidad_mensual)}

EMBUDO COMERCIAL ACTUAL (mensual)
- Leads recibidos: ${embudo.leads}
- Contactados (responden mismo día): ${embudo.contactados}
- Reuniones agendadas: ${embudo.reuniones}
- Asistencias: ${embudo.asistidas}
- Ventas cerradas: ${embudo.ventas}
- Conversión global: ${embudo.tasa_conversion_global_pct}%
- Ingresos mensuales actuales: ${fmtUSD(embudo.ingresos_mes)}

OPERACIÓN COMERCIAL
- Tiempo medio de primera respuesta: ${tiempoRespStr} (penaliza ${opt.penalizacion_tiempo_respuesta_pct || 0}% del potencial)
- CRM: ${b.crm_actualizacion}
- ¿Tiene proceso de seguimiento? ${b.tiene_seguimiento ? `Sí — ${b.seguimiento_descripcion}` : 'No'}

ECONOMÍA POR CLIENTE
- Costo por lead: ${fmtUSD(c.costo_por_lead)}
- Clientes activos: ${c.clientes_activos}
- LTV: ${fmtUSD(c.ltv_cliente)}

CAPACIDAD Y FUGAS
- Horas semanales en seguimiento: ${d.horas_semanales_seguimiento}
- Horario de atención: ${d.tiene_horario_atencion ? d.horario_atencion : 'Sin horario definido'}
- Qué pasa con leads fuera de horario: ${d.leads_fuera_horario || '(no informado)'}
- Ventas perdidas conocidas: ${d.ventas_perdidas_conocidas}

FUGA Y POTENCIAL CALCULADO
- Fuga mensual estimada: ${fmtUSD(fuga.fuga_mensual)}
- Fuga anual: ${fmtUSD(fuga.fuga_anual)}
- Ingresos potenciales optimizados: ${fmtUSD(opt.ingresos_mes)}/mes
- Mejora mensual proyectada: ${fmtUSD(opt.mejora_mes)}
- Mejora anual proyectada: ${fmtUSD(opt.mejora_anual)}
- ROI anual estimado contra fee Estratego: ${roi.roi_porcentaje}%

RECOMENDACIÓN AUTOMÁTICA DEL SISTEMA
- Plan recomendado por el motor según tamaño del cliente: ${planRec ? planRec.toUpperCase() : '(no disponible)'}
- Setup correspondiente: ${setupRec ? fmtUSD(setupRec) : '(no disponible)'}
- Esta recomendación se basa en facturación + volumen de leads. RESPÉTALA salvo que las notas del vendedor explícitamente indiquen otro plan.

VENDEDOR
- ${vendedor?.nombre || 'Asesor Estratego'}
`.trim();
}

function buildSystemPrompt(plantillas) {
  return `Eres el equipo de propuestas comerciales de Estratego (estratego.us).
Tu tarea es entregar una propuesta comercial PERSONALIZADA para un cliente, escogiendo UNO de los 4 planes disponibles según el contexto del negocio y el acuerdo conversado entre el vendedor y el cliente.

Tienes 4 plantillas base (STARTER, LAUNCH, SCALE, PREMIUM). Debes:
1. Analizar los datos del diagnóstico (volumen, sector, fuga, equipo, canales, ticket).
2. Analizar la propuesta acordada que escribió el vendedor.
3. ESCOGER EL PLAN: USA EL PLAN RECOMENDADO POR EL MOTOR (campo "Plan recomendado por el motor" en los datos). El ROI mostrado al cliente ya fue calculado con ese plan; si eliges otro plan rompes la coherencia entre el diagnóstico y la propuesta.
4. RELLENAR todos los placeholders del template ([NOMBRE DEL CLIENTE], [NOMBRE DE LA EMPRESA], [CANAL PRINCIPAL], [CANAL 1], [CANAL 2], [CANAL 3], [FECHA], [48 HORAS / 7 DÍAS]).
5. Personalizar el resumen ejecutivo y el "costo de seguir igual" con datos concretos del diagnóstico (números reales de fuga, conversión, canales que usa, sector).
6. Conservar el formato exacto del template: encabezados con líneas de ===, secciones numeradas, lista de inclusiones, inversión, etc.
7. La fecha debe ser la fecha actual en formato "DD de MES de AAAA".
8. La vigencia siempre "7 días".
9. NO inventar precios distintos a los del plan elegido. NO mover los montos.
10. NO añadir secciones que no estén en el template. NO quitar secciones.

PRIORIDAD DE SELECCIÓN DEL PLAN (en este orden):
A. Si el vendedor menciona explícitamente un plan distinto en sus notas → respétalo y explica por qué.
B. En cualquier otro caso → usa el plan recomendado por el motor.
C. NUNCA elijas un plan más caro que el recomendado solo porque "vende más" — eso rompe el ROI mostrado al cliente.

Tabla de referencia de planes (no para decidir, solo para conocer cifras):
- STARTER (USD 900 + 600/mes): negocios pequeños, < 100 leads/mes, sin CRM.
- LAUNCH (USD 2,500 + 900/mes): flujo establecido, 100-500 leads/mes.
- SCALE (USD 5,000 + 1,000/mes): operación con volumen, 500-1,500 leads/mes.
- PREMIUM (USD 9,000 + 1,500/mes): operación compleja, > 1,500 leads/mes.

DEBES responder con un objeto JSON con esta forma EXACTA:
{
  "plan": "starter" | "launch" | "scale" | "premium",
  "razon_eleccion": "breve párrafo (2-3 líneas) explicando por qué este plan encaja",
  "propuesta_texto": "el texto completo de la propuesta con TODOS los placeholders ya rellenos, manteniendo el formato del template"
}

=== PLANTILLAS DISPONIBLES ===

--- PLANTILLA STARTER ---
${plantillas.starter}

--- PLANTILLA LAUNCH ---
${plantillas.launch}

--- PLANTILLA SCALE ---
${plantillas.scale}

--- PLANTILLA PREMIUM ---
${plantillas.premium}
`;
}

// Recibe el diagnóstico completo y devuelve { plan, propuesta_texto, razon_eleccion }
export async function generarPropuesta({
  diagnostico,
  resultados,
  cliente,
  vendedor,
  propuestaAcordada,
}) {
  const plantillas = await cargarPlantillas();
  const resumen = resumirDiagnostico({
    diagnostico,
    resultados,
    cliente,
    vendedor,
  });
  const fecha = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const userPrompt = `Fecha de hoy: ${fecha}

${resumen}

PROPUESTA ACORDADA CON EL CLIENTE (notas del vendedor):
${propuestaAcordada || '(El vendedor no escribió notas adicionales — usa los datos del diagnóstico para decidir)'}

Genera la propuesta comercial completa siguiendo todas las reglas. Responde con el JSON pedido.`;

  const openai = getOpenAI();
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const respuesta = await openai.chat.completions.create({
    model,
    response_format: { type: 'json_object' },
    temperature: 0.4,
    messages: [
      { role: 'system', content: buildSystemPrompt(plantillas) },
      { role: 'user', content: userPrompt },
    ],
  });

  const contenido = respuesta.choices?.[0]?.message?.content;
  if (!contenido) throw new Error('OpenAI no devolvió contenido');

  let parsed;
  try {
    parsed = JSON.parse(contenido);
  } catch {
    throw new Error('La respuesta de OpenAI no es JSON válido');
  }

  const plan = String(parsed.plan || '').toLowerCase();
  if (!PLANES.includes(plan)) {
    throw new Error(`Plan inválido en respuesta: ${parsed.plan}`);
  }
  if (!parsed.propuesta_texto || typeof parsed.propuesta_texto !== 'string') {
    throw new Error('Respuesta de OpenAI sin propuesta_texto');
  }

  return {
    plan,
    razon_eleccion: parsed.razon_eleccion || '',
    propuesta_texto: parsed.propuesta_texto.trim(),
    precios: PRECIOS[plan],
  };
}
