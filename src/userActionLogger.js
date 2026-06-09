import { getToken } from './auth.js';

let isActive = false;
let lastPage = '';
let batch = [];
let flushTimer = null;
const FLUSH_INTERVAL = 3000;

async function flush() {
  if (batch.length === 0) return;
  const send = batch;
  batch = [];
  const token = getToken();
  if (!token) return;
  try {
    await fetch('/api/log-action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ action: 'batch', details: JSON.stringify(send) }),
      keepalive: true,
    });
  } catch {}
}

function push(action, details) {
  if (!isActive) return;
  batch.push({ action, details, t: Date.now() });
  if (batch.length >= 20) flush();
}

export function logPageView(path) {
  if (path === lastPage) return;
  lastPage = path;
  push('pageview', { path });
}

export function logModelUse(modelId, modelName, category) {
  push('model_use', { model_id: modelId, model_name: modelName, category });
}

export function logImageGenerate(modelId, promptLength) {
  push('image_generate', { model_id: modelId, prompt_len: promptLength });
}

export function logVideoGenerate(modelId, promptLength) {
  push('video_generate', { model_id: modelId, prompt_len: promptLength });
}

export function logAudioGenerate(modelId, voice, textLength) {
  push('audio_generate', { model_id: modelId, voice, text_len: textLength });
}

export function logChatSend(modelId, messageLength) {
  push('chat_send', { model_id: modelId, msg_len: messageLength });
}

export function logBalanceTopup(amount) {
  push('balance_topup', { amount });
}

export function logApiKeyCopy() {
  push('api_key_copy', {});
}

export function logExportAudio(id) {
  push('export_audio', { id });
}

export function startActionLogger() {
  if (isActive || typeof window === 'undefined') return;
  isActive = true;
  lastPage = window.location.pathname;
  flushTimer = setInterval(flush, FLUSH_INTERVAL);
  window.addEventListener('beforeunload', () => { flush(); });
}

export function stopActionLogger() {
  isActive = false;
  flush();
  if (flushTimer) clearInterval(flushTimer);
  flushTimer = null;
}
