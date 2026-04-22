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
  const { data } = await api.post(`/diagnosticos/${id}/calcular`);
  return data.diagnostico;
}

export async function obtenerCliente(id) {
  const { data } = await api.get(`/clientes/${id}`);
  return data.cliente;
}
