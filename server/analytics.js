function toInt(value, fallback = 0) {
  const num = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(num) ? num : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeText(value, maxLength) {
  return String(value ?? '').trim().slice(0, maxLength);
}

function safeJson(value) {
  if (value == null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try { JSON.parse(trimmed); return trimmed.slice(0, 4000); } catch { return JSON.stringify(trimmed).slice(0, 4000); }
  }
  try { return JSON.stringify(value).slice(0, 4000); } catch { return null; }
}

export function recordAnalyticsEvent(db, payload) {
  const visitorId = normalizeText(payload.visitor_id, 128);
  const eventType = normalizeText(payload.event_type, 48);
  const path = normalizeText(payload.path, 255) || '/';
  if (!visitorId || !eventType) return null;

  const sessionId = normalizeText(payload.session_id, 128) || null;
  const referrer = normalizeText(payload.referrer, 255) || null;
  const element = normalizeText(payload.element, 80) || null;
  const text = normalizeText(payload.text, 255) || null;
  const metadata = safeJson(payload.metadata);
  const x = payload.x == null ? null : Number(payload.x);
  const y = payload.y == null ? null : Number(payload.y);
  const scrollY = payload.scroll_y == null ? null : Number(payload.scroll_y);
  const viewportW = payload.viewport_w == null ? null : toInt(payload.viewport_w, null);
  const viewportH = payload.viewport_h == null ? null : toInt(payload.viewport_h, null);
  const userId = payload.user_id == null ? null : toInt(payload.user_id, null);

  return db.prepare(`
    INSERT INTO analytics_events (visitor_id, session_id, user_id, event_type, path, referrer, element, text, x, y, scroll_y, viewport_w, viewport_h, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(visitorId, sessionId, userId, eventType, path, referrer, element, text, x, y, scrollY, viewportW, viewportH, metadata);
}

export function recordFunnelEvent(db, eventType, userId, extra = {}) {
  return recordAnalyticsEvent(db, {
    visitor_id: `server:user:${userId}`, session_id: null, event_type: 'funnel', path: '/api',
    user_id: userId, text: eventType, metadata: { step: eventType, ...extra },
  });
}

export function getAnalyticsSummary(db, { hours = 12, path } = {}) {
  const normalizedHours = clamp(toInt(hours, 12), 1, 720);
  const sinceExpr = `datetime('now', '-${normalizedHours} hours')`;
  const pathFilter = path ? normalizeText(path, 255) : '';
  const wherePath = pathFilter ? 'AND path = ?' : '';
  const bindPath = pathFilter ? [pathFilter] : [];

  const totalEvents = db.prepare(`SELECT COUNT(*) as count FROM analytics_events WHERE created_at >= ${sinceExpr} ${wherePath}`).get(...bindPath).count;
  const uniqueVisitors = db.prepare(`SELECT COUNT(DISTINCT visitor_id) as count FROM analytics_events WHERE created_at >= ${sinceExpr} ${wherePath}`).get(...bindPath).count;
  const eventTypes = db.prepare(`SELECT event_type as type, COUNT(*) as count FROM analytics_events WHERE created_at >= ${sinceExpr} ${wherePath} GROUP BY event_type ORDER BY count DESC, type ASC`).all(...bindPath);
  const topPages = db.prepare(`SELECT path, COUNT(*) as count FROM analytics_events WHERE created_at >= ${sinceExpr} ${wherePath} GROUP BY path ORDER BY count DESC, path ASC LIMIT 10`).all(...bindPath);
  const timeline = db.prepare(`SELECT strftime('%Y-%m-%d %H:00', created_at) as hour, COUNT(*) as count FROM analytics_events WHERE created_at >= ${sinceExpr} ${wherePath} GROUP BY hour ORDER BY hour ASC`).all(...bindPath);

  return { hours: normalizedHours, total_events: totalEvents, unique_visitors: uniqueVisitors, event_types: eventTypes, top_pages: topPages, timeline };
}

export function getHeatmapClickData(db, { path, hours = 24, gridSize = 24, viewport } = {}) {
  const normalizedHours = clamp(toInt(hours, 24), 1, 720);
  const normalizedGrid = clamp(toInt(gridSize, 24), 4, 120);
  const targetPath = normalizeText(path, 255) || '/';
  let viewportFilter = '';
  if (viewport === 'desktop') viewportFilter = 'AND viewport_w >= 1024';
  else if (viewport === 'mobile') viewportFilter = 'AND viewport_w < 768';
  const bindPath = [normalizedGrid, normalizedGrid, normalizedGrid, normalizedGrid, targetPath];

  return db.prepare(`
    SELECT CAST(ROUND(x / ?) * ? AS INTEGER) AS x, CAST(ROUND(y / ?) * ? AS INTEGER) AS y, COUNT(*) AS count
    FROM analytics_events
    WHERE event_type = 'click' AND path = ? AND created_at >= datetime('now', '-${normalizedHours} hours') AND x IS NOT NULL AND y IS NOT NULL ${viewportFilter}
    GROUP BY 1, 2 ORDER BY count DESC, x ASC, y ASC
  `).all(...bindPath);
}

export function getHeatmapMouseData(db, { hours = 24, path, gridSize = 32, viewport } = {}) {
  const normalizedHours = clamp(toInt(hours, 24), 1, 720);
  const normalizedGrid = clamp(toInt(gridSize, 32), 4, 120);
  const targetPath = normalizeText(path, 255) || '';
  let viewportFilter = '';
  if (viewport === 'desktop') viewportFilter = 'AND viewport_w >= 1024';
  else if (viewport === 'mobile') viewportFilter = 'AND viewport_w < 768';
  const bindPath = [normalizedGrid, normalizedGrid, normalizedGrid, normalizedGrid, targetPath];
  return db.prepare(`
    SELECT CAST(ROUND(x / ?) * ? AS INTEGER) AS x, CAST(ROUND(y / ?) * ? AS INTEGER) AS y, COUNT(*) AS count
    FROM analytics_events
    WHERE event_type = 'mousemove' AND path = ? AND created_at >= datetime('now', '-${normalizedHours} hours') AND x IS NOT NULL AND y IS NOT NULL ${viewportFilter}
    GROUP BY 1, 2 ORDER BY count DESC, x ASC, y ASC
  `).all(...bindPath);
}

export function getScrollDepthData(db, { hours = 24, path } = {}) {
  const normalizedHours = clamp(toInt(hours, 24), 1, 720);
  const pathFilter = path ? normalizeText(path, 255) : '';
  const wherePath = pathFilter ? 'AND path = ?' : '';
  const bindPath = pathFilter ? [pathFilter] : [];
  const rows = db.prepare(`SELECT json_extract(metadata, '$.bucket') AS bucket, COUNT(*) AS count FROM analytics_events WHERE event_type = 'scroll' AND created_at >= datetime('now', '-${normalizedHours} hours') AND metadata IS NOT NULL ${wherePath} GROUP BY bucket ORDER BY CAST(bucket AS INTEGER) ASC`).all(...bindPath);
  return rows.map(r => ({ bucket: Number(r.bucket) || 0, count: r.count }));
}

export function getRageClickData(db, { hours = 24, path } = {}) {
  const normalizedHours = clamp(toInt(hours, 24), 1, 720);
  const pathFilter = path ? normalizeText(path, 255) : '';
  const wherePath = pathFilter ? 'AND path = ?' : '';
  const bindPath = pathFilter ? [pathFilter] : [];
  return db.prepare(`SELECT element, text, path, COUNT(*) AS count, MAX(created_at) AS last_seen FROM analytics_events WHERE event_type = 'rageclick' AND created_at >= datetime('now', '-${normalizedHours} hours') ${wherePath} GROUP BY element, text, path ORDER BY count DESC LIMIT 30`).all(...bindPath);
}

export function getSessionAnalytics(db, { hours = 24 } = {}) {
  const normalizedHours = clamp(toInt(hours, 24), 1, 720);
  const sessionCount = db.prepare(`SELECT COUNT(*) as count FROM (SELECT visitor_id, session_id FROM analytics_events WHERE created_at >= datetime('now', '-${normalizedHours} hours') AND session_id IS NOT NULL AND session_id != '' GROUP BY visitor_id, session_id)`).get().count;
  const pagesPerSession = db.prepare(`SELECT AVG(page_count) AS avg_pages, MAX(page_count) AS max_pages, MIN(page_count) AS min_pages FROM (SELECT visitor_id, session_id, COUNT(DISTINCT path) AS page_count FROM analytics_events WHERE created_at >= datetime('now', '-${normalizedHours} hours') AND session_id IS NOT NULL AND session_id != '' GROUP BY visitor_id, session_id)`).get() || {};
  const sessionDuration = db.prepare(`SELECT AVG(duration_secs) AS avg_duration_secs, MAX(duration_secs) AS max_duration_secs FROM (SELECT visitor_id, session_id, CAST((julianday(MAX(created_at)) - julianday(MIN(created_at))) * 86400 AS INTEGER) AS duration_secs FROM analytics_events WHERE created_at >= datetime('now', '-${normalizedHours} hours') AND session_id IS NOT NULL AND session_id != '' GROUP BY visitor_id, session_id HAVING duration_secs > 0)`).get() || {};
  return {
    total_sessions: sessionCount,
    avg_pages_per_session: Math.round((pagesPerSession.avg_pages || 0) * 10) / 10,
    max_pages_per_session: pagesPerSession.max_pages || 0,
    avg_session_duration_secs: Math.round((sessionDuration.avg_duration_secs || 0)),
    max_session_duration_secs: sessionDuration.max_duration_secs || 0,
  };
}

// ── Session recording for replay ──

export function saveSessionRecording(db, payload) {
  const visitorId = normalizeText(payload.visitor_id, 128) || 'unknown';
  const sessionId = normalizeText(payload.session_id, 128) || '';
  const userId = payload.user_id || null;
  const userName = normalizeText(payload.user_name, 255) || null;
  const userEmail = normalizeText(payload.user_email, 255) || null;
  const startUrl = normalizeText(payload.start_url, 512) || '/';
  const events = Array.isArray(payload.events) ? payload.events : [];
  const eventCount = events.length;
  const pages = new Set();
  let firstTime = null, lastTime = null;

  const cleanEvents = events.map(e => {
    if (e.t) {
      if (firstTime === null) firstTime = e.t;
      lastTime = e.t;
    }
    if (e.type === 'pageview' && e.url) pages.add(e.url);
    return {
      t: e.t || 0,
      type: e.type || 'unknown',
      data: e.data || {},
    };
  });

  const durationSecs = firstTime && lastTime ? Math.round((lastTime - firstTime) / 1000) : 0;

  // Try to update existing recording for this session, or insert new
  const existing = db.prepare('SELECT id, events FROM session_recordings WHERE session_id = ? AND status = ?').get(sessionId, 'recording');
  if (existing) {
    const existingEvents = JSON.parse(existing.events || '[]');
    const merged = [...existingEvents];

    // Merge new events, avoid duplicates by timestamp+type
    const existingKeys = new Set(merged.map(e => `${e.t}_${e.type}`));
    for (const e of cleanEvents) {
      const key = `${e.t}_${e.type}`;
      if (!existingKeys.has(key)) {
        merged.push(e);
        existingKeys.add(key);
      }
    }

    merged.sort((a, b) => a.t - b.t);
    const mergedPages = new Set();
    merged.forEach(e => { if (e.type === 'pageview' && e.data?.url) mergedPages.add(e.data.url); });

    const mergedDuration = merged.length > 1 && merged[0].t ? Math.round((merged[merged.length - 1].t - merged[0].t) / 1000) : durationSecs;

    db.prepare(`
      UPDATE session_recordings SET events = ?, event_count = ?, page_count = ?, duration_secs = ?, end_at = datetime('now')
      WHERE id = ?
    `).run(JSON.stringify(merged), merged.length, mergedPages.size, mergedDuration, existing.id);
    return { id: existing.id, updated: true };
  } else {
    const result = db.prepare(`
      INSERT INTO session_recordings (visitor_id, session_id, user_id, user_name, user_email, start_url, start_at, end_at, duration_secs, event_count, page_count, events, status)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), ?, ?, ?, ?, 'completed')
    `).run(visitorId, sessionId, userId, userName, userEmail, startUrl, durationSecs, eventCount, pages.size, JSON.stringify(cleanEvents));
    return { id: result.lastInsertRowid, inserted: true };
  }
}

export function getSessionRecordingsList(db, { limit = 50, offset = 0, userId, visitorId } = {}) {
  let where = 'WHERE status = ?';
  const params = ['completed'];

  if (userId) { where += ' AND user_id = ?'; params.push(userId); }
  if (visitorId) { where += ' AND visitor_id = ?'; params.push(visitorId); }

  const total = db.prepare(`SELECT COUNT(*) as count FROM session_recordings ${where}`).get(...params).count;

  const rows = db.prepare(`
    SELECT id, visitor_id, session_id, user_id, user_name, user_email, start_url, start_at, end_at, duration_secs, event_count, page_count, status
    FROM session_recordings ${where}
    ORDER BY start_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return { total, recordings: rows, limit, offset };
}

export function getSessionRecordingDetail(db, id) {
  return db.prepare('SELECT * FROM session_recordings WHERE id = ?').get(id);
}

export function deleteSessionRecording(db, id) {
  db.prepare('DELETE FROM session_recordings WHERE id = ?').run(id);
}
