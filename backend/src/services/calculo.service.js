// Motor de cálculo del diagnóstico comercial.
// Recibe los 4 bloques y devuelve el objeto `resultados` que se guarda en la BD
// y se usa para pintar las 4 gráficas del cliente.

// Modelo de inversión: pago único (sin mensualidad operativa en el ROI).
// El setup escala con el tamaño del cliente — un negocio que factura
// $5k/mes no paga lo mismo que uno que factura $200k/mes. La auto-
// selección de plan asegura coherencia entre el ROI del diagnóstico
// y la propuesta comercial que se genera después.
const PLANES_SETUP = {
  starter: 900,
  launch: 2500,
  scale: 5000,
  premium: 9000,
};
// Fee mensual operativo no se cuenta en el ROI (es continuidad, no inversión).
const FEE_MENSUAL_ESTRATEGO_USD = 0;

// Auto-selecciona plan según facturación mensual y volumen de leads.
function planRecomendado(ingresosMes, leadsMes) {
  if (ingresosMes >= 100000 || leadsMes >= 1500) return 'premium';
  if (ingresosMes >= 50000 || leadsMes >= 400) return 'scale';
  if (ingresosMes >= 15000 || leadsMes >= 100) return 'launch';
  return 'starter';
}

// Convierte el rango seleccionado de facturación mensual a valores numéricos.
// El punto medio se usa como estimación para calcular qué porcentaje del total
// aporta el embudo de captación nueva. Para "mayor_100k" asumimos 150k como
// estimación razonable (sin tope superior conocido).
const FACTURACION_RANGOS = {
  menor_15k: { min: 0, max: 15000, mid: 7500, label: 'Menos de $15,000' },
  '15k_30k': { min: 15000, max: 30000, mid: 22500, label: '$15,000 – $30,000' },
  '30k_60k': { min: 30000, max: 60000, mid: 45000, label: '$30,000 – $60,000' },
  '60k_100k': { min: 60000, max: 100000, mid: 80000, label: '$60,000 – $100,000' },
  mayor_100k: { min: 100000, max: null, mid: 150000, label: 'Más de $100,000' },
};

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

// Factores de respuesta por bucket de tiempo (en minutos). Vienen de la
// matriz prudente del spec — F_contact, F_booking, F_close miden la
// "salud" de la conversión actual dada la velocidad de respuesta.
// Baseline (=1.00) es responder entre 1 y 5 minutos.
function factoresRespuesta(min) {
  const m = Number(min);
  if (!Number.isFinite(m) || m <= 0)
    return { contact: 1.0, booking: 1.0, close: 1.0 };
  if (m <= 1) return { contact: 1.10, booking: 1.08, close: 1.04 };
  if (m <= 5) return { contact: 1.0, booking: 1.0, close: 1.0 };
  if (m <= 10) return { contact: 0.85, booking: 0.82, close: 0.92 };
  if (m <= 30) return { contact: 0.65, booking: 0.62, close: 0.80 };
  if (m <= 60) return { contact: 0.52, booking: 0.50, close: 0.75 };
  if (m <= 240) return { contact: 0.42, booking: 0.38, close: 0.68 };
  if (m <= 1440) return { contact: 0.32, booking: 0.28, close: 0.60 };
  return { contact: 0.20, booking: 0.18, close: 0.50 };
}

// Sensibilidad al tiempo por sector — multiplica el factor de mejora.
const SENSIBILIDAD_TIEMPO_SECTOR = {
  retail: 1.10,
  saas: 1.10,
  servicios_profesionales: 1.15,
  salud: 1.15,
  educacion: 1.10,
  ecommerce: 1.20,
  inmobiliaria: 1.25,
  restaurantes: 1.15,
  construccion: 1.15,
  manufactura: 1.10,
  otro: 1.10,
};

// Escenario MODERADO del spec — qué tanto se "realiza" la mejora teórica
// y los multiplicadores de las palancas secundarias (seguimiento, CRM,
// asistencia, cierre por calidad).
const ESCENARIO_MODERADO = {
  F_realizacion: 0.60,
  F_followup: 1.10,
  F_show: 1.07,
  F_crm: 1.08,
  F_close_quality: 1.03,
};

// Cap superior de la promesa Estratego: máximo 20% de mejora sobre
// ingresos actuales. Se aplica al final, después de todos los factores.
const CAP_MEJORA_TOTAL_PCT = 20;

function redondear(n, decimales = 2) {
  if (!Number.isFinite(n)) return 0;
  const factor = 10 ** decimales;
  return Math.round(n * factor) / factor;
}

// Asume mejores prácticas razonables para cada etapa del embudo.
// Nunca empeora el número actual; si ya está por encima del objetivo, lo deja igual.
function proyectarTasa(actual, objetivoMinimo, multiplicador, tope) {
  const mejorado = Math.min(tope, actual * multiplicador);
  return Math.max(actual, objetivoMinimo, mejorado);
}

export function calcularResultados(diagnostico) {
  const a = diagnostico.bloque_a || {};
  const b = diagnostico.bloque_b || {};
  const c = diagnostico.bloque_c || {};
  const d = diagnostico.bloque_d || {};

  const leadsSemana = num(a.leads_semana);
  const leadsMes = leadsSemana * 4;
  const ticket = num(a.ticket_promedio);
  const inversionPub = num(a.inversion_publicidad_mensual);

  const respMismoDia = num(b.leads_respondidos_mismo_dia); // 0..10
  const reunionesDe10 = num(b.reuniones_de_10_contactados);
  const asistenciaDe10 = num(b.asistencia_de_10);
  const cierresDe10 = num(b.cierres_de_10_reuniones);

  const costoPorLead = num(c.costo_por_lead);
  const ltv = num(c.ltv_cliente); //* TODO: renombrar
  const clientesActivos = num(c.clientes_activos);

  const ventasPerdidasConocidas = num(d.ventas_perdidas_conocidas);

  // Embudo actual (por mes)
  const contactados = leadsMes * (respMismoDia / 10);
  const reuniones = contactados * (reunionesDe10 / 10);
  const asistidas = reuniones * (asistenciaDe10 / 10);
  const ventas = asistidas * (cierresDe10 / 10);
  const ingresosMes = ventas * ticket;
  const tasaConversionGlobal = leadsMes > 0 ? ventas / leadsMes : 0;

  // Fuga: leads no atendidos el mismo día + ventas perdidas declaradas
  const leadsNoRespondidos = Math.max(0, leadsMes - contactados);
  const fugaPorNoResponder = leadsNoRespondidos * tasaConversionGlobal * ticket;
  const fugaDeclarada = ventasPerdidasConocidas * ticket;
  const fugaMensual = fugaPorNoResponder + fugaDeclarada;

  // Escenario optimizado bajo el spec moderado:
  //   improvement = 1 + ((target/current - 1) * sensitivity * realization)
  //   target = 1.00 (factor de respuesta óptima: bucket 1-5 min)
  const tiempoRespMin =
    num(b.tiempo_respuesta_valor) *
    (b.tiempo_respuesta_unidad === 'h' ? 60 : 1);
  const F = factoresRespuesta(tiempoRespMin);
  const TS = SENSIBILIDAD_TIEMPO_SECTOR[a.sector] || 1.10;
  const E = ESCENARIO_MODERADO;

  // Estratego promete llevar la respuesta al bucket "0-60 segundos",
  // donde no solo se elimina la penalización sino que se gana un bonus
  // sobre el baseline (F_contact 1.10, F_booking 1.08, F_close 1.04).
  // Esos son los TARGETS reales del sistema, no el baseline 1.00.
  const TARGET = { contact: 1.10, booking: 1.08, close: 1.04 };

  function mejoraTeorica(currentF, targetF) {
    if (!Number.isFinite(currentF) || currentF >= targetF) return 1;
    return 1 + ((targetF / currentF - 1) * TS * E.F_realizacion);
  }
  const mejoraResp = mejoraTeorica(F.contact, TARGET.contact);
  const mejoraBook = mejoraTeorica(F.booking, TARGET.booking);
  // close se podría modelar igual, pero el spec usa F_close_quality
  // como palanca independiente (1.03 moderado). Mantenemos esa palanca
  // separada para no doble-contar.

  // Tasas optimizadas (escala 0-10). Caps prudentes:
  //   respuesta máx 9.8/10 (98%), asistencia máx 9.5/10 (95%).
  const respOpt = Math.min(9.8, Math.max(respMismoDia, respMismoDia * mejoraResp));
  const reunionesOpt = Math.min(
    10,
    Math.max(
      reunionesDe10,
      reunionesDe10 * mejoraBook * E.F_followup * E.F_crm,
    ),
  );
  const asistenciaOpt = Math.min(
    9.5,
    Math.max(asistenciaDe10, asistenciaDe10 * E.F_show),
  );
  const cierresOpt = Math.min(
    10,
    Math.max(cierresDe10, cierresDe10 * E.F_close_quality),
  );

  const contactadosOpt = leadsMes * (respOpt / 10);
  const reunionesOptAbs = contactadosOpt * (reunionesOpt / 10);
  const asistidasOpt = reunionesOptAbs * (asistenciaOpt / 10);
  const ventasOptProyectado = asistidasOpt * (cierresOpt / 10);
  const ingresosMesOptBruto = ventasOptProyectado * ticket;
  const mejoraMesProyectada = Math.max(0, ingresosMesOptBruto - ingresosMes);

  // Cap por promesa Estratego: máx +30% sobre los ingresos actuales.
  const mejoraMesTope = ingresosMes * (CAP_MEJORA_TOTAL_PCT / 100);
  const mejoraMes = Math.min(mejoraMesProyectada, mejoraMesTope);
  const factorCap = mejoraMesProyectada > 0 ? mejoraMes / mejoraMesProyectada : 1;
  // Aplica el cap proporcionalmente a las ventas optimizadas para mantener
  // consistencia entre el embudo mostrado y los ingresos mostrados.
  const ventasOpt = ventas + (ventasOptProyectado - ventas) * factorCap;
  const ingresosMesOpt = ingresosMes + mejoraMes;
  // mejoraAnual TEÓRICA (delta sostenido × 12). La mejora REAL después de
  // aplicar ramp-up se calcula más abajo en `mejoraAnualReal`.
  const mejoraAnualTeorica = mejoraMes * 12;

  // Compatibilidad con UI existente: "penalización" = pérdida de potencial
  // por velocidad lenta, expresada como % perdido desde el baseline 1.0.
  const penalizacionPct = Math.round(Math.max(0, (1 - F.contact) * 100));
  // factorPen se conserva como alias para no romper consumidores que lo lean.
  const factorPen = factorCap;
  const mejoraMesBruta = mejoraMesProyectada;

  // Desglose de la mejora: aplicamos cada palanca una por una, en el orden
  // del embudo, para aislar cuánto aporta cada una al resultado final.
  // El orden es importante porque las mejoras se componen: responder más leads
  // aumenta la base sobre la que luego mejora la tasa de reuniones, etc.
  function ingresosEmbudo(resp, reu, asi, cie) {
    const ct = leadsMes * (resp / 10);
    const re = ct * (reu / 10);
    const as = re * (asi / 10);
    const ve = as * (cie / 10);
    return ve * ticket;
  }

  const ingBase = ingresosMes;
  const ingTrasResp = ingresosEmbudo(respOpt, reunionesDe10, asistenciaDe10, cierresDe10);
  const ingTrasReu = ingresosEmbudo(respOpt, reunionesOpt, asistenciaDe10, cierresDe10);
  const ingTrasAsi = ingresosEmbudo(respOpt, reunionesOpt, asistenciaOpt, cierresDe10);
  const ingTrasCie = ingresosEmbudo(respOpt, reunionesOpt, asistenciaOpt, cierresOpt);

  const deltaResp = Math.max(0, ingTrasResp - ingBase);
  const deltaReu = Math.max(0, ingTrasReu - ingTrasResp);
  const deltaAsi = Math.max(0, ingTrasAsi - ingTrasReu);
  const deltaCie = Math.max(0, ingTrasCie - ingTrasAsi);

  const desgloseMejora = [
    {
      concepto: 'Hoy ganas',
      descripcion: 'Punto de partida con tu embudo actual.',
      base: 0,
      valor: redondear(ingBase),
      total: redondear(ingBase),
      tipo: 'actual',
    },
    {
      concepto: 'Responder a tiempo',
      descripcion: `Pasar de ${redondear(respMismoDia, 1)} a ${redondear(respOpt, 1)} de cada 10 interesados atendidos el mismo día.`,
      base: redondear(ingBase),
      valor: redondear(deltaResp),
      total: redondear(ingBase + deltaResp),
      tipo: 'mejora',
      palanca: 'Atención en minutos, guiones de primera respuesta, turnos claros.',
    },
    {
      concepto: 'Agendar más reuniones',
      descripcion: `Pasar de ${redondear(reunionesDe10, 1)} a ${redondear(reunionesOpt, 1)} reuniones por cada 10 contactados.`,
      base: redondear(ingBase + deltaResp),
      valor: redondear(deltaReu),
      total: redondear(ingBase + deltaResp + deltaReu),
      tipo: 'mejora',
      palanca: 'Calificación del interesado, scripts de invitación, propuesta de valor clara.',
    },
    {
      concepto: 'Lograr que asistan',
      descripcion: `Pasar de ${redondear(asistenciaDe10, 1)} a ${redondear(asistenciaOpt, 1)} asistencias de cada 10 reuniones agendadas.`,
      base: redondear(ingBase + deltaResp + deltaReu),
      valor: redondear(deltaAsi),
      total: redondear(ingBase + deltaResp + deltaReu + deltaAsi),
      tipo: 'mejora',
      palanca: 'Recordatorios automáticos, confirmación previa, reducción de fricción para conectarse.',
    },
    {
      concepto: 'Cerrar más ventas',
      descripcion: `Pasar de ${redondear(cierresDe10, 1)} a ${redondear(cierresOpt, 1)} cierres por cada 10 reuniones.`,
      base: redondear(ingBase + deltaResp + deltaReu + deltaAsi),
      valor: redondear(deltaCie),
      total: redondear(ingTrasCie),
      tipo: 'mejora',
      palanca: 'Manejo de objeciones, casos de éxito, propuestas con cierre dirigido.',
    },
    {
      concepto: 'Lo que podrías ganar',
      descripcion: 'Ingresos mensuales aplicando todas las mejoras.',
      base: 0,
      valor: redondear(ingTrasCie),
      total: redondear(ingTrasCie),
      tipo: 'potencial',
    },
  ];

  // Curva realista de adopción del sistema. El mes 1 es onboarding puro
  // (configuración, capacitación, integración) → mejora = 0%. A partir
  // del mes 2 el sistema empieza a generar valor y alcanza el 100% del
  // delta proyectado alrededor del mes 6.
  //
  //   Mes 1 → 0%     (onboarding)
  //   Mes 2 → 15%
  //   Mes 3 → 40%
  //   Mes 4 → 70%
  //   Mes 5 → 90%
  //   Mes 6+ → 100%  (sostenido)
  const CURVA_ADOPCION = [0.00, 0.15, 0.40, 0.70, 0.90, 1.00];
  function factorAdopcion(mesIndex /* 0-indexed */) {
    if (mesIndex < CURVA_ADOPCION.length) return CURVA_ADOPCION[mesIndex];
    return 1.0;
  }

  // Auto-seleccionar plan según tamaño del cliente. El setup usado para
  // el ROI = el setup del plan recomendado, así el diagnóstico cuadra
  // con la propuesta comercial que se generará después.
  const planRec = planRecomendado(
    ingresosMes,
    Number.isFinite(ingresosMes) ? leadsMes : 0,
  );
  const inversionTotal = PLANES_SETUP[planRec] || PLANES_SETUP.launch;
  const inversionAnual = inversionTotal; // alias para compatibilidad
  let mejoraAnualReal = 0;
  let mesesRecuperacion = null;
  const mejoraMes1 = mejoraMes * factorAdopcion(0); // siempre 0 con curva nueva
  {
    let acumMejora = 0;
    for (let i = 0; i < 12; i++) {
      const mejoraEsteMes = mejoraMes * factorAdopcion(i);
      const prevAcum = acumMejora;
      acumMejora += mejoraEsteMes;
      if (mesesRecuperacion == null && acumMejora >= inversionTotal) {
        const falta = inversionTotal - prevAcum;
        const frac = mejoraEsteMes > 0
          ? Math.max(0, Math.min(1, falta / mejoraEsteMes))
          : 0;
        mesesRecuperacion = i + frac;
      }
    }
    mejoraAnualReal = acumMejora;
  }
  const mejoraAnualUsado = mejoraAnualReal;
  const roi =
    inversionTotal > 0 ? (mejoraAnualUsado - inversionTotal) / inversionTotal : 0;
  // Mes 1 con la curva realista siempre es 0% → nunca se recupera el mes 1.
  const recuperaMes1 = mejoraMes1 >= inversionTotal;

  // Contexto de facturación: el embudo solo mide NUEVAS ventas captadas.
  // Lo comparamos contra la facturación total declarada para que el cliente
  // entienda qué porción de su negocio depende de la captación nueva.
  // Prioridad: valor numérico ingresado por el vendedor; fallback al rango
  // antiguo (mid) para diagnósticos creados antes de cambiar el campo.
  const facturacionUsd = num(a.facturacion_mensual_usd, 0);
  const rangoLegacy = FACTURACION_RANGOS[a.facturacion_mensual_rango];
  let totalEstimado = 0;
  let rangoLabel = null;
  let rangoCodigo = null;
  if (facturacionUsd > 0) {
    totalEstimado = facturacionUsd;
    rangoLabel = `${redondear(facturacionUsd)} USD/mes (declarado)`;
  } else if (rangoLegacy) {
    totalEstimado = rangoLegacy.mid;
    rangoLabel = rangoLegacy.label;
    rangoCodigo = a.facturacion_mensual_rango;
  }
  let contextoFacturacion = null;
  if (totalEstimado > 0) {
    const restoHoy = Math.max(0, totalEstimado - ingresosMes);
    const restoOpt = Math.max(0, totalEstimado - ingresosMesOpt);
    const aporteHoyPct = totalEstimado > 0 ? (ingresosMes / totalEstimado) * 100 : 0;
    const aporteOptPct = totalEstimado > 0 ? (ingresosMesOpt / totalEstimado) * 100 : 0;
    contextoFacturacion = {
      rango_codigo: rangoCodigo,
      rango_label: rangoLabel,
      rango_min: rangoLegacy?.min ?? null,
      rango_max: rangoLegacy?.max ?? null,
      total_estimado: redondear(totalEstimado),
      nuevas_ventas_hoy: redondear(ingresosMes),
      resto_estimado_hoy: redondear(restoHoy),
      aporte_embudo_pct_hoy: redondear(aporteHoyPct, 1),
      nuevas_ventas_potencial: redondear(ingresosMesOpt),
      resto_estimado_potencial: redondear(restoOpt),
      aporte_embudo_pct_potencial: redondear(aporteOptPct, 1),
    };
  }

  // Proyección a 12 meses: línea plana (sin plan) vs ramp-up suave (con plan)
  // La mejora se alcanza gradualmente en ~6 meses usando ease-out cuadrático,
  // así el cliente ve una curva realista en vez de un salto instantáneo.
  const RAMP_UP_MESES = 6;
  const inicio = new Date();
  const proyeccion = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(inicio.getFullYear(), inicio.getMonth() + i + 1, 1);
    const etiqueta = d
      .toLocaleDateString('es-CO', { month: 'short' })
      .replace('.', '')
      .replace(/^\w/, (l) => l.toUpperCase());
    // Misma curva realista usada en el cálculo de ROI: mes 1 onboarding (0%).
    const factor = factorAdopcion(i);
    const conPlan = ingresosMes + (ingresosMesOpt - ingresosMes) * factor;
    proyeccion.push({
      mes: i + 1,
      etiqueta,
      actual: redondear(ingresosMes),
      con_plan: redondear(conPlan),
      oportunidad: redondear(conPlan - ingresosMes),
    });
  }

  return {
    version: 1,
    calculado_en: new Date().toISOString(),
    entradas: {
      leads_mes: redondear(leadsMes, 0),
      ticket_promedio: redondear(ticket),
      inversion_publicidad_mensual: redondear(inversionPub),
      costo_por_lead: redondear(costoPorLead),
      ltv_cliente: redondear(ltv),
      clientes_activos: redondear(clientesActivos, 0),
    },
    embudo_actual: {
      leads: redondear(leadsMes, 0),
      contactados: redondear(contactados, 0),
      reuniones: redondear(reuniones, 0),
      asistidas: redondear(asistidas, 0),
      ventas: redondear(ventas, 0),
      ingresos_mes: redondear(ingresosMes),
      tasa_conversion_global_pct: redondear(tasaConversionGlobal * 100),
    },
    fuga_capital: {
      leads_no_respondidos_mes: redondear(leadsNoRespondidos, 0),
      fuga_por_no_responder_mes: redondear(fugaPorNoResponder),
      fuga_declarada_mes: redondear(fugaDeclarada),
      fuga_mensual: redondear(fugaMensual),
      fuga_anual: redondear(fugaMensual * 12),
    },
    escenario_optimizado: {
      leads: redondear(leadsMes, 0),
      contactados: redondear(contactadosOpt, 0),
      reuniones: redondear(reunionesOptAbs, 0),
      asistidas: redondear(asistidasOpt, 0),
      ventas: redondear(ventasOpt, 0),
      ingresos_mes: redondear(ingresosMesOpt),
      ingresos_mes_sin_penalizacion: redondear(ingresosMesOptBruto),
      mejora_mes: redondear(mejoraMes),
      mejora_mes_sin_penalizacion: redondear(mejoraMesBruta),
      mejora_anual: redondear(mejoraAnualUsado),
      mejora_anual_teorica: redondear(mejoraAnualTeorica),
      mejora_pct_sobre_actual: redondear(
        ingresosMes > 0 ? (mejoraMes / ingresosMes) * 100 : 0,
        1,
      ),
      cap_mejora_aplicado: factorCap < 0.999,
      penalizacion_tiempo_respuesta_pct: penalizacionPct,
      tiempo_respuesta_min: redondear(tiempoRespMin, 0),
      tiempo_respuesta_objetivo_seg: 60,
      bonus_velocidad_pct: 10,
      escenario: 'moderado',
      tasas_objetivo: {
        resp_mismo_dia_de_10: redondear(respOpt, 1),
        reuniones_de_10: redondear(reunionesOpt, 1),
        asistencia_de_10: redondear(asistenciaOpt, 1),
        cierres_de_10: redondear(cierresOpt, 1),
      },
    },
    roi: {
      fee_mensual_estratego: FEE_MENSUAL_ESTRATEGO_USD,
      plan_recomendado: planRec,
      setup_inicial: inversionTotal,
      inversion_total: inversionTotal,
      inversion_anual: inversionAnual,
      mejora_mensual: redondear(mejoraMes),
      mejora_mes_1_con_rampup: redondear(mejoraMes1),
      recupera_mes_1: recuperaMes1,
      mejora_anual: redondear(mejoraAnualUsado),
      mejora_anual_teorica: redondear(mejoraAnualTeorica),
      roi_porcentaje: redondear(roi * 100),
      meses_recuperacion: mesesRecuperacion ? redondear(mesesRecuperacion, 1) : null,
    },
    proyeccion_12m: proyeccion,
    desglose_mejora: desgloseMejora,
    contexto_facturacion: contextoFacturacion,
  };
}
