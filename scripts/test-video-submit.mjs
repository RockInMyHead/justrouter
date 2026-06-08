import 'dotenv/config';
import {
  submitOpenRouterVideoJob,
  getOpenRouterCredits,
  getOpenRouterCreditsRemaining,
} from '../server/openrouter-video.js';

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error('OPENROUTER_API_KEY missing');
  process.exit(1);
}

const credits = await getOpenRouterCredits({ apiKey });
const remaining = getOpenRouterCreditsRemaining(credits);
console.log('OpenRouter credits remaining:', remaining.toFixed(2));

const modelId = process.argv[2] || 'google/veo-3.1-lite-preview';
try {
  const result = await submitOpenRouterVideoJob({
    apiKey,
    modelId,
    prompt: 'A cat walking in a garden',
    duration: 4,
    resolution: '720p',
    aspectRatio: '16:9',
  });
  console.log('submit ok:', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('submit failed:', error.message);
  process.exit(1);
}
