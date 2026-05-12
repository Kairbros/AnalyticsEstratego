import axios from 'axios';

// En dev el proxy de Vite hace forward de /api → localhost:3001.
// En producción el frontend se sirve estático y necesita la URL absoluta
// del backend, que llega vía VITE_API_URL en build time.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10_000,
});

const TOKEN_KEY = 'estratego_token';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function storeToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Inyecta el token en cada request
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si el token expira, limpia y redirige a /login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearToken();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

export async function getHealth() {
  const { data } = await api.get('/health');
  return data;
}
