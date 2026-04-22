// Motor de cálculo del diagnóstico comercial.
// Recibe los 4 bloques y devuelve el objeto `resultados` que se guarda en la BD
// y se usa para pintar las 4 gráficas del cliente.

const FEE_MENSUAL_ESTRATEGO_USD = 500;

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

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
  const ltv = num(c.ltv_cliente);
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

  // Escenario optimizado: mejora por etapa con topes razonables
  const respOpt = proyectarTasa(respMismoDia, 9, 1.5, 10);
  const reunionesOpt = proyectarTasa(reunionesDe10, 0, 1.3, 6);
  const asistenciaOpt = proyectarTasa(asistenciaDe10, 0, 1.2, 9);
  const cierresOpt = proyectarTasa(cierresDe10, 0, 1.25, 5);

  const contactadosOpt = leadsMes * (respOpt / 10);
  const reunionesOptAbs = contactadosOpt * (reunionesOpt / 10);
  const asistidasOpt = reunionesOptAbs * (asistenciaOpt / 10);
  const ventasOpt = asistidasOpt * (cierresOpt / 10);
  const ingresosMesOpt = ventasOpt * ticket;
  const mejoraMes = Math.max(0, ingresosMesOpt - ingresosMes);
  const mejoraAnual = mejoraMes * 12;

  // ROI contra fee mensual de Estratego
  const inversionAnual = FEE_MENSUAL_ESTRATEGO_USD * 12;
  const roi = inversionAnual > 0 ? (mejoraAnual - inversionAnual) / inversionAnual : 0;
  const mesesRecuperacion =
    mejoraMes > 0 ? FEE_MENSUAL_ESTRATEGO_USD / mejoraMes : null;

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
      mejora_mes: redondear(mejoraMes),
      mejora_anual: redondear(mejoraAnual),
      tasas_objetivo: {
        resp_mismo_dia_de_10: redondear(respOpt, 1),
        reuniones_de_10: redondear(reunionesOpt, 1),
        asistencia_de_10: redondear(asistenciaOpt, 1),
        cierres_de_10: redondear(cierresOpt, 1),
      },
    },
    roi: {
      fee_mensual_estratego: FEE_MENSUAL_ESTRATEGO_USD,
      inversion_anual: inversionAnual,
      mejora_mensual: redondear(mejoraMes),
      mejora_anual: redondear(mejoraAnual),
      roi_porcentaje: redondear(roi * 100),
      meses_recuperacion: mesesRecuperacion ? redondear(mesesRecuperacion, 1) : null,
    },
  };
}
