const DEFAULT_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

async function telegramApi(method, payload) {
  if (!DEFAULT_BOT_TOKEN) return null

  const response = await fetch(`https://api.telegram.org/bot${DEFAULT_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.ok === false) {
    console.error(`OpenClaw Telegram ${method} failed`, data)
  }
  return data
}

export async function sendOpenClawTelegramMessage(chatId, text, options = {}) {
  return telegramApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...options,
  })
}

export function getAdminTelegramChats(db) {
  return db.prepare(`
    SELECT telegram_links.telegram_id, users.id as user_id, users.email, users.name
    FROM telegram_links
    JOIN users ON users.id = telegram_links.user_id
    WHERE COALESCE(users.is_admin, 0) = 1
  `).all()
}

function formatCount(value) {
  return new Intl.NumberFormat('ru-RU').format(Number(value || 0))
}

export function formatOpenClawTelegramReport(report) {
  if (!report) return 'OpenClaw отчёт пока недоступен.'

  const summary = report.summary || {}
  const recommendations = Array.isArray(summary.recommendations) ? summary.recommendations : []
  const highlights = Array.isArray(summary.highlights) ? summary.highlights : []
  const reportHours = Number(summary.hours || 12)
  const title = `OpenClaw ${reportHours}h`
  const path = summary.path || '/'
  const generatedAt = summary.generated_at || report.created_at

  const lines = [
    `<b>${title}</b>`,
    `Период: ${reportHours}h`,
    `Path: <code>${path}</code>`,
    `Сгенерировано: ${generatedAt ? new Date(generatedAt).toLocaleString('ru-RU') : 'now'}`,
  ]

  if (highlights.length > 0) {
    lines.push('')
    lines.push('<b>Сводка</b>')
    for (const item of highlights.slice(0, 3)) {
      lines.push(`• ${item}`)
    }
  } else {
    lines.push('')
    lines.push(`Событий: ${formatCount(summary.total_events)}`)
    lines.push(`Посетителей: ${formatCount(summary.unique_visitors)}`)
  }

  if (recommendations.length > 0) {
    lines.push('')
    lines.push('<b>Рекомендации</b>')
    for (const item of recommendations.slice(0, 5)) {
      lines.push(`• ${item}`)
    }
  }

  return lines.join('\n')
}

export async function broadcastOpenClawReportToAdmins(db, report, options = {}) {
  const chats = getAdminTelegramChats(db)
  const text = formatOpenClawTelegramReport(report)
  const messages = []

  for (const chat of chats) {
    messages.push(
      sendOpenClawTelegramMessage(chat.telegram_id, text, {
        ...options,
      }),
    )
  }

  return Promise.all(messages)
}
