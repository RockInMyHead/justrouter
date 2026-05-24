import { ProxyAgent, fetch as undiciFetch } from 'undici';

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

function providerColor(model) {
  const key = providerKey(model);
  if (PROVIDER_COLORS[key]) return PROVIDER_COLORS[key];
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return `hsl(${hash}, 62%, 55%)`;
}

function stripDescription(text) {
  return String(text || '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

function pricePerMillion(model) {
  const pricing = model.pricing || {};
  const prompt = Number(pricing.prompt || 0);
  const completion = Number(pricing.completion || 0);
  return Math.max(prompt, completion) * 1_000_000;
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
  if (id.includes('tts') || modality.includes('text+audio->text+audio')) return 'audio';
  if (id.includes('video') || outputs.includes('video')) return 'video';
  return 'text';
}

function detectBadge(model, price) {
  const label = `${model.id} ${model.name}`.toLowerCase();
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
  if (params.includes('tools')) parts.push('инструменты');
  if (params.includes('reasoning')) parts.push('рассуждения');
  if (params.includes('structured_outputs')) parts.push('structured output');

  return parts.slice(0, 4).join(', ') || 'текст';
}

export function mapOpenRouterCatalogModel(model) {
  const price = pricePerMillion(model);
  return {
    id: model.id,
    name: displayName(model),
    provider: providerName(model),
    category: detectCategory(model),
    price,
    context: Number(model.context_length || model.top_provider?.context_length || 0),
    speed: estimateSpeed(model),
    badge: detectBadge(model, price),
    color: providerColor(model),
    description: stripDescription(model.description),
    strengths: detectStrengths(model),
  };
}

export async function fetchOpenRouterCatalog({ apiKey, proxyUrl } = {}) {
  const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const response = await undiciFetch('https://openrouter.ai/api/v1/models', {
    headers,
    dispatcher,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || 'Не удалось получить модели OpenRouter');
  }

  return (data.data || []).filter((model) => model.id && !model.id.startsWith('~'));
}

export function syncOpenRouterModelsToDb(db, openRouterModels) {
  const mapped = openRouterModels.map(mapOpenRouterCatalogModel);
  const ids = mapped.map((model) => model.id);

  const upsert = db.prepare(`
    INSERT INTO models (id, name, provider, category, price, context, speed, badge, color, description, strengths, is_active)
    VALUES (@id, @name, @provider, @category, @price, @context, @speed, @badge, @color, @description, @strengths, 1)
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
      strengths = excluded.strengths,
      is_active = 1
  `);

  const placeholders = ids.map(() => '?').join(', ');
  const deactivate = db.prepare(`
    UPDATE models
    SET is_active = 0
    WHERE id NOT IN (${placeholders})
  `);

  const staleRows = db.prepare(`
    SELECT id FROM models
    WHERE id NOT IN (${placeholders})
      AND id NOT IN (SELECT DISTINCT model_id FROM messages)
      AND id NOT IN (SELECT DISTINCT model_id FROM agent_messages)
  `).all(...ids);

  const removeStale = db.prepare('DELETE FROM models WHERE id = ?');
  const tx = db.transaction((rows) => {
    for (const model of mapped) upsert.run(model);
    deactivate.run(...ids);
    for (const row of staleRows) removeStale.run(row.id);
  });

  tx(mapped);
  return mapped.length;
}

export async function syncOpenRouterModels({ db, apiKey, proxyUrl }) {
  const catalog = await fetchOpenRouterCatalog({ apiKey, proxyUrl });
  return syncOpenRouterModelsToDb(db, catalog);
}
