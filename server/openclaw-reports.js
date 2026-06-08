import { getAnalyticsSummary, getHeatmapData, storeAnalyticsReport } from './openclaw-analytics.js'

function pluralizeRu(count, one, few, many) {
  const n = Math.abs(Number(count) || 0) % 100
  const n1 = n % 10
  if (n > 10 && n < 20) return many
  if (n1 > 1 && n1 < 5) return few
  if (n1 === 1) return one
  return many
}

function pickTop(items, limit = 3) {
  return [...(items || [])]
    .map((item) => ({ ...item, count: Number(item.count || 0) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export function buildOpenClawReport(db, { hours = 12, path = '/' } = {}) {
  const summary = getAnalyticsSummary(db, { hours, path })
  const heatmap = getHeatmapData(db, { path, hours: Math.max(24, hours), gridSize: 24 })
  const topPages = pickTop(summary.top_pages, 5)
  const eventTypes = Object.fromEntries((summary.event_types || []).map((row) => [row.type, Number(row.count || 0)]))
  const clicks = eventTypes.click || 0
  const pageviews = eventTypes.pageview || 0
  const scrolls = eventTypes.scroll || 0
  const topHeat = [...heatmap].sort((a, b) => Number(b.count || 0) - Number(a.count || 0))[0] || null

  const recommendations = []

  if (pageviews > 0 && clicks < Math.max(3, Math.round(pageviews * 0.08))) {
    recommendations.push('Упростить первый экран и добавить более заметный CTA: трафик есть, но кликов мало.')
  }

  if (scrolls > 0 && scrolls < Math.max(3, Math.round(pageviews * 0.25))) {
    recommendations.push('Добавить явные якоря и более короткие блоки: пользователи не доходят до нижней части страницы.')
  }

  if (topPages.length > 3) {
    recommendations.push('Сфокусировать homepage на 3 главных сценариях: сейчас трафик размазан по нескольким страницам.')
  }

  if (topHeat && Number(topHeat.count || 0) >= 5) {
    recommendations.push(`Самый горячий участок страницы находится в зоне ${topHeat.x}, ${topHeat.y}; стоит проверить там call-to-action или конфликтующий контент.`)
  }

  if (recommendations.length === 0) {
    recommendations.push('Поведение выглядит ровным. OpenClaw может усилить экспериментами с текстом CTA и визуальным акцентом на первом экране.')
  }

  return {
    generated_at: new Date().toISOString(),
    hours: Number(hours || 12),
    path,
    summary,
    heatmap_points: heatmap,
    recommendations,
    highlights: [
      `${summary.unique_visitors || 0} ${pluralizeRu(summary.unique_visitors || 0, 'посетитель', 'посетителя', 'посетителей')}`,
      `${summary.total_events || 0} ${pluralizeRu(summary.total_events || 0, 'событие', 'события', 'событий')}`,
      `${clicks} ${pluralizeRu(clicks, 'клик', 'клика', 'кликов')}`,
    ],
  }
}

export function generateAndStoreOpenClawReport(db, options = {}) {
  const report = buildOpenClawReport(db, options)
  const periodEnd = report.generated_at
  const hours = Number(report.hours || 12)
  const periodStart = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
  const reportId = storeAnalyticsReport(db, {
    reportType: `openclaw_${hours}h`,
    periodStart,
    periodEnd,
    summary: report,
  })
  return {
    id: reportId,
    ...report,
  }
}

export function getLatestOpenClawReport(db, reportType = 'openclaw_12h') {
  const row = db.prepare(`
    SELECT *
    FROM analytics_reports
    WHERE report_type = ?
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `).get(reportType)

  if (!row) return null

  try {
    return {
      ...row,
      summary: JSON.parse(row.summary_json),
    }
  } catch {
    return {
      ...row,
      summary: null,
    }
  }
}
