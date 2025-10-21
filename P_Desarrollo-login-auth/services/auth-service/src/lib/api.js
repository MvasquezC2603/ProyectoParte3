const API = import.meta.env.VITE_API_URL;

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('token') ?? '';
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
    if (typeof options.body !== 'string') {
      options.body = JSON.stringify(options.body);
    }
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const login = (email, password) =>
  apiFetch('/auth/login', { method: 'POST', body: { email, password } });

export const getTeams = () => apiFetch('/teams');
export const createTeam = (team) =>
  apiFetch('/teams', { method: 'POST', body: team });
