import { ProxyAgent, fetch as undiciFetch } from 'undici';
import { applyPriceMultiplier } from './billing.js';

const PROVIDER_COLORS = {
  openai: '#10B981',
  anthropic: '#8B5CF6',
  google: '#3B82F6',
  meta: '#F59E0B',
  'meta-llama': '#F59E0B',
  deepseek: '#EC4899',
  mistralai: '#14B8A6',
  mistral: '#14B8A6',
  qwen: '#06B6D4',
  moonshotai: '#6366F1',
  xai: '#EF4444',
  cohere: '#F97316',
  perplexity: '#22C55E',
  alibaba: '#06B6D4',
  amazon: '#F59E0B',
  microsoft: '#3B82F6',
};

function providerKey(model) {
  return model.id.split('/')[0]?.toLowerCase() || 'unknown';
}

function providerName(model) {
  const label = model.name || model.id;
  if (label.includes(':')) return label.split(':')[0].trim();
  const key = providerKey(model);
  return key.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function displayName(model) {
  const label = model.name || model.id;
  if (label.includes(':')) return label.split(':').slice(1).join(':').trim();
  return label;
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }

  const toHex = (value) => Math.round((value + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function providerColor(model) {
  const key = providerKey(model);
  if (PROVIDER_COLORS[key]) return PROVIDER_COLORS[key];
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hslToHex(hash, 62, 55);
}

function stripDescription(text) {
  return String(text || '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

function sanitizePublicText(text) {
  return stripDescription(text)
    .replace(/\bOpenRouter\b/gi, 'JustRouter')
    .replace(/\bopenrouter\.ai\b/gi, 'justrouter.ru')
    .replace(/\s*[,—–-]?\s*как в OpenRouter\.?/gi, '')
    .replace(/\s*[,—–-]?\s*как референс в OpenRouter\.?/gi, ' как референс')
    .replace(/\s*via OpenRouter\.?/gi, '')
    .trim();
}

function isVariablePricing(model) {
  const pricing = model.pricing || {};
  const prompt = Number(pricing.prompt ?? 0);
  const completion = Number(pricing.completion ?? 0);
  return prompt < 0 || completion < 0;
}

function pricePerMillion(model) {
  if (isVariablePricing(model)) return -1;
  const pricing = model.pricing || {};
  const prompt = Number(pricing.prompt || 0);
  const completion = Number(pricing.completion || 0);
  const audio = Number(pricing.audio || 0);
  const request = Number(pricing.request || 0);
  const image = Number(pricing.image || 0);
  return Math.max(prompt, completion, audio, request, image) * 1_000_000;
}

function pricePerVideoSecond(model, videoMeta) {
  const skus = videoMeta?.pricing_skus || {};
  const cents = Number(
    skus.cents_per_video_output_second_720p
    || skus.cents_per_video_output_second_480p
    || skus.duration_seconds_with_audio
    || skus.duration_seconds
    || skus.text_to_video_duration_seconds_720p
    || skus.image_to_video_duration_seconds_720p
    || 0,
  );
  if (cents > 0) return cents;
  if (Number(model.pricing?.completion || 0) > 0) return Number(model.pricing.completion);
  return 0.08;
}

function modelPrice(model, videoMetaById = {}) {
  const category = detectCategory(model);
  if (category === 'video') return pricePerVideoSecond(model, videoMetaById[model.id]);
  return pricePerMillion(model);
}

function estimateSpeed(model) {
  const label = `${model.id} ${model.name}`.toLowerCase();
  if (label.includes('flash') || label.includes('mini') || label.includes('turbo') || label.includes('haiku') || label.includes('fast')) {
    return 95;
  }
  if (label.includes('opus') || label.includes('large') || label.includes('reason') || label.includes('think')) {
    return 72;
  }
  return 85;
}

function detectCategory(model) {
  const id = model.id.toLowerCase();
  const outputs = model.architecture?.output_modalities || [];
  const modality = model.architecture?.modality || '';

  if (id.includes('embed')) return 'embedding';
  if (modality.includes('->text+image') || (outputs.includes('image') && outputs.length === 1)) return 'image';
  if (id.includes('whisper')) return 'audio';
  if (id.includes('tts') && !id.includes('gpt-audio')) return 'audio';
  if (id.includes('gpt-audio') || modality.includes('text+audio->text+audio')) return 'audio';
  if (modality.includes('->video') || id.includes('video') || outputs.includes('video')) return 'video';
  return 'text';
}

function detectBadge(model, price) {
  const label = `${model.id} ${model.name}`.toLowerCase();
  if (price < 0) return '🔀 по модели';
  if (price === 0) return '🆓 бесплатно';
  if (label.includes('reason') || label.includes('/o3') || label.includes('/o1') || label.includes('-r1')) {
    return '🧠 рассуждения';
  }
  if (price > 0 && price < 0.5) return '💰 дешёвая';
  return null;
}

function detectStrengths(model) {
  const parts = [];
  const inputs = model.architecture?.input_modalities || [];
  const params = model.supported_parameters || [];

  if (inputs.includes('image')) parts.push('изображения');
  if (inputs.includes('file')) parts.push('файлы');
  if (inputs.includes('audio')) parts.push('аудио');
  if (inputs.includes('video')) parts.push('видео');
  if (detectCategory(model) === 'video') parts.unshift('генерация видео');
  if (params.includes('tools')) parts.push('инструменты');
  if (params.includes('reasoning')) parts.push('рассуждения');
  if (params.includes('structured_outputs')) parts.push('структурированный вывод');

  return parts.slice(0, 4).join(', ') || 'текст';
}

function cyrillicRatio(text) {
  const letters = String(text || '').replace(/[^A-Za-z\u0400-\u04FF]/g, '');
  if (!letters) return 0;
  const cyrillic = letters.replace(/[^\u0400-\u04FF]/g, '').length;
  return cyrillic / letters.length;
}

function isMostlyCyrillic(text) {
  return cyrillicRatio(text) >= 0.35;
}

function needsRussianTranslation(text) {
  const value = String(text || '').trim();
  if (!value) return false;
  return !isMostlyCyrillic(value);
}

const RU_DESCRIPTION_OVERRIDES = {
  'openrouter/auto':
    'Ваш запрос обрабатывается мета-моделью и направляется одной из десятков моделей для оптимального результата. Чтобы узнать, какая модель была выбрана, посмотрите поле model в ответе API.',
  'openrouter/bodybuilder':
    'Преобразует запросы на естественном языке в структурированные объекты API. Опишите задачу — Body Builder соберёт подходящий вызов.',
  'openrouter/pareto-code':
    'Pareto Router подбирает сильные модели для кода по рейтингу Artificial Analysis. Параметр min_coding_score (0–1) в плагине pareto-router задаёт минимальный порог качества.',
};

function fallbackRussianDescription(model) {
  const categoryLabels = {
    text: 'текстовая модель',
    image: 'модель генерации изображений',
    audio: 'аудиомодель',
    video: 'модель генерации видео',
    embedding: 'embedding-модель',
  };
  const category = categoryLabels[model.category] || 'AI-модель';
  const strengths = model.strengths ? ` Подходит для: ${model.strengths}.` : '';
  return `${model.name} от ${model.provider} — ${category} в каталоге JustRouter.${strengths}`;
}

function parseTranslationJson(raw) {
  const cleaned = String(raw || '').trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  const parsed = JSON.parse(cleaned);
  if (Array.isArray(parsed)) return parsed.map((item) => String(item || '').trim());
  throw new Error('Unexpected translation payload');
}

async function translateDescriptionBatch(batch, { apiKey, proxyUrl }) {
  if (!batch.length) return {};
  const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
  const numbered = batch.map((item, index) => `${index + 1}. [${item.id}] ${item.text}`).join('\n\n');

  const response = await undiciFetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    dispatcher,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://justrouter.ru',
      'X-Title': 'JustRouter',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      temperature: 0.2,
      messages: [{
        role: 'user',
        content: [
          'Переведи описания AI-моделей на русский язык.',
          'Сохраняй названия моделей, бренды, версии и технические термины без перевода.',
          'Пиши естественным русским, без англоязычных вступлений.',
          'Верни только JSON-массив строк в том же порядке, без markdown и пояснений.',
          '',
          numbered,
        ].join('\n'),
      }],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || 'Не удалось перевести описания моделей');
  }

  const content = data?.choices?.[0]?.message?.content;
  const translations = parseTranslationJson(content);
  if (translations.length !== batch.length) {
    throw new Error(`Translation count mismatch: expected ${batch.length}, got ${translations.length}`);
  }

  return Object.fromEntries(batch.map((item, index) => [item.id, translations[index]]));
}

async function applyRussianDescriptions(mapped, db, { apiKey, proxyUrl, forceRetranslate = false } = {}) {
  let existingRows = [];
  try {
    existingRows = db.prepare('SELECT id, description, description_en FROM models').all();
  } catch {
    existingRows = db.prepare('SELECT id, description FROM models').all();
  }
  const existingById = Object.fromEntries(existingRows.map((row) => [row.id, row]));
  const ruByEnglish = new Map();
  if (!forceRetranslate) {
    for (const row of existingRows) {
      if (row.description_en && row.description && isMostlyCyrillic(row.description)) {
        ruByEnglish.set(row.description_en, row.description);
      }
    }
  }
  const pending = [];

  for (const model of mapped) {
    const english = model.description_en || model.description || '';
    model.description_en = sanitizePublicText(english);

    if (RU_DESCRIPTION_OVERRIDES[model.id]) {
      model.description = sanitizePublicText(RU_DESCRIPTION_OVERRIDES[model.id]);
      continue;
    }

    if (!english.trim()) {
      model.description = sanitizePublicText(fallbackRussianDescription(model));
      continue;
    }

    if (!needsRussianTranslation(english)) {
      model.description = sanitizePublicText(english);
      continue;
    }

    const cached = existingById[model.id];
    if (!forceRetranslate && cached?.description_en === english && cached.description && isMostlyCyrillic(cached.description)) {
      model.description = sanitizePublicText(cached.description);
      continue;
    }

    if (!forceRetranslate && ruByEnglish.has(english)) {
      model.description = sanitizePublicText(ruByEnglish.get(english));
      continue;
    }

    if (!apiKey) {
      model.description = sanitizePublicText(fallbackRussianDescription(model));
      continue;
    }

    pending.push(model);
  }

  if (pending.length === 0) {
    console.log('[openrouter] all model descriptions are already in Russian');
    return mapped;
  }

  console.log(`[openrouter] translating ${pending.length} model descriptions to Russian...`);
  const batchSize = 12;
  let translated = 0;
  for (let index = 0; index < pending.length; index += batchSize) {
    const batch = pending.slice(index, index + batchSize);
    try {
      const translations = await translateDescriptionBatch(
        batch.map((model) => ({ id: model.id, text: model.description_en })),
        { apiKey, proxyUrl },
      );
      for (const model of batch) {
        const ru = sanitizePublicText(translations[model.id] || fallbackRussianDescription(model));
        model.description = ru;
        ruByEnglish.set(model.description_en, ru);
        translated += 1;
      }
    } catch (error) {
      console.warn('[openrouter] description translation batch failed', error.message);
      for (const model of batch) {
        const ru = sanitizePublicText(fallbackRussianDescription(model));
        model.description = ru;
        ruByEnglish.set(model.description_en, ru);
        translated += 1;
      }
    }
  }

  console.log(`[openrouter] translated ${translated} model descriptions`);
  return mapped;
}

function buildStoredVideoMeta(modelId, category, videoMetaById) {
  if (category !== 'video') return null;
  const meta = videoMetaById[modelId];
  if (!meta) return null;
  return JSON.stringify({
    supported_frame_images: meta.supported_frame_images ?? null,
    supported_durations: meta.supported_durations ?? null,
    supported_resolutions: meta.supported_resolutions ?? null,
    supported_aspect_ratios: meta.supported_aspect_ratios ?? null,
    generate_audio: meta.generate_audio ?? null,
  });
}

let cachedVideoMetaById = {};

export function getCachedVideoMetaById() {
  return cachedVideoMetaById;
}

export function enrichModelVideoMetaRow(model) {
  if (!model || model.category !== 'video' || model.video_meta) return model;
  const cached = cachedVideoMetaById[model.id];
  if (!cached) return model;
  return {
    ...model,
    video_meta: buildStoredVideoMeta(model.id, 'video', { [model.id]: cached }),
  };
}

export function parseStoredVideoMeta(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function mapOpenRouterCatalogModel(model, videoMetaById = {}) {
  const category = detectCategory(model);
  const price = applyPriceMultiplier(modelPrice(model, videoMetaById));
  const descriptionEn = sanitizePublicText(model.description);
  const descriptionRu = sanitizePublicText(RU_DESCRIPTION_OVERRIDES[model.id] || descriptionEn);
  return {
    id: model.id,
    name: displayName(model),
    provider: providerName(model),
    category,
    price,
    context: Number(model.context_length || model.top_provider?.context_length || 0),
    speed: category === 'video' ? 70 : estimateSpeed(model),
    badge: category === 'video' ? '🎬 видео' : detectBadge(model, price),
    color: providerColor(model),
    description: descriptionRu,
    description_en: descriptionEn,
    strengths: detectStrengths(model),
    video_meta: buildStoredVideoMeta(model.id, category, videoMetaById),
  };
}

async function fetchOpenRouterJson(path, { apiKey, proxyUrl } = {}) {
  const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const response = await undiciFetch(`https://openrouter.ai/api/v1${path}`, {
    headers,
    dispatcher,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || `Не удалось получить данные каталога`);
  }

  return data;
}

export async function fetchOpenRouterVideoMeta({ apiKey, proxyUrl } = {}) {
  try {
    const data = await fetchOpenRouterJson('/videos/models', { apiKey, proxyUrl });
    const rows = data.data || [];
    cachedVideoMetaById = Object.fromEntries(rows.map((row) => [row.id, row]));
    return cachedVideoMetaById;
  } catch (error) {
    console.warn('[openrouter] video models meta unavailable', error.message);
    return cachedVideoMetaById;
  }
}

export async function fetchOpenRouterCatalog({ apiKey, proxyUrl } = {}) {
  const [mainData, videoData] = await Promise.all([
    fetchOpenRouterJson('/models', { apiKey, proxyUrl }),
    fetchOpenRouterJson('/models?output_modalities=video', { apiKey, proxyUrl }).catch((error) => {
      console.warn('[openrouter] video catalog fetch failed', error.message);
      return { data: [] };
    }),
  ]);

  const byId = new Map();
  for (const model of [...(mainData.data || []), ...(videoData.data || [])]) {
    if (model?.id && !model.id.startsWith('~')) byId.set(model.id, model);
  }

  return [...byId.values()];
}

export function syncOpenRouterModelsToDb(db, mapped) {
  const ids = mapped.map((model) => model.id);

  const upsert = db.prepare(`
    INSERT INTO models (id, name, provider, category, price, context, speed, badge, color, description, description_en, strengths, video_meta, is_active)
    VALUES (@id, @name, @provider, @category, @price, @context, @speed, @badge, @color, @description, @description_en, @strengths, @video_meta, 1)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      provider = excluded.provider,
      category = excluded.category,
      price = excluded.price,
      context = excluded.context,
      speed = excluded.speed,
      badge = excluded.badge,
      color = excluded.color,
      description = excluded.description,
      description_en = excluded.description_en,
      strengths = excluded.strengths,
      video_meta = excluded.video_meta,
      is_active = 1
  `);

  const removeStale = db.prepare('DELETE FROM models WHERE id = ?');
  const tx = db.transaction((rows) => {
    for (const model of mapped) upsert.run(model);
    if (ids.length === 0) return;

  const placeholders = ids.map(() => '?').join(', ');
    db.prepare(`UPDATE models SET is_active = 0 WHERE id NOT IN (${placeholders})`).run(...ids);

  const staleRows = db.prepare(`
    SELECT id FROM models
    WHERE id NOT IN (${placeholders})
      AND id NOT IN (SELECT DISTINCT model_id FROM messages)
      AND id NOT IN (SELECT DISTINCT model_id FROM agent_messages)
  `).all(...ids);

    for (const row of staleRows) removeStale.run(row.id);
  });

  if (mapped.length === 0) {
    console.warn('[openrouter] sync returned 0 models, skipping deactivate/delete');
    return 0;
  }

  tx(mapped);
  return mapped.length;
}

export function countModelsNeedingRussianTranslation(db) {
  const rows = db.prepare('SELECT description FROM models WHERE is_active = 1').all();
  return rows.filter((row) => needsRussianTranslation(row.description)).length;
}

export async function syncOpenRouterModels({ db, apiKey, proxyUrl, forceRetranslate = false } = {}) {
  const [catalog, videoMetaById] = await Promise.all([
    fetchOpenRouterCatalog({ apiKey, proxyUrl }),
    fetchOpenRouterVideoMeta({ apiKey, proxyUrl }),
  ]);

  let mapped = catalog.map((model) => mapOpenRouterCatalogModel(model, videoMetaById));
  mapped = await applyRussianDescriptions(mapped, db, { apiKey, proxyUrl, forceRetranslate });
  const count = syncOpenRouterModelsToDb(db, mapped);
  return count;
}
