import {
  getAnalyticsSummary,
  getHeatmapData,
  getMouseHeatmapData,
  getRageClickData,
  getScrollDepthData,
  getSessionAnalytics,
} from './openclaw-analytics.js';
import { getLatestOpenClawReport } from './openclaw-reports.js';
import { getProjectStatus } from './agent-project-tools.js';

function toInt(value, fallback = 0) {
  const num = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(num) ? num : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function uniq(items) {
  return [...new Set(items.filter(Boolean))];
}

function eventCount(summary, type) {
  const row = (summary?.event_types || []).find((item) => item.type === type);
  return Number(row?.count || 0);
}

function topItems(items, limit = 5) {
  return [...(items || [])]
    .map((item) => ({ ...item, count: Number(item.count || 0) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function buildFunnelBreakdown(db, { hours = 24, path = '' } = {}) {
  const safeHours = clamp(toInt(hours, 24), 1, 720);
  const targetPath = String(path || '').trim();
  const wherePath = targetPath ? 'AND path = ?' : '';
  const bindPath = targetPath ? [targetPath] : [];

  const steps = db.prepare(`
    SELECT
      COALESCE(json_extract(metadata, '$.step'), text, 'unknown') AS step,
      COUNT(*) AS count,
      COUNT(DISTINCT COALESCE(user_id, visitor_id)) AS actors,
      MAX(created_at) AS last_seen
    FROM analytics_events
    WHERE event_type = 'funnel'
      AND created_at >= datetime('now', '-' || ? || ' hours')
      ${wherePath}
    GROUP BY step
    ORDER BY count DESC, step ASC
  `).all(safeHours, ...bindPath);

  const ordered = [
    'session_start',
    'registration_start',
    'registration_complete',
    'topup_start',
    'topup_complete',
    'subscription_start',
    'subscription_complete',
  ];

  const byStep = Object.fromEntries(steps.map((row) => [row.step, row]));
  const orderedSteps = ordered
    .filter((step) => byStep[step])
    .map((step) => byStep[step])
    .concat(steps.filter((row) => !ordered.includes(row.step)));

  const first = Number(orderedSteps[0]?.actors || orderedSteps[0]?.count || 0);
  const withConversion = orderedSteps.map((row) => ({
    ...row,
    count: Number(row.count || 0),
    actors: Number(row.actors || 0),
    conversion_from_first: first > 0 ? Math.round((Number(row.actors || row.count || 0) / first) * 1000) / 10 : null,
  }));

  return { hours: safeHours, path: targetPath, steps: withConversion };
}

function deriveSignals({ summary, selectedPath, heatmap, mouseHeatmap, rageClicks, scrollDepth, sessions, funnel }) {
  const pageviews = eventCount(summary, 'pageview');
  const clicks = eventCount(summary, 'click');
  const scrolls = eventCount(summary, 'scroll');
  const rageTotal = (rageClicks || []).reduce((sum, item) => sum + Number(item.count || 0), 0);
  const clickRate = pageviews > 0 ? Math.round((clicks / pageviews) * 1000) / 10 : null;
  const maxScrollBucket = Math.max(0, ...(scrollDepth || []).filter((row) => Number(row.count || 0) > 0).map((row) => Number(row.bucket || 0)));
  const hotClick = topItems(heatmap, 1)[0] || null;
  const hotMouse = topItems(mouseHeatmap, 1)[0] || null;
  const issues = [];

  if (pageviews > 20 && clicks < Math.max(3, Math.round(pageviews * 0.08))) {
    issues.push({
      severity: 'high',
      area: selectedPath || 'site',
      signal: `Низкая кликабельность: ${clicks} кликов на ${pageviews} pageview (${clickRate}%).`,
      action: 'Проверить первый экран, сделать главный CTA визуально сильнее и сократить путь до оплаты/моделей.',
    });
  }

  if (scrolls > 10 && maxScrollBucket > 0 && maxScrollBucket < 50) {
    issues.push({
      severity: 'medium',
      area: selectedPath || 'site',
      signal: `Пользователи почти не доходят ниже ${maxScrollBucket}% страницы.`,
      action: 'Поднять ключевые выгоды, цены и вход в сценарий выше первого экрана.',
    });
  }

  if (rageTotal > 0) {
    issues.push({
      severity: rageTotal >= 5 ? 'high' : 'medium',
      area: topItems(rageClicks, 1)[0]?.path || selectedPath || 'site',
      signal: `Найдено ${rageTotal} rage-click событий.`,
      action: 'Проверить кликабельность элементов, disabled states, задержки API и ложные интерактивные зоны.',
    });
  }

  const steps = funnel?.steps || [];
  const registration = steps.find((row) => row.step === 'registration_complete');
  const payment = steps.find((row) => row.step === 'topup_complete' || row.step === 'subscription_complete');
  if (steps.length > 1 && registration && registration.conversion_from_first != null && registration.conversion_from_first < 35) {
    issues.push({
      severity: 'high',
      area: 'funnel',
      signal: `Регистрация доходит только до ${registration.conversion_from_first}% от первого шага воронки.`,
      action: 'Упростить форму, добавить социальное доказательство рядом с регистрацией и проверить ошибки в auth API.',
    });
  }
  if (registration && !payment) {
    issues.push({
      severity: 'medium',
      area: 'billing',
      signal: 'Есть регистрация, но в периоде нет завершённых пополнений или подписок.',
      action: 'Проверить видимость тарифов после регистрации, бонусный баланс и подсказки к первому платежу.',
    });
  }

  return {
    health: issues.some((issue) => issue.severity === 'high') ? 'needs_attention' : issues.length ? 'watch' : 'stable',
    metrics: {
      pageviews,
      clicks,
      click_rate_percent: clickRate,
      scroll_events: scrolls,
      max_scroll_bucket: maxScrollBucket,
      rage_clicks: rageTotal,
      sessions: Number(sessions?.total_sessions || 0),
      avg_pages_per_session: Number(sessions?.avg_pages_per_session || 0),
    },
    hotspots: {
      click: hotClick,
      mouse: hotMouse,
    },
    issues,
  };
}

export function buildOpenClawContext(db, { hours = 24, path = '', includeProject = false } = {}) {
  const safeHours = clamp(toInt(hours, 24), 1, 720);
  const selectedPath = String(path || '').trim();
  const summary = getAnalyticsSummary(db, { hours: safeHours, path: selectedPath || undefined });
  const targetPath = selectedPath || summary.top_pages?.[0]?.path || '/';
  const selectedSummary = targetPath ? getAnalyticsSummary(db, { hours: safeHours, path: targetPath }) : summary;
  const heatmap = getHeatmapData(db, { path: targetPath, hours: safeHours, gridSize: 24 }).slice(0, 20);
  const mouseHeatmap = getMouseHeatmapData(db, { path: targetPath, hours: safeHours, gridSize: 32 }).slice(0, 20);
  const rageClicks = getRageClickData(db, { hours: safeHours, path: selectedPath }).slice(0, 10);
  const scrollDepth = getScrollDepthData(db, { hours: safeHours, path: targetPath });
  const sessions = getSessionAnalytics(db, { hours: safeHours });
  const funnel = buildFunnelBreakdown(db, { hours: safeHours });
  const comparePaths = uniq([targetPath, '/', '/models', '/pricing', '/demo', ...(summary.top_pages || []).map((row) => row.path)]).slice(0, 8);
  const compare = comparePaths.map((itemPath) => {
    const itemSummary = getAnalyticsSummary(db, { hours: safeHours, path: itemPath });
    return {
      path: itemPath,
      pageviews: eventCount(itemSummary, 'pageview'),
      clicks: eventCount(itemSummary, 'click'),
      rageclicks: eventCount(itemSummary, 'rageclick'),
      visitors: itemSummary.unique_visitors,
      total_events: itemSummary.total_events,
    };
  });
  const latestReport = getLatestOpenClawReport(db, `openclaw_${safeHours}h`) || getLatestOpenClawReport(db, 'openclaw_12h');
  const signals = deriveSignals({
    summary,
    selectedPath: targetPath,
    heatmap,
    mouseHeatmap,
    rageClicks,
    scrollDepth,
    sessions,
    funnel,
  });

  return {
    generated_at: new Date().toISOString(),
    hours: safeHours,
    requested_path: selectedPath,
    analyzed_path: targetPath,
    summary,
    selected_summary: selectedSummary,
    compare,
    heatmap: {
      click_points: heatmap,
      mouse_points: mouseHeatmap,
      scroll_depth: scrollDepth,
      rage_clicks: rageClicks,
    },
    sessions,
    funnel,
    signals,
    latest_report: latestReport ? {
      id: latestReport.id,
      report_type: latestReport.report_type,
      created_at: latestReport.created_at,
      recommendations: latestReport.summary?.recommendations || [],
    } : null,
    project: includeProject ? getProjectStatus() : undefined,
  };
}

export function buildOpenClawActionPlan(context) {
  const issues = context?.signals?.issues || [];
  if (!issues.length) {
    return [{
      priority: 'normal',
      title: 'Запустить продуктовый эксперимент',
      reason: 'Критичных UX-сигналов за период не найдено.',
      next_step: 'Сравнить два варианта первого CTA и измерить click_rate_percent через OpenClaw.',
    }];
  }

  return issues.map((issue, index) => ({
    priority: issue.severity === 'high' ? 'urgent' : 'normal',
    title: `${index + 1}. ${issue.area}: ${issue.signal}`,
    reason: issue.signal,
    next_step: issue.action,
  }));
}

export function buildOpenClawAgentMessage(message, context) {
  const compactContext = JSON.stringify({
    generated_at: context.generated_at,
    hours: context.hours,
    analyzed_path: context.analyzed_path,
    metrics: context.signals?.metrics,
    health: context.signals?.health,
    issues: context.signals?.issues,
    compare: context.compare,
    funnel: context.funnel,
    hotspots: context.signals?.hotspots,
    latest_report: context.latest_report,
  }, null, 2);

  return [
    'OpenClaw context snapshot. Используй эти данные как факты, а не как подсказку.',
    'Если видишь продуктовую или техническую проблему, предложи конкретный фикс. Если нужно править код, используй инструменты проекта.',
    '',
    compactContext,
    '',
    `Запрос администратора: ${message}`,
  ].join('\n');
}

export function shouldAttachOpenClawContext(message) {
  const text = String(message || '').toLowerCase();
  return [
    'openclaw',
    'аналитик',
    'аналитика',
    'поведен',
    'пользовател',
    'клик',
    'скролл',
    'воронк',
    'heatmap',
    'rage',
    'конверси',
    'метрик',
  ].some((needle) => text.includes(needle));
}
