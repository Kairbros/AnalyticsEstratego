import { api } from './api';

export async function listarClientes() {
  const { data } = await api.get('/clientes');
  return data.clientes;
}

export async function crearCliente({ email, nombre, empresa, telefono, industria, notas }) {
  const { data } = await api.post('/clientes', {
    email,
    nombre,
    empresa: empresa || null,
    telefono: telefono || null,
    industria: industria || null,
    notas: notas || null,
  });
  return data; // { usuario, passwordTemporal }
}

export async function regenerarPasswordCliente(id) {
  const { data } = await api.post(`/clientes/${id}/regenerar-password`);
  return data; // { usuario, passwordTemporal }
}
