function toInt(value, fallback = 0) {
  const num = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(num) ? num : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeText(value, maxLength) {
  return String(value ?? '')
    .trim()
    .slice(0, maxLength);
}

function safeJson(value) {
  if (value == null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      JSON.parse(trimmed);
      return trimmed.slice(0, 4000);
    } catch {
      return JSON.stringify(trimmed).slice(0, 4000);
    }
  }
  try {
    return JSON.stringify(value).slice(0, 4000);
  } catch {
    return null;
  }
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

  const stmt = db.prepare(`
    INSERT INTO analytics_events (
      visitor_id,
      session_id,
      user_id,
      event_type,
      path,
      referrer,
      element,
      text,
      x,
      y,
      scroll_y,
      viewport_w,
      viewport_h,
      metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    visitorId,
    sessionId,
    userId,
    eventType,
    path,
    referrer,
    element,
    text,
    x,
    y,
    scrollY,
    viewportW,
    viewportH,
    metadata,
  );

  return info.lastInsertRowid;
}

// Record a funnel event from the server side when we have a user_id but no visitor_id
export function recordFunnelEvent(db, eventType, userId, extra = {}) {
  return recordAnalyticsEvent(db, {
    visitor_id: `server:user:${userId}`,
    session_id: null,
    event_type: 'funnel',
    path: '/api',
    user_id: userId,
    text: eventType,
    metadata: { step: eventType, ...extra },
  });
}

export function getAnalyticsSummary(db, { hours = 12, path } = {}) {
  const normalizedHours = clamp(toInt(hours, 12), 1, 720);
  const sinceExpr = `datetime('now', '-${normalizedHours} hours')`;
  const pathFilter = path ? normalizeText(path, 255) : '';
  const wherePath = pathFilter ? 'AND path = ?' : '';
  const bindPath = pathFilter ? [pathFilter] : [];

  const totalEvents = db.prepare(`
    SELECT COUNT(*) as count
    FROM analytics_events
    WHERE created_at >= ${sinceExpr}
    ${wherePath}
  `).get(...bindPath).count;

  const uniqueVisitors = db.prepare(`
    SELECT COUNT(DISTINCT visitor_id) as count
    FROM analytics_events
    WHERE created_at >= ${sinceExpr}
    ${wherePath}
  `).get(...bindPath).count;

  const eventTypes = db.prepare(`
    SELECT event_type as type, COUNT(*) as count
    FROM analytics_events
    WHERE created_at >= ${sinceExpr}
    ${wherePath}
    GROUP BY event_type
    ORDER BY count DESC, type ASC
  `).all(...bindPath);

  const topPages = db.prepare(`
    SELECT path, COUNT(*) as count
    FROM analytics_events
    WHERE created_at >= ${sinceExpr}
    ${wherePath}
    GROUP BY path
    ORDER BY count DESC, path ASC
    LIMIT 10
  `).all(...bindPath);

  const timeline = db.prepare(`
    SELECT strftime('%Y-%m-%d %H:00', created_at) as hour, COUNT(*) as count
    FROM analytics_events
    WHERE created_at >= ${sinceExpr}
    ${wherePath}
    GROUP BY hour
    ORDER BY hour ASC
  `).all(...bindPath);

  return {
    hours: normalizedHours,
    total_events: totalEvents,
    unique_visitors: uniqueVisitors,
    event_types: eventTypes,
    top_pages: topPages,
    timeline,
  };
}

export function getHeatmapData(db, { path, hours = 24, gridSize = 24, viewport } = {}) {
  const normalizedHours = clamp(toInt(hours, 24), 1, 720);
  const normalizedGrid = clamp(toInt(gridSize, 24), 4, 120);
  const targetPath = normalizeText(path, 255) || '/';

  let viewportFilter = '';
  let bindParams = [normalizedGrid, normalizedGrid, normalizedGrid, normalizedGrid, targetPath];
  if (viewport === 'desktop') {
    viewportFilter = 'AND viewport_w >= 1024';
  } else if (viewport === 'mobile') {
    viewportFilter = 'AND viewport_w < 768';
  }

  return db.prepare(`
    SELECT
      CAST(ROUND(x / ?) * ? AS INTEGER) AS x,
      CAST(ROUND(y / ?) * ? AS INTEGER) AS y,
      COUNT(*) AS count
    FROM analytics_events
    WHERE event_type = 'click'
      AND path = ?
      AND created_at >= datetime('now', '-${normalizedHours} hours')
      AND x IS NOT NULL
      AND y IS NOT NULL
      ${viewportFilter}
    GROUP BY 1, 2
    ORDER BY count DESC, x ASC, y ASC
  `).all(...bindParams);
}

export function getScrollDepthData(db, { hours = 24, path } = {}) {
  const normalizedHours = clamp(toInt(hours, 24), 1, 720);
  const pathFilter = path ? normalizeText(path, 255) : '';
  const wherePath = pathFilter ? 'AND path = ?' : '';
  const bindPath = pathFilter ? [pathFilter] : [];

  // Get all scroll events with their percent buckets
  const rows = db.prepare(`
    SELECT
      json_extract(metadata, '$.bucket') AS bucket,
      COUNT(*) AS count
    FROM analytics_events
    WHERE event_type = 'scroll'
      AND created_at >= datetime('now', '-${normalizedHours} hours')
      AND metadata IS NOT NULL
      ${wherePath}
    GROUP BY bucket
    ORDER BY CAST(bucket AS INTEGER) ASC
  `).all(...bindPath);

  return rows.map(r => ({
    bucket: Number(r.bucket) || 0,
    count: r.count,
  }));
}

export function getMouseHeatmapData(db, { hours = 24, path, gridSize = 32, viewport } = {}) {
  const normalizedHours = clamp(toInt(hours, 24), 1, 720);
  const normalizedGrid = clamp(toInt(gridSize, 32), 4, 120);
  const targetPath = normalizeText(path, 255) || '';

  let viewportFilter = '';
  let bindPath = [];
  if (viewport === 'desktop') {
    viewportFilter = 'AND viewport_w >= 1024';
  } else if (viewport === 'mobile') {
    viewportFilter = 'AND viewport_w < 768';
  }

  let rows;
  if (targetPath) {
    rows = db.prepare(`
      SELECT
        CAST(ROUND(x / ?) * ? AS INTEGER) AS x,
        CAST(ROUND(y / ?) * ? AS INTEGER) AS y,
        COUNT(*) AS count
      FROM analytics_events
      WHERE event_type = 'mousemove'
        AND path = ?
        AND created_at >= datetime('now', '-${normalizedHours} hours')
        AND x IS NOT NULL
        AND y IS NOT NULL
        ${viewportFilter}
      GROUP BY 1, 2
      ORDER BY count DESC, x ASC, y ASC
    `).all(normalizedGrid, normalizedGrid, normalizedGrid, normalizedGrid, targetPath, ...bindPath);
  } else {
    rows = db.prepare(`
      SELECT
        CAST(ROUND(x / ?) * ? AS INTEGER) AS x,
        CAST(ROUND(y / ?) * ? AS INTEGER) AS y,
        path,
        COUNT(*) AS count
      FROM analytics_events
      WHERE event_type = 'mousemove'
        AND created_at >= datetime('now', '-${normalizedHours} hours')
        AND x IS NOT NULL
        AND y IS NOT NULL
        ${viewportFilter}
      GROUP BY 1, 2, path
      ORDER BY count DESC, x ASC, y ASC
    `).all(normalizedGrid, normalizedGrid, normalizedGrid, normalizedGrid, ...bindPath);
  }
  return rows;
}

export function getRageClickData(db, { hours = 24, path } = {}) {
  const normalizedHours = clamp(toInt(hours, 24), 1, 720);
  const pathFilter = path ? normalizeText(path, 255) : '';
  const wherePath = pathFilter ? 'AND path = ?' : '';
  const bindPath = pathFilter ? [pathFilter] : [];

  return db.prepare(`
    SELECT
      element,
      text,
      path,
      COUNT(*) AS count,
      MAX(created_at) AS last_seen
    FROM analytics_events
    WHERE event_type = 'rageclick'
      AND created_at >= datetime('now', '-${normalizedHours} hours')
      ${wherePath}
    GROUP BY element, text, path
    ORDER BY count DESC
    LIMIT 30
  `).all(...bindPath);
}

export function getSessionAnalytics(db, { hours = 24 } = {}) {
  const normalizedHours = clamp(toInt(hours, 24), 1, 720);

  // Count sessions (unique visitor+session combos)
  const sessionCount = db.prepare(`
    SELECT COUNT(*) as count
    FROM (
      SELECT visitor_id, session_id
      FROM analytics_events
      WHERE created_at >= datetime('now', '-${normalizedHours} hours')
        AND session_id IS NOT NULL
        AND session_id != ''
      GROUP BY visitor_id, session_id
    )
  `).get().count;

  // Average pages per session
  const pagesPerSession = db.prepare(`
    SELECT
      AVG(page_count) AS avg_pages,
      MAX(page_count) AS max_pages,
      MIN(page_count) AS min_pages
    FROM (
      SELECT
        visitor_id,
        session_id,
        COUNT(DISTINCT path) AS page_count
      FROM analytics_events
      WHERE created_at >= datetime('now', '-${normalizedHours} hours')
        AND session_id IS NOT NULL
        AND session_id != ''
      GROUP BY visitor_id, session_id
    )
  `).get();

  // Average session duration (using first and last event timestamps per session)
  const sessionDuration = db.prepare(`
    SELECT
      AVG(duration_secs) AS avg_duration_secs,
      MAX(duration_secs) AS max_duration_secs
    FROM (
      SELECT
        visitor_id,
        session_id,
        CAST(
          (julianday(MAX(created_at)) - julianday(MIN(created_at))) * 86400 AS INTEGER
        ) AS duration_secs
      FROM analytics_events
      WHERE created_at >= datetime('now', '-${normalizedHours} hours')
        AND session_id IS NOT NULL
        AND session_id != ''
      GROUP BY visitor_id, session_id
      HAVING duration_secs > 0
    )
  `).get();

  return {
    total_sessions: sessionCount,
    avg_pages_per_session: Math.round((pagesPerSession?.avg_pages || 0) * 10) / 10,
    max_pages_per_session: pagesPerSession?.max_pages || 0,
    avg_session_duration_secs: Math.round((sessionDuration?.avg_duration_secs || 0)),
    max_session_duration_secs: sessionDuration?.max_duration_secs || 0,
  };
}

export function storeAnalyticsReport(db, { reportType, periodStart, periodEnd, summary }) {
  const type = normalizeText(reportType, 64);
  const start = normalizeText(periodStart, 64);
  const end = normalizeText(periodEnd, 64);
  const summaryJson = safeJson(summary);
  if (!type || !start || !end || !summaryJson) return null;

  const info = db.prepare(`
    INSERT INTO analytics_reports (report_type, period_start, period_end, summary_json)
    VALUES (?, ?, ?, ?)
  `).run(type, start, end, summaryJson);

  return info.lastInsertRowid;
}
