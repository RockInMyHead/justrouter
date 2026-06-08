import 'dotenv/config';
import db from '../server/db.js';
import {
  syncOpenRouterModels,
  countModelsNeedingRussianTranslation,
} from '../server/openrouter-models.js';

const force = process.argv.includes('--force');
const before = countModelsNeedingRussianTranslation(db);
console.log(`Models needing Russian translation: ${before}`);

const count = await syncOpenRouterModels({
  db,
  apiKey: process.env.OPENROUTER_API_KEY,
  proxyUrl: process.env.OPENROUTER_PROXY_URL,
  forceRetranslate: force || before > 0,
});

const after = countModelsNeedingRussianTranslation(db);
console.log(`Synced ${count} models. Still untranslated: ${after}`);
