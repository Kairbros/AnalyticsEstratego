import { api } from './api';

export async function listarVendedores() {
  const { data } = await api.get('/vendedores');
  return data.vendedores;
}

export async function crearVendedor({ email, nombre, telefono }) {
  const { data } = await api.post('/vendedores', { email, nombre, telefono });
  return data; // { usuario, passwordTemporal }
}

export async function regenerarPasswordVendedor(id) {
  const { data } = await api.post(`/vendedores/${id}/regenerar-password`);
  return data; // { usuario, passwordTemporal }
}

export async function listarClientesDeVendedor(id) {
  const { data } = await api.get(`/vendedores/${id}/clientes`);
  return data.clientes;
}

export async function solicitarDemoWebhook(telefono) {
  const { data } = await api.post('/vendedores/solicitar-demo', { telefono });
  return data;
}

