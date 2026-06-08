import { ProxyAgent, fetch as undiciFetch } from 'undici';
import { estimateTextMessageCostRub, usdToRub, applyPriceMultiplier } from './billing.js';
import { formatOpenRouterClientError } from './openrouter-video.js';

function openRouterHeaders(apiKey) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'HTTP-Referer': 'https://justrouter.ru',
    'X-Title': 'JustRouter',
  };
}

function imageOnlyModel(modelId) {
  const id = String(modelId || '').toLowerCase();
  return /flux|sourceful|recraft|stable-diffusion|sdxl|dall-e|midjourney|imagen/.test(id)
    && !/gemini|gpt|claude/.test(id);
}

function buildUserContent(prompt, referenceImages) {
  if (!referenceImages?.length) return prompt;
  return [
    { type: 'text', text: prompt },
    ...referenceImages.map((url) => ({
      type: 'image_url',
      image_url: { url },
    })),
  ];
}

function extractGeneratedImages(message) {
  const fromField = message?.images || [];
  const urls = fromField
    .map((img) => img?.image_url?.url || img?.imageUrl?.url)
    .filter(Boolean);

  if (urls.length) return urls;

  const content = message?.content;
  if (Array.isArray(content)) {
    return content
      .filter((part) => part?.type === 'image_url')
      .map((part) => part.image_url?.url)
      .filter(Boolean);
  }

  return [];
}

export function estimateImageCostRub(model, referenceCount = 0) {
  const base = estimateTextMessageCostRub(model);
  const extra = referenceCount > 0 ? Math.max(0.05, base * 0.5) : 0;
  return Math.max(0.5, base + extra);
}

export async function generateOpenRouterImage({
  apiKey,
  proxyUrl,
  modelId,
  prompt,
  referenceImages = [],
  imageConfig = {},
}) {
  const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
  const body = {
    model: modelId,
    messages: [{
      role: 'user',
      content: buildUserContent(prompt, referenceImages),
    }],
    modalities: imageOnlyModel(modelId) ? ['image'] : ['image', 'text'],
  };

  if (imageConfig.aspect_ratio || imageConfig.image_size) {
    body.image_config = {};
    if (imageConfig.aspect_ratio) body.image_config.aspect_ratio = imageConfig.aspect_ratio;
    if (imageConfig.image_size) body.image_config.image_size = imageConfig.image_size;
  }

  const response = await undiciFetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    dispatcher,
    headers: openRouterHeaders(apiKey),
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(formatOpenRouterClientError(
      data?.error?.message || data?.message || 'Не удалось сгенерировать изображение',
    ));
  }

  const message = data?.choices?.[0]?.message;
  const images = extractGeneratedImages(message);
  if (!images.length) {
    throw new Error('Модель не вернула изображение. Попробуйте другую модель или измените промпт.');
  }

  const text = typeof message?.content === 'string' ? message.content : '';
  const usage = data.usage || {};

  return {
    images,
    text,
    usage,
  };
}

export function imageCostRubFromUsage(model, usage) {
  const directUsd = Number(usage?.cost ?? usage?.total_cost);
  if (Number.isFinite(directUsd) && directUsd > 0) {
    return usdToRub(applyPriceMultiplier(directUsd));
  }
  return estimateImageCostRub(model);
}
