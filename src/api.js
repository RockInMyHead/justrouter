import { clearAuth } from './auth.js';

const API_BASE = '/api';

let meInflight = null;

function isRetryableNetworkError(error) {
  const message = String(error?.message || error?.cause?.message || error || '');
  return /failed to fetch|network|load failed|networkerror|соединение потеряно|соединение|связаться с сервером|aborted|timeout|err_network|err_internet_disconnected/i.test(message);
}

async function request(url, options = {}) {
  const token = localStorage.getItem('velorix_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const timeoutMs = options.timeoutMs;
  let controller;
  let timeoutId;
  if (timeoutMs) {
    controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers,
      ...(controller ? { signal: controller.signal } : {}),
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Сервер не ответил вовремя. Попробуйте ещё раз.');
    }
    const raw = String(error?.message || error || '');
    if (isRetryableNetworkError(error)) {
      const networkError = new Error(
        /соединение/i.test(raw)
          ? 'Сетевое соединение прервано. Попробуйте ещё раз.'
          : 'Не удалось связаться с сервером. Проверьте интернет и попробуйте снова.',
      );
      networkError.cause = error;
      throw networkError;
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  let data = {};
  try {
    data = await res.json();
  } catch {
    if (!res.ok) {
      throw new Error(`Ошибка сервера (${res.status})`);
    }
    return {};
  }

  if (!res.ok) {
    const error = new Error(data.error || 'Ошибка запроса');
    error.status = res.status;
    if (data.pending_verification) error.pending_verification = true;
    if (data.email) error.email = data.email;

    if (
      res.status === 401
      && token
      && !url.startsWith('/auth/login')
      && !url.startsWith('/auth/register')
      && !url.startsWith('/auth/verify-email')
    ) {
      meInflight = null;
      clearAuth();
      window.dispatchEvent(new CustomEvent('velorix:auth-expired'));
    }

    throw error;
  }
  return data;
}

async function requestWithRetry(url, options = {}, retries = 3) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await request(url, options);
    } catch (error) {
      lastError = error;
      if (attempt < retries && isRetryableNetworkError(error)) {
        await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

function authRequest(url, options = {}) {
  return requestWithRetry(url, { timeoutMs: 20_000, ...options }, 1);
}

export { isRetryableNetworkError };

export function isAuthError(error) {
  const message = String(error?.message || error || '');
  return error?.status === 401 || /не авторизован|сессия не найдена|неверный токен/i.test(message);
}

export function fetchCurrentUser({ force = false } = {}) {
  const token = localStorage.getItem('velorix_token');
  if (!token) return Promise.resolve(null);
  if (meInflight && !force) return meInflight;

  meInflight = authRequest('/auth/me')
    .then((user) => {
      localStorage.setItem('velorix_session', JSON.stringify(user));
      return user;
    })
    .finally(() => {
      meInflight = null;
    });

  return meInflight;
}

export const api = {
  // Auth
  register: (email, password, name, marketing_enabled = true, referral_code = '') =>
    authRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name, marketing_enabled, referral_code }),
    }),

  verifyEmail: (email, code) =>
    authRequest('/auth/verify-email', { method: 'POST', body: JSON.stringify({ email, code }) }),

  resendVerification: (email) =>
    authRequest('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  login: (email, password) =>
    authRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  logout: () => request('/auth/logout', { method: 'POST' }),

  me: () => request('/auth/me'),

  updateSettings: (settings) =>
    request('/auth/settings', { method: 'PATCH', body: JSON.stringify(settings) }),

  getTelegramLinkCode: () => request('/telegram/link-code', { method: 'POST' }),

  createYookassaPayment: (amount) =>
    request('/billing/yookassa/payment', { method: 'POST', body: JSON.stringify({ amount }) }),

  getSitePurchases: () => request('/billing/site-purchases'),

  createSubscriptionPayment: (plan_type, period) =>
    request('/billing/subscription/create', {
      method: 'POST',
      body: JSON.stringify({ plan_type, period }),
    }),

  createTierSubscriptionPayment: (tier) =>
    request('/billing/subscription/tier', {
      method: 'POST',
      body: JSON.stringify({ tier }),
    }),

  getSubscriptionTiersInfo: () => request('/subscription/tiers-info'),

  getSubscriptionStatus: () => request('/billing/subscription/status'),

  cancelSubscription: () =>
    request('/billing/subscription/cancel', { method: 'POST' }),

  getSitePrompt: (siteId) => request(`/billing/site-prompt/${encodeURIComponent(siteId)}`),

  purchaseSite: (siteId) =>
    request('/billing/site-purchase', { method: 'POST', body: JSON.stringify({ site_id: siteId }) }),

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

  generateVideo: (payload) =>
    requestWithRetry('/video', { method: 'POST', body: JSON.stringify(payload), timeoutMs: 120_000 }, 2),

  generateImage: (payload) =>
    requestWithRetry('/image', { method: 'POST', body: JSON.stringify(payload), timeoutMs: 120_000 }, 2),

  generateAudio: (payload) =>
    requestWithRetry('/audio', { method: 'POST', body: JSON.stringify(payload), timeoutMs: 120_000 }, 2),

  getVideoJob: (jobId) =>
    request(`/video/jobs/${jobId}`),

  getSupportConversation: (guestToken) =>
    request('/support/conversation', {
      headers: guestToken ? { 'X-Guest-Token': guestToken } : undefined,
    }),

  getSupportMessages: (conversationId, guestToken) =>
    request(`/support/messages?conversation_id=${encodeURIComponent(conversationId)}`, {
      headers: guestToken ? { 'X-Guest-Token': guestToken } : undefined,
    }),

  sendSupportMessage: (content, { conversationId, guestToken } = {}) =>
    request('/support/messages', {
      method: 'POST',
      body: JSON.stringify({
        content,
        conversation_id: conversationId,
        guest_token: guestToken,
      }),
      headers: guestToken ? { 'X-Guest-Token': guestToken } : undefined,
      timeoutMs: 90_000,
    }),

  getReferralStats: () => request('/referrals/me'),

  // Blog
  getBlogPosts: () => request('/blog'),
  getBlogPost: (slug) => request(`/blog/${encodeURIComponent(slug)}`),
  getAdminBlogPosts: () => request('/admin/blog'),
  createBlogPost: (data) => request('/admin/blog', { method: 'POST', body: JSON.stringify(data) }),
  updateBlogPost: (id, data) => request(`/admin/blog/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBlogPost: (id) => request(`/admin/blog/${id}`, { method: 'DELETE' }),

  // FAQ
  getFaq: () => request('/faq'),
  getAdminFaq: () => request('/admin/faq'),
  createFaq: (data) => request('/admin/faq', { method: 'POST', body: JSON.stringify(data) }),
  updateFaq: (id, data) => request(`/admin/faq/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFaq: (id) => request(`/admin/faq/${id}`, { method: 'DELETE' }),

  applyPromoCode: (code) => request('/promo/apply', { method: 'POST', body: JSON.stringify({ code }) }),
};
