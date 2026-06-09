import { readFileSync, writeFileSync } from 'fs';

let src = readFileSync('server/index.js', 'utf8');
let lines = src.split('\n');
let changed = false;
function removeLines(start, end) {
  lines.splice(start - 1, end - start + 1);
  changed = true;
}

// Remove functions that reference deleted modules
const funcs = [
  ['function formatAgentTrace', 1393, 1403],
  ['function formatOpenClawBootLog', 1406, 1419],
];
const toRemove = funcs.map(([_, s, e]) => [s, e]);

// Sort by line descending to remove bottom-up
toRemove.sort((a, b) => b[0] - a[0]);

// Recalculate line numbers for Telegram handler blocks
// Just find and remove specific lines containing deleted function refs
let result = src;

// Remove formatAgentTrace function
result = result.replace(
  /function formatAgentTrace\(trace = \[\], \{ limit = 12 \} = \{\}\) \{\n[\s\S]*?\n\}/,
  ''
);

// Remove formatOpenClawBootLog function  
result = result.replace(
  /function formatOpenClawBootLog\(context, actionPlan = \[\]\) \{\n[\s\S]*?\n\}/,
  ''
);

// Remove recordAnalyticsEvent call in registration
result = result.replace(
  /    try \{\n      recordAnalyticsEvent\(db, \{\n[\s\S]*?\n    \} catch \(e\) \{ \/\* analytics best-effort \*\/ \}\n/,
  '    // analytics removed\n'
);

// Remove recordFunnelEvent calls
result = result.replace(
  /\n    try \{ recordFunnelEvent\(db, 'registration_complete'.*?\/\* analytics best-effort \*\/ \}/,
  ''
);
result = result.replace(
  /\n          try \{ recordFunnelEvent\(db, 'subscription_complete'.*?\/\* analytics best-effort \*\/ \}/,
  ''
);
result = result.replace(
  /\n          try \{ recordFunnelEvent\(db, 'topup_complete'.*?\/\* analytics best-effort \*\/ \}/,
  ''
);

// Remove the OpenClaw telegram handler block (lines ~1520-1604)
// Match from /openclaw handler to before /start
result = result.replace(
  /  if \(text\.startsWith\('\/openclaw'\)\) \{\n[\s\S]*?\n  \}\n\n  if \(text\.startsWith\('\/start'\)\)/,
  '  if (text.startsWith(\'/start\')'
);

// Remove the generic admin message → OpenClaw routing block
// Match from "Any other admin message" comment to the "await sendTelegramMessage" fallback
result = result.replace(
  /    \/\/ Any other admin message.*?\n[\s\S]*?\n  \}\n\n  await sendTelegramMessage\(/,
  '  await sendTelegramMessage('
);

// Remove clearConversation for tg_openclaw
result = result.replace(
  /\n      clearConversation\(`tg_openclaw_.*?\);/,
  ''
);

// Update the /clear text
result = result.replace(
  /'История Telegram-диалога с OpenClaw и универсальным AI-агентом очищена\. Начинаем с чистого листа\.'/,
  "'История диалога с AI-агентом очищена. Начинаем с чистого листа.'"
);

// Remove analytics events endpoint
result = result.replace(
  /app\.post\('\/api\/analytics\/events'.*?\n\}\);\n\n/,
  '\n'
);

// Remove Admin OpenClaw analytics routes
result = result.replace(
  /\/\/ ── Admin: OpenClaw analytics ──\n[\s\S]*?\/\/ ── Admin: Funnel analytics ──\n[\s\S]*?\n\}\);\n\n/,
  '\n'
);

// Remove analytics comment
result = result.replace(
  /\/\/ ── Analytics ingest for OpenClaw ──\n/,
  ''
);

// Remove DELETE from analytics_events
result = result.replace(
  /\n  dbConn\.prepare\('DELETE FROM analytics_events WHERE user_id = \?'\)\.run\(userId\);/,
  ''
);

writeFileSync('server/index.js', result);
console.log('Done. Lines after:', result.split('\n').length);
