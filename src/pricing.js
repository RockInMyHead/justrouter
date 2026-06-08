/** USD/1M токенов → ₽, курс как в billing.js */
export const USD_TO_RUB = 80;

/** OpenAI: ~$0.06/мин входящего аудио при $40/1M audio tokens ≈ 1500 tokens/min */
export const AUDIO_INPUT_TOKENS_PER_MINUTE = 1500;

/** OpenAI: ~$0.24/мин исходящего аудио при $80/1M ≈ 3000 tokens/min */
export const AUDIO_OUTPUT_TOKENS_PER_MINUTE = 3000;

export function isTokenAudioModel(model) {
  const id = String(model?.id || '').toLowerCase();
  if (id.includes('gpt-audio') || id.includes('4o-audio')) return true;
  if (id.includes('whisper') || id.includes('tts')) return false;
  const modality = String(model?.modality || model?.architecture?.modality || '').toLowerCase();
  return modality.includes('audio') && (modality.includes('text+audio') || modality.includes('->text+audio'));
}

export function audioInputRubPerMinute(model) {
  const pricePerM = Number(model?.price);
  if (!Number.isFinite(pricePerM) || pricePerM <= 0) return null;
  return Math.max(0.01, pricePerM * (AUDIO_INPUT_TOKENS_PER_MINUTE / 1_000_000) * USD_TO_RUB);
}

export function audioOutputRubPerMinute(model, { outputRateMultiplier = 2 } = {}) {
  const input = audioInputRubPerMinute(model);
  if (input == null) return null;
  const outputTokensRatio = AUDIO_OUTPUT_TOKENS_PER_MINUTE / AUDIO_INPUT_TOKENS_PER_MINUTE;
  return Math.max(0.01, input * outputRateMultiplier * outputTokensRatio);
}

export function formatRubAmount(rub) {
  if (rub == null) return '—';
  if (rub < 1) return `${rub.toFixed(2)} ₽`;
  if (rub < 100) return `${rub.toFixed(1)} ₽`;
  return `${Math.round(rub)} ₽`;
}

export function formatAudioInputPrice(model) {
  const rub = audioInputRubPerMinute(model);
  if (rub == null) return null;
  return `${formatRubAmount(rub)}/мин`;
}

export function formatAudioCostHint(model) {
  const input = audioInputRubPerMinute(model);
  const output = audioOutputRubPerMinute(model);
  if (input == null) return null;
  if (output == null || Math.abs(output - input) < 0.05) {
    return `≈ ${formatRubAmount(input)} за 1 мин входящего аудио`;
  }
  return `≈ ${formatRubAmount(input)}–${formatRubAmount(output)} за 1 мин аудио`;
}
