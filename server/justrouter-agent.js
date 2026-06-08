// JustRouter AI Agent — LLM-powered assistant with prompt-based tool calling
// Works with MiniMax M3 (no native tool/function calling support)
import { fetch as undiciFetch } from 'undici';
import crypto from 'crypto';
import { agentMemorySearch, agentMemoryRecall, agentMemoryStatus, agentMemoryWrite, storeConversation } from './memory-wrapper.js';
import { buildSkillSystemPrompt, SKILL_TOOLS } from './agent-skills.js';
import { resolveAgentProjectPath } from './agent-file-safety.js';
import { getProjectDiff, getProjectStatus, listProjectCommands, runProjectCommand, searchProject } from './agent-project-tools.js';
import { buildOpenClawActionPlan, buildOpenClawContext } from './openclaw-agent.js';

// ── Configuration ──────────────────────────────────────────────

const AGENT_MAX_TOKENS = Number(process.env.JUSTROUTER_AGENT_MAX_TOKENS || 4096);
const AGENT_TEMPERATURE = Number(process.env.JUSTROUTER_AGENT_TEMPERATURE || 0.4);
const MINIMAX_API_KEY = process.env.JUSTROUTER_MINIMAX_API_KEY;
const MINIMAX_MODEL = process.env.JUSTROUTER_MINIMAX_MODEL || 'minimax-m3';
const MINIMAX_BASE_URL = process.env.JUSTROUTER_MINIMAX_BASE_URL || 'https://api.minimaxi.com';
const OPENROUTER_MODEL = process.env.JUSTROUTER_OPENROUTER_MODEL || 'minimax/minimax-m3';
const CEO_AGENT_MODEL = process.env.JUSTROUTER_CEO_MODEL || (MINIMAX_API_KEY ? MINIMAX_MODEL : OPENROUTER_MODEL);

// ── Tool descriptions for the prompt ────────────────────────────

const TOOL_PROMPT = `
Доступные инструменты (вызывай с помощью metacall):

Для вызова инструмента напиши в ответе:
[metacall]имя_инструмента
аргумент1: значение1
аргумент2: значение2
[/metacall]

Список инструментов:

1. query_db — выполнить SELECT запрос к базе данных.
   Аргументы: sql (строка SQL-запроса, только SELECT)

2. get_user_info — информация о пользователе.
   Аргументы: userId (число) ИЛИ email (строка)

3. list_users — список пользователей.
   Аргументы: limit (число, опционально), search (строка, опционально)

4. get_support_conversations — диалоги техподдержки.
   Аргументы: status (all/active/handoff, опционально), limit (число, опционально)

5. get_conversation_messages — сообщения из диалога.
   Аргументы: conversationId (число, обязательно)

6. reply_to_support — ответить в техподдержку.
   Аргументы: conversationId (число), message (строка)

7. get_analytics_summary — сводка OpenClaw.
   Аргументы: hours (число, опционально), path (строка, опционально)

8. get_latest_report — последний отчёт OpenClaw.

9. get_openclaw_context — полный OpenClaw-снимок: поведение пользователей, heatmap, rage clicks, scroll depth, sessions, funnel, UX-сигналы и план действий.
   Аргументы: hours (число, опционально), path (строка, опционально), includeProject (true/false, опционально)

10. get_finance_stats — финансовая статистика.
   Аргументы: period (24h/7d/30d/all, опционально)

11. get_transactions — транзакции.
    Аргументы: limit (число, опционально), userId (число, опционально)

12. read_project_file — прочитать файл проекта.
    Аргументы: path (строка, путь от корня проекта)

13. list_directory — список файлов в директории.
    Аргументы: path (строка, путь от корня проекта)

14. write_project_file — изменить файл проекта JustRouter. Для задач исправления багов и добавления функций применяй apply: true.
    Аргументы: path (строка, путь от корня проекта), content (строка), apply (true для записи)

15. search_project — поиск точного текста по проекту.
    Аргументы: query (строка), path (опционально: src/server/shared/scripts/docs/.github/workflows), limit

16. replace_in_file — точечно заменить уникальный фрагмент в файле.
    Аргументы: path, search, replacement

17. run_project_command — запустить разрешённую проверочную команду проекта.
    Аргументы: command (lint/lint_quiet/test/test_billing/test_agent_safety/test_openclaw_obsidian/build/migrate_dry_run)

18. get_project_status — git status и diff stat проекта.

19. get_project_diff — посмотреть git diff. Аргументы: file (опционально)

20. adjust_user_balance — изменить баланс пользователя админской корректировкой.
    Аргументы: userId, amount, reason

21. set_user_flag — заблокировать/разблокировать или изменить corporate флаг пользователя.
    Аргументы: userId, flag (banned/corporate), value (true/false)

22. set_model_active — включить/выключить модель.
    Аргументы: modelId, active (true/false)

23. memory_search — поиск по долговременной памяти агента.
    Аргументы: query (строка, поисковый запрос)

24. memory_recall — извлечь контекст из памяти.
    Аргументы: query (строка, что вспомнить)

25. memory_status — статус памяти SQLite + OpenClaw Obsidian vault.

26. memory_write — записать важный факт, решение, задачу или наблюдение в OpenClaw Obsidian vault.
    Аргументы: title, body, folder (notes/conversations/daily/decisions/tasks), tags

27. fetch_url — загрузить содержимое любой веб-страницы по URL.
    Аргументы: url (строка, полный URL страницы)

28. web_search — поиск в интернете. Используй когда нужно найти свежую информацию, документацию, новости.
    Аргументы: query (строка, поисковый запрос)

29. get_config — получить текущие значения конфигурации проекта JustRouter (бонусы, курсы, цены). Не ищи search_project для конфигов — используй этот инструмент!
    Аргументы: нет

ВАЖНО: После получения результата инструмента проанализируй его и дай ответ пользователю. При необходимости вызови несколько инструментов последовательно.

Не используй markdown-форматирование. Пиши обычным текстом без # * _ обратный апостроф > | --- ===.
`;

// ── Agent Instructions ─────────────────────────────────────────

const ADMIN_SYSTEM_PROMPT = buildSkillSystemPrompt() + `\n\nТЫ ПОЛНОПРАВНЫЙ АДМИНИСТРАТОР ПРОЕКТА JUSTROUTER.\nТвои обязанности: анализировать поведение пользователей через OpenClaw, находить проблемы, исправлять баги, добавлять функции, управлять пользователями, моделями и поддержкой, запускать проверки и объяснять результат.\nКогда админ обращается к OpenClaw или спрашивает "ты OpenClaw?", не спорь с формулировкой. Отвечай как OpenClaw-администратор JustRouter: покажи что ты проверил, какие данные открыл, какие инструменты использовал и какой следующий шаг сделал.\nЕсли админ просит исправить баг или добавить функцию, действуй end-to-end: найди код через search_project/list_directory, прочитай файл, внеси точечную правку через replace_in_file или полную запись через write_project_file apply: true, запусти lint/test/build подходящей командой, сообщи что изменил и что проверил.\nНе читай и не изменяй секреты, .env, базы данных, ключи и файлы вне разрешённых директорий. Не запускай произвольный shell: используй только run_project_command.\n\nФОРМАТ ВЫЗОВА ИНСТРУМЕНТОВ (строго соблюдай):\nДля вызова инструмента используй конструкцию:\n[metacall]имя_инструмента\nаргумент: значение\n[/metacall]\n\nПример правильного вызова:\n[metacall]list_users\nlimit: 10\n[/metacall]\n\nЕсли нужно вызвать несколько инструментов последовательно — напиши их один за другим.\n\n${TOOL_PROMPT}`;

const OPENCLAW_SYSTEM_PROMPT = buildSkillSystemPrompt() + `\n\nТЫ OPENCLAW — ПРЯМОЙ АДМИНИСТРАТИВНЫЙ ИНТЕРФЕЙС JUSTROUTER В TELEGRAM.\nТы не говоришь "я не OpenClaw". Для администратора ты OpenClaw: поведенческая аналитика, память, диагностика, action plan и возможность перейти к фиксам через инструменты проекта.\nКаждый ответ начинай с краткого журнала: что открыл, что проверил, какие выводы сделал. Если запрос требует действий, действуй end-to-end через инструменты проекта и проверки.\nНе скрывай работу за фразой "думаю". Администратор должен видеть конкретные шаги.\nНе читай и не изменяй секреты, .env, базы данных, ключи и файлы вне разрешённых директорий.\n\n${TOOL_PROMPT}`;

const CEO_SYSTEM_PROMPT = `Ты — CEO-агент JustRouter. Анализируй отчёты и давай стратегические рекомендации.

Обращай внимание на: рост/падение пользователей, балансы, транзакции, популярность моделей, проблемы поддержки, аномалии.

Отвечай по-русски, будь стратегическим и дальновидным. В ответе дай только анализ и рекомендации. Не используй markdown-форматирование. Не пиши [metacall] блоки. Пиши обычным текстом.`;

// ── Tool Implementations ────────────────────────────────────────

function createToolHandlers(db, sendTelegramFn, dispatcher) {
  return {
    query_db: async ({ sql }) => {
      const s = String(sql || '').trim().toUpperCase();
      if (!s.startsWith('SELECT')) return { error: 'Только SELECT запросы' };
      try { const rows = db.prepare(sql).all(); return { rows, count: rows.length }; }
      catch (e) { return { error: `SQL: ${e.message}` }; }
    },

    get_user_info: async ({ userId, email }) => {
      try {
        let user = userId ? db.prepare('SELECT id, email, name, balance, api_key, created_at FROM users WHERE id = ?').get(userId)
          : email ? db.prepare('SELECT id, email, name, balance, api_key, created_at FROM users WHERE email = ?').get(email) : null;
        return user ? { user } : { error: 'Не найден' };
      } catch (e) { return { error: e.message }; }
    },

    list_users: async ({ limit = 20, search } = {}) => {
      try {
        let sql = 'SELECT id, email, name, balance, created_at FROM users';
        let countSql = 'SELECT COUNT(*) as c FROM users';
        const p = [];
        const countP = [];
        if (search) {
          const filter = ' WHERE (email LIKE ? OR name LIKE ?)';
          sql += filter;
          countSql += filter;
          p.push(`%${search}%`, `%${search}%`);
          countP.push(`%${search}%`, `%${search}%`);
        }
        sql += ' ORDER BY created_at DESC LIMIT ?'; p.push(limit);
        const users = db.prepare(sql).all(...p);
        const total = db.prepare(countSql).get(...countP).c;
        return { users, total, limit };
      } catch (e) { return { error: e.message }; }
    },

    get_support_conversations: async ({ status = 'active', limit = 10 } = {}) => {
      try {
        const view = `SELECT c.*, u.email as user_email, u.name as user_name,
          (SELECT COUNT(*) FROM support_messages m WHERE m.conversation_id = c.id) as message_count,
          (SELECT content FROM support_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) as last_message,
          (SELECT created_at FROM support_messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) as last_message_at
          FROM support_conversations c LEFT JOIN users u ON c.user_id = u.id`;
        let sql;
        if (status === 'handoff') sql = `${view} WHERE c.handoff_to_human = 1`;
        else if (status === 'all') sql = `${view}`;
        else sql = `${view} WHERE c.handoff_to_human = 0`;
        sql += ' ORDER BY COALESCE(last_message_at, c.updated_at) DESC LIMIT ?';
        const conversations = db.prepare(sql).all(limit);
        return { conversations, count: conversations.length };
      } catch (e) { return { error: e.message }; }
    },

    get_conversation_messages: async ({ conversationId }) => {
      try {
        return { messages: db.prepare('SELECT id, role, content, created_at FROM support_messages WHERE conversation_id = ? ORDER BY id ASC').all(conversationId) };
      } catch (e) { return { error: e.message }; }
    },

    reply_to_support: async ({ conversationId, message }) => {
      try {
        const r = db.prepare("INSERT INTO support_messages (conversation_id, role, content, admin_user_id, created_at) VALUES (?, 'admin', ?, 0, datetime('now'))").run(conversationId, message);
        db.prepare("UPDATE support_conversations SET updated_at = datetime('now'), handoff_to_human = 0 WHERE id = ?").run(conversationId);
        return { ok: true, messageId: r.lastInsertRowid };
      } catch (e) { return { error: e.message }; }
    },

    get_analytics_summary: async ({ hours = 24, path = '' } = {}) => {
      try {
        // Sanitize hours to prevent SQL injection
        const safeHours = Math.max(1, Math.min(8760, Number(hours) || 24));
        const events = db.prepare(`SELECT * FROM analytics_events WHERE created_at >= datetime('now', '-' || ? || ' hours')${path ? ' AND path = ?' : ''} ORDER BY created_at DESC`).all(safeHours, ...(path ? [path] : []));
        const pageviews = events.filter(e => e.event_type === 'pageview');
        const visitors = new Set(pageviews.map(e => `${e.visitor_id || e.session_id}:${e.path}`));
        return { period: `${safeHours}h`, path, events_count: events.length, unique_visitors: visitors.size, clicks: events.filter(e => e.event_type === 'click').length, pageviews: pageviews.length };
      } catch (e) { return { error: e.message }; }
    },

    get_latest_report: async () => {
      try {
        const r = db.prepare('SELECT * FROM analytics_reports ORDER BY created_at DESC LIMIT 1').get();
        if (!r) return { error: 'Нет отчётов' };
        let sum = r.summary_json;
        try { sum = typeof sum === 'string' ? JSON.parse(sum) : sum; } catch {}
        return { id: r.id, report_type: r.report_type, created_at: r.created_at, summary: sum };
      } catch (e) { return { error: e.message }; }
    },

    get_openclaw_context: async ({ hours = 24, path = '', includeProject = false } = {}) => {
      try {
        const context = buildOpenClawContext(db, {
          hours,
          path,
          includeProject: includeProject === true || includeProject === 'true',
        });
        return {
          context,
          action_plan: buildOpenClawActionPlan(context),
        };
      } catch (e) { return { error: e.message }; }
    },

    get_finance_stats: async ({ period = 'all' } = {}) => {
      try {
        const f = period === '24h' ? "AND created_at >= datetime('now', '-1 day')" : period === '7d' ? "AND created_at >= datetime('now', '-7 days')" : period === '30d' ? "AND created_at >= datetime('now', '-30 days')" : '';
        const t = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
        const b = db.prepare('SELECT COALESCE(SUM(balance), 0) as t FROM users').get().t;
        const top = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM transactions WHERE type IN ('topup','user_payment') ${f}`).get();
        const nu = db.prepare(`SELECT COUNT(*) as count FROM users WHERE 1=1 ${f}`).get();
        return { total_users: t, total_balance_rub: b, topups_total_rub: top.total, topups_count: top.count, new_users_in_period: nu.count, period };
      } catch (e) { return { error: e.message }; }
    },

    get_transactions: async ({ limit = 20, userId } = {}) => {
      try {
        let sql = 'SELECT * FROM transactions'; const p = [];
        if (userId) { sql += ' WHERE user_id = ?'; p.push(userId); }
        sql += ' ORDER BY created_at DESC LIMIT ?'; p.push(limit);
        return { transactions: db.prepare(sql).all(...p) };
      } catch (e) { return { error: e.message }; }
    },

    read_project_file: async ({ path, startLine, endLine }) => {
      try {
        const fs = await import('fs');
        const { absolutePath, relativePath } = resolveAgentProjectPath(path);
        if (!fs.existsSync(absolutePath)) return { error: 'Файл не найден' };
        const c = fs.readFileSync(absolutePath, 'utf-8');
        if (startLine || endLine) {
          const lines = c.split('\n');
          const start = Math.max(1, Number(startLine) || 1);
          const end = Math.min(lines.length, Number(endLine) || start + 120);
          const content = lines.slice(start - 1, end).map((line, idx) => `${start + idx}: ${line}`).join('\n');
          return { path: relativePath, size: fs.statSync(absolutePath).size, start_line: start, end_line: end, content };
        }
        return { path: relativePath, size: fs.statSync(absolutePath).size, content: c.substring(0, 20000), truncated: c.length > 20000 };
      } catch (e) { return { error: `Ошибка: ${e.message}` }; }
    },

    list_directory: async ({ path = '.' } = {}) => {
      try {
        const fs = await import('fs');
        const { join } = await import('path');
        const { absolutePath, relativePath } = resolveAgentProjectPath(path);
        const entries = fs.readdirSync(absolutePath, { withFileTypes: true });
        return { path: relativePath, files: entries.map(e => ({ name: e.name, type: e.isDirectory() ? 'dir' : 'file', size: e.isFile() ? fs.statSync(join(absolutePath, e.name)).size : null })) };
      } catch (e) { return { error: `Ошибка: ${e.message}` }; }
    },

    write_project_file: async ({ path, content, apply = false }) => {
      if (!path) return { error: 'Укажите path' };
      if (content === undefined || content === null) return { error: 'Укажите content' };
      try {
        const fs = await import('fs');
        const { dirname } = await import('path');
        const { absolutePath, relativePath } = resolveAgentProjectPath(path, { write: true });
        if (!apply) {
          return {
            ok: true,
            draft: true,
            path: relativePath,
            size: String(content).length,
            message: 'Черновик подготовлен. Для записи на диск админ должен явно повторить команду с apply: true.',
            preview: String(content).slice(0, 4000),
          };
        }
        const dir = dirname(absolutePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(absolutePath, String(content), 'utf-8');
        const stats = fs.statSync(absolutePath);
        return { ok: true, applied: true, path: relativePath, size: stats.size };
      } catch (e) { return { error: `Ошибка записи: ${e.message}` }; }
    },

    search_project: async ({ query, path, limit } = {}) => {
      return searchProject({ query, path, limit });
    },

    replace_in_file: async ({ path, search, replacement }) => {
      if (!path) return { error: 'Укажите path' };
      if (!search) return { error: 'Укажите search' };
      if (replacement === undefined || replacement === null) return { error: 'Укажите replacement' };
      try {
        const fs = await import('fs');
        const { absolutePath, relativePath } = resolveAgentProjectPath(path, { write: true });
        if (!fs.existsSync(absolutePath)) return { error: 'Файл не найден' };
        const before = fs.readFileSync(absolutePath, 'utf-8');
        const matches = before.split(String(search)).length - 1;
        if (matches === 0) return { error: 'Фрагмент search не найден' };
        if (matches > 1) return { error: `Фрагмент search найден ${matches} раз. Уточните уникальный фрагмент.` };
        const after = before.replace(String(search), String(replacement));
        fs.writeFileSync(absolutePath, after, 'utf-8');
        return { ok: true, path: relativePath, replacements: 1, size: after.length };
      } catch (e) { return { error: `Ошибка замены: ${e.message}` }; }
    },

    run_project_command: async ({ command, timeoutMs } = {}) => {
      if (!command) return { error: `Укажите command. Доступно: ${listProjectCommands().join(', ')}` };
      return runProjectCommand(command, { timeoutMs });
    },

    get_project_status: async () => {
      return getProjectStatus();
    },

    get_project_diff: async ({ file } = {}) => {
      return getProjectDiff({ file });
    },

    adjust_user_balance: async ({ userId, amount, reason }) => {
      const uid = Number(userId);
      const value = Number(amount);
      if (!Number.isInteger(uid) || uid <= 0) return { error: 'Некорректный userId' };
      if (!Number.isFinite(value) || value === 0) return { error: 'amount должен быть ненулевым числом' };
      const user = db.prepare('SELECT id, email, balance FROM users WHERE id = ?').get(uid);
      if (!user) return { error: 'Пользователь не найден' };
      const tx = db.transaction(() => {
        db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(value, uid);
        db.prepare(`
          INSERT INTO transactions (type, user_id, amount, description)
          VALUES ('admin_adjustment', ?, ?, ?)
        `).run(uid, value, reason || 'AI admin adjustment');
        return db.prepare('SELECT id, email, balance, bonus_balance FROM users WHERE id = ?').get(uid);
      });
      return { ok: true, user: tx() };
    },

    set_user_flag: async ({ userId, flag, value }) => {
      const uid = Number(userId);
      const allowed = new Set(['banned', 'corporate']);
      if (!Number.isInteger(uid) || uid <= 0) return { error: 'Некорректный userId' };
      if (!allowed.has(flag)) return { error: 'flag должен быть banned или corporate' };
      const next = value === true || value === 'true' || value === 1 || value === '1' ? 1 : 0;
      const info = db.prepare(`UPDATE users SET ${flag} = ? WHERE id = ?`).run(next, uid);
      return { ok: info.changes > 0, userId: uid, flag, value: Boolean(next) };
    },

    set_model_active: async ({ modelId, active }) => {
      const id = String(modelId || '').trim();
      if (!id) return { error: 'Укажите modelId' };
      const next = active === true || active === 'true' || active === 1 || active === '1' ? 1 : 0;
      const info = db.prepare('UPDATE models SET is_active = ? WHERE id = ?').run(next, id);
      return { ok: info.changes > 0, modelId: id, active: Boolean(next) };
    },

    send_telegram_message: async ({ chatId, message }) => {
      try {
        if (sendTelegramFn) { await sendTelegramFn(chatId, message); return { ok: true }; }
        return { error: 'Не инициализирована' };
      } catch (e) { return { error: e.message }; }
    },

    memory_search: async ({ query }) => {
      if (!query) return { error: 'Укажите query' };
      return agentMemorySearch(query);
    },

    memory_recall: async ({ query }) => {
      if (!query) return { error: 'Укажите query' };
      return agentMemoryRecall(query);
    },

    memory_status: async () => {
      return agentMemoryStatus();
    },

    memory_write: async ({ title, body, folder = 'notes', tags = [] } = {}) => {
      if (!title) return { error: 'Укажите title' };
      if (!body) return { error: 'Укажите body' };
      return agentMemoryWrite({ title, body, folder, tags });
    },

    fetch_url: async ({ url }) => {
      if (!url) return { error: 'Укажите url' };
      try {
        const response = await undiciFetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JustRouterBot/1.0; +https://justrouter.ru)' },
          dispatcher,
        });
        const contentType = response.headers.get('content-type') || '';
        let text;
        if (contentType.includes('application/json')) {
          text = JSON.stringify(await response.json(), null, 2);
        } else {
          text = await response.text();
          // Strip HTML tags
          text = text.replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
        return { url, content: text.substring(0, 15000), truncated: text.length > 15000, content_type: contentType };
      } catch (e) { return { error: `Ошибка загрузки: ${e.message}` }; }
    },

    web_search: async ({ query }) => {
      if (!query) return { error: 'Укажите query' };
      try {
        // Use DuckDuckGo Instant Answer API
        const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
        const response = await undiciFetch(searchUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JustRouterBot/1.0; +https://justrouter.ru)' },
          dispatcher,
        });
        const data = await response.json();

        const results = [];
        // Abstract/Answer
        if (data.AbstractText) {
          results.push({ type: 'abstract', text: data.AbstractText, source: data.AbstractSource });
        }
        // Related topics
        if (data.RelatedTopics) {
          for (const topic of data.RelatedTopics.slice(0, 8)) {
            if (topic.Text) results.push({ type: 'result', text: topic.Text, url: topic.FirstURL });
            if (topic.Topics) {
              for (const sub of topic.Topics.slice(0, 3)) {
                if (sub.Text) results.push({ type: 'result', text: sub.Text, url: sub.FirstURL });
              }
            }
          }
        }
        // If no results from DuckDuckGo, try a fallback search
        if (results.length === 0) {
          const fallbackUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
          const fbResponse = await undiciFetch(fallbackUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; JustRouterBot/1.0)' },
            dispatcher,
          });
          const html = await fbResponse.text();
          // Extract result links
          const linkMatches = html.matchAll(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g);
          let count = 0;
          for (const m of linkMatches) {
            if (m[1] && !m[1].startsWith('/') && count < 10) {
              results.push({ type: 'link', text: m[2].trim(), url: m[1] });
              count++;
            }
          }
        }

        return { query, results, count: results.length };
      } catch (e) { return { error: `Ошибка поиска: ${e.message}` }; }
    },

    get_config: async (args) => {
      const config = {
        registration_bonus_rub: Number(process.env.REGISTRATION_BONUS_RUB || 0),
        registration_bonus_days: Number(process.env.REGISTRATION_BONUS_DAYS || 7),
        referral_bonus_rub: Number(process.env.REFERRAL_BONUS_RUB || 0),
        price_multiplier: Number(process.env.PRICE_MULTIPLIER || 3),
        usd_to_rub: Number(process.env.USD_TO_RUB || 80),
        site_url: process.env.SITE_URL || 'https://justrouter.ru',
        low_balance_threshold: Number(process.env.LOW_BALANCE_THRESHOLD || 100),
      };
      return config;
    },
  };
}

// ── Parse metacall from model response ──────────────────────────

const METACALL_RE = /\[metacall\]\s*(\w+)\s*\n([\s\S]*?)\[\/metacall\]/gi;

function parseMetaCalls(text) {
  const calls = [];
  const regex = /\[metacall\]\s*(\w+)\s*\n([\s\S]*?)\[\/metacall\]/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const name = match[1];
    const argsBlock = match[2];
    const args = {};
    // Tools that support multi-line content value
    const contentTools = new Set(['write_project_file', 'reply_to_support', 'memory_write']);

    const lines = argsBlock.split('\n');
    let multiLineKey = null;
    let multiLineValue = [];
    let inMultiLine = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (inMultiLine) {
        // Collect everything until closing tag (already excluded)
        multiLineValue.push(line);
        continue;
      }

      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const key = line.slice(0, colonIdx).trim();
        let val = line.slice(colonIdx + 1).trim();

        // If this key supports multi-line and value is empty -> start multi-line mode
        if (contentTools.has(name) && (key === 'content' || key === 'message' || key === 'body') && val === '') {
          inMultiLine = true;
          multiLineKey = key;
          multiLineValue = [];
          continue;
        }

        // Try to parse numbers
        if (/^\d+$/.test(val)) val = Number(val);
        else if (/^\d+\.\d+$/.test(val)) val = Number(val);
        else if (val === 'true') val = true;
        else if (val === 'false') val = false;
        args[key] = val;
      }
    }

    // Flush multi-line content
    if (inMultiLine && multiLineKey) {
      // Remove trailing empty lines
      while (multiLineValue.length > 0 && multiLineValue[multiLineValue.length - 1].trim() === '') {
        multiLineValue.pop();
      }
      args[multiLineKey] = multiLineValue.join('\n');
    }

    calls.push({ name, args });
  }
  return calls;
}

function removeMetaCalls(text) {
  return text.replace(METACALL_RE, '').trim();
}

// ── Markdown Stripper ──────────────────────────────────────────

function stripMarkdown(text) {
  if (!text) return text;
  return text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^>\s+/gm, '')
    .replace(/^[-=]{3,}$/gm, '')
    .replace(/^\|[\s-:|]+\|$/gm, '')
    .replace(/^\|(.+)\|$/gm, '$1')
    .replace(/\|/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\[metacall\][\s\S]*?\[\/metacall\]/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function htmlEscape(text) {
  if (!text) return text;
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function cleanForTelegram(text) {
  return htmlEscape(stripMarkdown(text));
}

function summarizeTraceResult(toolResult) {
  if (!toolResult) return '';
  if (toolResult.error) return `ошибка: ${toolResult.error}`;
  if (toolResult.ok === false) return `ошибка: ${toolResult.error || toolResult.stderr || 'не выполнено'}`.slice(0, 500);
  if (Array.isArray(toolResult.rows)) return `строк: ${toolResult.rows.length}`;
  if (Array.isArray(toolResult.results)) return `результатов: ${toolResult.results.length}`;
  if (Array.isArray(toolResult.users)) return `пользователей: ${toolResult.users.length}`;
  if (Array.isArray(toolResult.transactions)) return `транзакций: ${toolResult.transactions.length}`;
  if (toolResult.context?.signals?.metrics) {
    const metrics = toolResult.context.signals.metrics;
    return `OpenClaw metrics: pageviews=${metrics.pageviews}, clicks=${metrics.clicks}, rage=${metrics.rage_clicks}`;
  }
  return JSON.stringify(toolResult).slice(0, 500);
}

// ── Conversation Context Management ────────────────────────────

const conversations = new Map();

function getOrCreateConv(userId, systemPrompt) {
  if (!conversations.has(userId)) {
    conversations.set(userId, {
      id: crypto.randomUUID(), userId, systemPrompt,
      messages: [], createdAt: Date.now(), updatedAt: Date.now(),
    });
  }
  return conversations.get(userId);
}

function clearConversation(userId) {
  conversations.delete(userId);
}

function addMsg(userId, role, content) {
  const conv = getOrCreateConv(userId);
  conv.messages.push({ role, content });
  conv.updatedAt = Date.now();
  if (conv.messages.length > 40) conv.messages.splice(0, conv.messages.length - 40);
}

// ── LLM API Call ──────────────────────────────────────────────

async function callLLM({ messages, apiKey, dispatcher, model, maxTokens = AGENT_MAX_TOKENS, temperature = AGENT_TEMPERATURE }) {
  const useDirect = Boolean(MINIMAX_API_KEY);
  const body = {
    model: model || (useDirect ? MINIMAX_MODEL : OPENROUTER_MODEL),
    messages, max_tokens: maxTokens, temperature,
  };

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${useDirect ? MINIMAX_API_KEY : apiKey}` };
  if (!useDirect) { headers['HTTP-Referer'] = 'https://justrouter.ru'; headers['X-Title'] = 'JustRouter Agent'; }

  const response = await undiciFetch(useDirect ? `${MINIMAX_BASE_URL}/v1/chat/completions` : 'https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST', dispatcher, headers, body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || data?.message || 'Ошибка вызова модели');

  const choice = data?.choices?.[0];
  if (!choice) throw new Error('Модель вернула пустой ответ');
  return { message: choice.message, usage: data.usage || {} };
}

// ── Agent Processing (prompt-based tool calling) ─────────────

export async function processAgentMessage({
  userId, text, db, apiKey, dispatcher, sendTelegramFn,
  systemPrompt = ADMIN_SYSTEM_PROMPT, maxRounds = 15,
}) {
  const handlers = createToolHandlers(db, sendTelegramFn, dispatcher);
  const conv = getOrCreateConv(userId, systemPrompt);
  const trace = [];

  // Ensure system prompt is set
  if (conv.messages[0]?.role === 'system' && conv.messages[0]?.content !== systemPrompt) {
    conv.messages[0] = { role: 'system', content: systemPrompt };
  } else if (!conv.messages.length || conv.messages[0]?.role !== 'system') {
    conv.messages.unshift({ role: 'system', content: systemPrompt });
  }

  addMsg(userId, 'user', text);
  trace.push({ type: 'input', label: 'Получил запрос администратора', detail: String(text || '').slice(0, 500) });
  let rounds = 0;

  while (rounds < maxRounds) {
    rounds++;
    trace.push({ type: 'llm', label: `Раунд ${rounds}: отправил контекст модели`, detail: `${conv.messages.length} сообщений в контексте` });
    const msgs = conv.messages.map(m => ({ role: m.role, content: m.content }));

    let result;
    try {
      result = await callLLM({ messages: msgs, apiKey, dispatcher });
    } catch (e) {
      console.error('[agent] LLM error:', e.message);
      const errMsg = `Ошибка вызова модели: ${e.message}`;
      addMsg(userId, 'assistant', errMsg);
      saveToMemory(userId, conv);
      trace.push({ type: 'error', label: 'Ошибка модели', detail: e.message });
      return { response: errMsg, conversationId: conv.id, trace };
    }

    const responseText = result.message.content || '';
    if (!responseText || responseText.trim().length === 0) {
      const emptyMsg = 'Модель вернула пустой ответ. Попробуйте переформулировать запрос.';
      addMsg(userId, 'assistant', emptyMsg);
      saveToMemory(userId, conv);
      trace.push({ type: 'error', label: 'Пустой ответ модели', detail: emptyMsg });
      return { response: emptyMsg, conversationId: conv.id, trace };
    }

    // Check for metacall tool invocations
    const calls = parseMetaCalls(responseText);

    if (calls.length === 0) {
      // No tool calls — final response
      const clean = stripMarkdown(responseText);
      addMsg(userId, 'assistant', clean);
      saveToMemory(userId, conv);
      trace.push({ type: 'answer', label: 'Сформировал финальный ответ', detail: clean.slice(0, 500) });
      return { response: clean, conversationId: conv.id, trace };
    }

    // Has tool calls — execute them and feed results back
    // Add the assistant message (with metacalls stripped from what user sees)
    addMsg(userId, 'assistant', `[вызов инструментов: ${calls.map(c => c.name).join(', ')}]`);

    for (const call of calls) {
      const handler = handlers[call.name];
      let toolResult;
      trace.push({ type: 'tool_call', label: `Вызвал инструмент ${call.name}`, detail: JSON.stringify(call.args).slice(0, 1000) });
      if (handler) {
        try { toolResult = await handler(call.args); } catch (e) { toolResult = { error: e.message }; }
      } else {
        toolResult = { error: `Инструмент "${call.name}" не найден` };
      }
      trace.push({ type: 'tool_result', label: `Результат ${call.name}`, detail: summarizeTraceResult(toolResult) });
      // Feed result back to model
      const formatted = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult, null, 2);
      addMsg(userId, 'user', `[результат ${call.name}]:\n${formatted.substring(0, 15000)}`);
    }
  }

  const timeoutMsg = 'Достигнут лимит шагов. Уточните запрос.';
  addMsg(userId, 'assistant', timeoutMsg);
  saveToMemory(userId, conv);
  trace.push({ type: 'error', label: 'Лимит шагов', detail: timeoutMsg });
  return { response: timeoutMsg, conversationId: conv.id, trace };
}

function saveToMemory(userId, conv) {
  try {
    const messages = conv.messages.filter(m => m.role !== 'system');
    if (messages.length > 1) {
      storeConversation({ userId, messages, title: `Agent session ${userId}` });
    }
  } catch (e) {
    // Memory save is optional, don't fail on error
  }
}

// ── CEO Agent ──────────────────────────────────────────────────

export async function generateCeoReport({ db, apiKey, dispatcher, sendTelegramFn, ceoChatId }) {
  const handlers = createToolHandlers(db, sendTelegramFn, dispatcher);
  const data = {};

  try {
    data.users = await handlers.list_users({ limit: 5 });
    data.finance = await handlers.get_finance_stats({ period: '7d' });
    data.analytics = await handlers.get_analytics_summary({ hours: 12 });
    data.support = await handlers.get_support_conversations({ status: 'all', limit: 5 });
    data.transactions = await handlers.get_transactions({ limit: 10 });
  } catch (e) { console.error('[ceo-agent] data error:', e.message); }

  const prompt = [
    'Сформируй стратегический отчёт о состоянии сервиса JustRouter на основе данных:',
    '', '=== Пользователи ===', JSON.stringify(data.users, null, 2),
    '', '=== Финансы ===', JSON.stringify(data.finance, null, 2),
    '', '=== Аналитика ===', JSON.stringify(data.analytics, null, 2),
    '', '=== Техподдержка ===', JSON.stringify(data.support, null, 2),
    '', '=== Транзакции ===', JSON.stringify(data.transactions, null, 2),
    '', 'Дай развёрнутый анализ. В конце 3-5 рекомендаций.',
  ].join('\n');

  try {
    const result = await callLLM({
      messages: [{ role: 'system', content: CEO_SYSTEM_PROMPT }, { role: 'user', content: prompt }],
      apiKey, dispatcher, model: CEO_AGENT_MODEL, maxTokens: 4096, temperature: 0.5,
    });

    const report = stripMarkdown(result.message.content) || 'Не удалось сформировать отчёт';

    if (ceoChatId && sendTelegramFn) {
      const header = `CEO-отчёт JustRouter\n${new Date().toLocaleString('ru-RU')}\n\n`;
      const full = header + report;
      if (full.length <= 4000) await sendTelegramFn(ceoChatId, full);
      else {
        await sendTelegramFn(ceoChatId, header + report.substring(0, 3800) + '\n\n(продолжение...)');
        if (report.length > 3800) await sendTelegramFn(ceoChatId, report.substring(3800, 7600));
      }
    }

    // Store report — column is summary_json, not summary
    try {
      const now = new Date().toISOString();
      const periodStart = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      db.prepare("INSERT INTO analytics_reports (report_type, period_start, period_end, summary_json, created_at) VALUES ('ceo_report', ?, ?, ?, datetime('now'))")
        .run(periodStart, now, JSON.stringify({ report, data, generated_at: now }));
    } catch (e) { console.error('[ceo-agent] store error:', e.message); }

    return { ok: true, report };
  } catch (e) {
    console.error('[ceo-agent] error:', e.message);
    return { ok: false, error: e.message };
  }
}

// ── Utils ──────────────────────────────────────────────────────

export function getConversationHistory(userId) {
  const conv = conversations.get(userId);
  if (!conv) return [];
  return conv.messages.map(m => ({ role: m.role, content: m.content?.substring(0, 200) }));
}

export function listActiveConversations() {
  return Array.from(conversations.entries()).map(([userId, conv]) => ({
    userId, messageCount: conv.messages.length,
    lastActivity: new Date(conv.updatedAt).toISOString(),
  }));
}

export { ADMIN_SYSTEM_PROMPT, CEO_SYSTEM_PROMPT, OPENCLAW_SYSTEM_PROMPT, clearConversation, conversations };

// Initialize memory on module load
try {
  const { initMemory } = await import('./memory-wrapper.js');
  initMemory();
  console.log('[agent] memory tree initialized');
} catch (e) {
  console.log('[agent] memory tree not available (server-only):', e.message);
}
