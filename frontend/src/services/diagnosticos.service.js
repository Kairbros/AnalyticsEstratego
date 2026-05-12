import { api } from './api';

export async function listarDiagnosticosDeCliente(clienteId) {
  const { data } = await api.get(`/clientes/${clienteId}/diagnosticos`);
  return data.diagnosticos;
}

export async function crearDiagnostico(clienteId) {
  const { data } = await api.post(`/clientes/${clienteId}/diagnosticos`);
  return data.diagnostico;
}

export async function obtenerDiagnostico(id) {
  const { data } = await api.get(`/diagnosticos/${id}`);
  return data.diagnostico;
}

export async function actualizarDiagnostico(id, bloques) {
  const { data } = await api.patch(`/diagnosticos/${id}`, bloques);
  return data.diagnostico;
}

export async function calcularDiagnostico(id) {
  // Tarda más que un request normal porque incluye llamada a OpenAI + render PDF
  // + envío de correo. Subimos el timeout a 90s para darle margen.
  const { data } = await api.post(`/diagnosticos/${id}/calcular`, undefined, {
    timeout: 90_000,
  });
  return data;
}

export async function eliminarDiagnostico(id) {
  await api.delete(`/diagnosticos/${id}`);
}

// Devuelve la URL absoluta que descarga el PDF de la propuesta.
// Usamos el baseURL configurado en `api` para no hardcodear el host.
export function urlPropuestaPDF(id) {
  const base = api.defaults.baseURL || '';
  return `${base.replace(/\/$/, '')}/diagnosticos/${id}/propuesta.pdf`;
}

// Descarga el PDF (envía el bearer token vía Axios y dispara el save-as).
export async function descargarPropuestaPDF(id, nombreArchivo) {
  const { data } = await api.get(`/diagnosticos/${id}/propuesta.pdf`, {
    responseType: 'blob',
  });
  const blob = new Blob([data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo || `propuesta_${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function obtenerCliente(id) {
  const { data } = await api.get(`/clientes/${id}`);
  return data.cliente;
}
