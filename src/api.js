const API_BASE = '/api';

async function request(url, options = {}) {
  const token = localStorage.getItem('velorix_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Ошибка запроса');
  return data;
}

export const api = {
  // Auth
  register: (email, password, name) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),

  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  logout: () => request('/auth/logout', { method: 'POST' }),

  me: () => request('/auth/me'),

  // Models
  getModels: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/models${qs ? `?${qs}` : ''}`);
  },

  getModel: (id) => request(`/models/${encodeURIComponent(id)}`),

  // Chat
  sendMessage: (model_id, content) =>
    request('/chat', { method: 'POST', body: JSON.stringify({ model_id, content }) }),

  getMessages: (model_id) =>
    request(`/messages${model_id ? `?model_id=${encodeURIComponent(model_id)}` : ''}`),

  getFreeRemaining: (model_id) =>
    request(`/free-remaining?model_id=${encodeURIComponent(model_id)}`),
};
