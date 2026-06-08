import fs from 'fs';

const API_KEY = process.env.JUSTROUTER_API_KEY;
const BASE_URL = process.env.JUSTROUTER_BASE_URL || 'https://justrouter.ru';
const CONCURRENCY = Number(process.env.CONCURRENCY || 6);
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 45000);
const PROMPT = process.env.TEST_PROMPT || 'Ответь одним словом: да';

if (!API_KEY) {
  console.error('Set JUSTROUTER_API_KEY before running model tests.');
  process.exit(1);
}

async function fetchModels() {
  const res = await fetch(`${BASE_URL}/api/models`);
  if (!res.ok) throw new Error(`models list failed: ${res.status}`);
  return res.json();
}

async function testModel(modelId) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': API_KEY,
      },
      body: JSON.stringify({ model_id: modelId, content: PROMPT }),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { modelId, ok: false, status: res.status, error: data.error || res.statusText };
    }
    if (!data.response) {
      return { modelId, ok: false, status: res.status, error: 'empty response' };
    }
    return {
      modelId,
      ok: true,
      status: res.status,
      preview: String(data.response).slice(0, 80),
      is_free: data.is_free,
    };
  } catch (e) {
    return {
      modelId,
      ok: false,
      status: 0,
      error: e.name === 'AbortError' ? 'timeout' : e.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runPool(items, worker) {
  const results = new Array(items.length);
  let index = 0;

  async function runner() {
    while (index < items.length) {
      const current = index++;
      results[current] = await worker(items[current]);
      const done = index;
      if (done % 25 === 0 || done === items.length) {
        process.stdout.write(`\rProgress: ${done}/${items.length}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => runner()));
  process.stdout.write('\n');
  return results;
}

const models = await fetchModels();
console.log(`Testing ${models.length} models via ${BASE_URL}/api/v1/chat`);

const started = Date.now();
const results = await runPool(models.map((m) => m.id), testModel);
const elapsed = ((Date.now() - started) / 1000).toFixed(1);

const passed = results.filter((r) => r.ok);
const failed = results.filter((r) => !r.ok);

const byError = failed.reduce((acc, item) => {
  const key = item.error || 'unknown';
  acc[key] = acc[key] || [];
  acc[key].push(item.modelId);
  return acc;
}, {});

const report = {
  tested_at: new Date().toISOString(),
  base_url: BASE_URL,
  total: models.length,
  passed: passed.length,
  failed: failed.length,
  elapsed_sec: Number(elapsed),
  failures_by_error: Object.fromEntries(
    Object.entries(byError).map(([error, ids]) => [error, { count: ids.length, models: ids }]),
  ),
  failed_models: failed,
  passed_models: passed.map((r) => r.modelId),
};

const outPath = '/Users/artembutko/Desktop/JustRouter/scripts/model-test-report.json';
fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log(`Done in ${elapsed}s`);
console.log(`OK: ${passed.length} | FAIL: ${failed.length}`);
console.log(`Report: ${outPath}`);

if (failed.length) {
  console.log('\nTop failure reasons:');
  for (const [error, ids] of Object.entries(byError).sort((a, b) => b[1].length - a[1].length).slice(0, 10)) {
    console.log(`- ${error}: ${ids.length}`);
  }
  console.log('\nFirst 20 failed models:');
  for (const item of failed.slice(0, 20)) {
    console.log(`- ${item.modelId}: ${item.error}`);
  }
}

process.exit(failed.length ? 1 : 0);
