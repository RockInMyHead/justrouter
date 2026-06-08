import { ProxyAgent, fetch as undiciFetch } from 'undici';
import { USD_TO_RUB, applyPriceMultiplier } from './billing.js';

function openRouterHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'HTTP-Referer': 'https://justrouter.ru',
    'X-Title': 'JustRouter',
  };
}

export function formatOpenRouterClientError(message) {
  const value = String(message || '').trim();
  if (!value) return 'Не удалось выполнить запрос';
  if (/insufficient credit|requires more credits|add more credits/i.test(value)) {
    return 'Сервис временно недоступен: недостаточно лимита у провайдера. Попробуйте позже или напишите в поддержку JustRouter.';
  }
  if (/fewer max_tokens|can only afford/i.test(value)) {
    return 'Сервис временно недоступен: недостаточно лимита для генерации ответа. Попробуйте короче сообщение или позже.';
  }
  if (/content policy|moderation|safety/i.test(value)) {
    return 'Запрос отклонён политикой безопасности провайдера. Измените формулировку и попробуйте снова.';
  }
  if (/resolution must be at least|image.*too small|invalid.*resolution/i.test(value)) {
    return 'Одно из фото слишком маленькое. Минимальный размер — 240×240 пикселей. Загрузите изображения большего разрешения.';
  }
  if (/openrouter\.ai|openrouter/i.test(value)) {
    return 'Сервис временно недоступен. Попробуйте позже или напишите в поддержку JustRouter.';
  }
  return value;
}

function extractOpenRouterError(data) {
  if (!data) return null;
  if (typeof data.error === 'string' && data.error.trim()) return data.error.trim();
  if (data.error?.message) return String(data.error.message).trim();
  if (data.message) return String(data.message).trim();
  return null;
}

function unwrapOpenRouterPayload(data) {
  if (data?.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    return data.data;
  }
  return data;
}

export function normalizeVideoJobResponse(data, { context = 'video job', response } = {}) {
  const payload = unwrapOpenRouterPayload(data);
  const nestedError = extractOpenRouterError(payload) || extractOpenRouterError(data);
  const status = payload?.status;
  if (nestedError) {
    const isTerminalStatus = status === 'failed' || status === 'cancelled' || status === 'expired';
    if (isTerminalStatus || context === 'poll') {
      let id = payload?.id || payload?.generation_id || payload?.job_id;
      if (!id && response?.headers) {
        const location = response.headers.get('location') || response.headers.get('Location') || '';
        const match = location.match(/\/videos\/([^/?#]+)/i);
        if (match?.[1]) id = match[1];
      }
      return {
        ...payload,
        id: id ? String(id) : '',
        status: status || 'failed',
        error: formatOpenRouterClientError(nestedError),
        unsigned_urls: [],
        usage: payload?.usage || null,
      };
    }
    throw new Error(formatOpenRouterClientError(nestedError));
  }

  let id = payload?.id || payload?.generation_id || payload?.job_id;
  if (!id && response?.headers) {
    const location = response.headers.get('location') || response.headers.get('Location') || '';
    const match = location.match(/\/videos\/([^/?#]+)/i);
    if (match?.[1]) id = match[1];
  }

  if (!id) {
    console.error(`[openrouter-video] missing job id (${context})`, JSON.stringify(data).slice(0, 2000));
    throw new Error('Провайдер не вернул идентификатор задачи. Попробуйте позже или напишите в поддержку.');
  }

  return {
    ...payload,
    id: String(id),
    status: payload?.status || 'pending',
    polling_url: payload?.polling_url || null,
    unsigned_urls: Array.isArray(payload?.unsigned_urls)
      ? payload.unsigned_urls
      : Array.isArray(payload?.urls)
        ? payload.urls
        : [],
    usage: payload?.usage || null,
  };
}

export async function getOpenRouterCredits({ apiKey, proxyUrl } = {}) {
  const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
  const response = await undiciFetch('https://openrouter.ai/api/v1/credits', {
    dispatcher,
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || 'Не удалось проверить лимит провайдера');
  }
  return data.data || {};
}

export function getOpenRouterCreditsRemaining(credits) {
  return Number(credits?.total_credits || 0) - Number(credits?.total_usage || 0);
}

export async function ensureOpenRouterCreditsForVideo({
  apiKey,
  proxyUrl,
  model,
  durationSeconds,
}) {
  const credits = await getOpenRouterCredits({ apiKey, proxyUrl });
  const remaining = getOpenRouterCreditsRemaining(credits);
  const estimatedUsd = Math.max(0.05, (Number(model.price) || 0.08) * (Number(durationSeconds) || 8));
  if (remaining < estimatedUsd) {
    throw new Error(formatOpenRouterClientError('Insufficient credits'));
  }
  return { credits, remaining, estimatedUsd };
}

export async function submitOpenRouterVideoJob({
  apiKey,
  proxyUrl,
  modelId,
  prompt,
  duration,
  resolution,
  aspectRatio,
  frameImages,
  inputReferences,
}) {
  const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
  const body = { model: modelId, prompt };
  if (duration) body.duration = duration;
  if (resolution) body.resolution = resolution;
  if (aspectRatio) body.aspect_ratio = aspectRatio;
  if (frameImages?.length) body.frame_images = frameImages;
  if (inputReferences?.length) body.input_references = inputReferences;

  const response = await undiciFetch('https://openrouter.ai/api/v1/videos', {
    method: 'POST',
    dispatcher,
    headers: openRouterHeaders(apiKey),
    body: JSON.stringify(body),
    headersTimeout: 30_000,
    bodyTimeout: 120_000,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(formatOpenRouterClientError(
      extractOpenRouterError(data) || 'Не удалось отправить запрос на генерацию видео',
    ));
  }

  return normalizeVideoJobResponse(data, { context: 'submit', response });
}

export async function pollOpenRouterVideoJob({ apiKey, proxyUrl, openrouterJobId }) {
  const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
  const response = await undiciFetch(`https://openrouter.ai/api/v1/videos/${encodeURIComponent(openrouterJobId)}`, {
    dispatcher,
    headers: openRouterHeaders(apiKey),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(formatOpenRouterClientError(
      extractOpenRouterError(data) || 'Не удалось проверить статус генерации видео',
    ));
  }

  return normalizeVideoJobResponse(data, { context: 'poll', response });
}

export async function fetchOpenRouterVideoContent({ apiKey, proxyUrl, contentUrl }) {
  const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
  const targetUrl = /^https?:\/\//i.test(contentUrl)
    ? contentUrl
    : `https://openrouter.ai${contentUrl.startsWith('/') ? '' : '/'}${contentUrl}`;
  const response = await undiciFetch(targetUrl, {
    dispatcher,
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || 'Не удалось скачать видео');
  }

  return response;
}

export function estimateVideoCostRub(model, durationSeconds, usageCostUsd) {
  if (usageCostUsd != null && Number.isFinite(Number(usageCostUsd))) {
    return Math.max(0.01, applyPriceMultiplier(Number(usageCostUsd)) * USD_TO_RUB);
  }
  const pricePerSecond = Number(model.price) || 0.08;
  const seconds = Number(durationSeconds) || 8;
  return Math.max(0.01, pricePerSecond * seconds * USD_TO_RUB);
}
