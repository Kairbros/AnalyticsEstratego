import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
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
