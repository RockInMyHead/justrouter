import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { recordAnalyticsEvent, recordFunnelEvent } from '../server/openclaw-analytics.js';
import { buildOpenClawActionPlan, buildOpenClawContext } from '../server/openclaw-agent.js';

const db = new Database(':memory:');

db.exec(`
  CREATE TABLE analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitor_id TEXT NOT NULL DEFAULT '',
    session_id TEXT,
    user_id INTEGER,
    event_type TEXT NOT NULL,
    path TEXT NOT NULL DEFAULT '/',
    referrer TEXT,
    element TEXT,
    text TEXT,
    x REAL,
    y REAL,
    scroll_y REAL,
    viewport_w INTEGER,
    viewport_h INTEGER,
    metadata TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE analytics_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_type TEXT NOT NULL,
    period_start TEXT,
    period_end TEXT,
    summary_json TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

for (let i = 0; i < 30; i += 1) {
  recordAnalyticsEvent(db, {
    visitor_id: `visitor_${i}`,
    session_id: `session_${i}`,
    event_type: 'pageview',
    path: '/',
    viewport_w: 1280,
    viewport_h: 800,
  });
}

recordAnalyticsEvent(db, {
  visitor_id: 'visitor_click',
  session_id: 'session_click',
  event_type: 'click',
  path: '/',
  x: 420,
  y: 240,
  viewport_w: 1280,
  viewport_h: 800,
});

recordAnalyticsEvent(db, {
  visitor_id: 'visitor_rage',
  session_id: 'session_rage',
  event_type: 'rageclick',
  path: '/',
  element: 'button.cta',
  text: 'Start',
  x: 420,
  y: 240,
  metadata: JSON.stringify({ count: 4, window: 1500 }),
});

recordAnalyticsEvent(db, {
  visitor_id: 'visitor_scroll',
  session_id: 'session_scroll',
  event_type: 'scroll',
  path: '/',
  metadata: JSON.stringify({ bucket: 25 }),
});

recordFunnelEvent(db, 'registration_complete', 42, { email_domain: 'example.com' });

const funnelStep = db.prepare(`
  SELECT json_extract(metadata, '$.step') AS step
  FROM analytics_events
  WHERE event_type = 'funnel'
  LIMIT 1
`).get();

assert.equal(funnelStep.step, 'registration_complete');

const context = buildOpenClawContext(db, { hours: 24, path: '/' });
assert.equal(context.analyzed_path, '/');
assert.equal(context.signals.metrics.pageviews, 30);
assert.equal(context.signals.metrics.clicks, 1);
assert.equal(context.signals.metrics.rage_clicks, 1);
assert.ok(context.funnel.steps.some((step) => step.step === 'registration_complete'));
assert.ok(context.signals.issues.some((issue) => issue.area === '/' || issue.area === 'funnel'));

const plan = buildOpenClawActionPlan(context);
assert.ok(plan.length >= 1);
assert.ok(plan.some((item) => item.priority === 'urgent' || item.priority === 'normal'));

console.log('[test-openclaw-agent] ok');
