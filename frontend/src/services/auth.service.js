import { api, storeToken, clearToken } from './api';

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  storeToken(data.token);
  return data.usuario;
}

export async function fetchMe() {
  const { data } = await api.get('/auth/me');
  return data.usuario;
}

export function logout() {
  clearToken();
}
