import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  appendFileSync,
} from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';

const DEFAULT_MEMORY_DIR = process.env.JUSTROUTER_MEMORY_DIR || '/var/www/justrouter.ru/.memory';

function getPaths() {
  const memoryDir = process.env.JUSTROUTER_MEMORY_DIR || DEFAULT_MEMORY_DIR;
  const vault = process.env.OPENCLAW_MEMORY_VAULT || join(memoryDir, 'vault');
  const openClawVault = process.env.OPENCLAW_OBSIDIAN_VAULT || join(vault, 'openclaw');
  return {
    memoryDir,
    vault,
    openClawVault,
    notesDir: join(openClawVault, 'notes'),
    conversationsDir: join(openClawVault, 'conversations'),
    dailyDir: join(openClawVault, 'daily'),
    decisionsDir: join(openClawVault, 'decisions'),
    tasksDir: join(openClawVault, 'tasks'),
  };
}

function ensureObsidianVault() {
  const paths = getPaths();
  for (const dir of [
    paths.openClawVault,
    paths.notesDir,
    paths.conversationsDir,
    paths.dailyDir,
    paths.decisionsDir,
    paths.tasksDir,
  ]) {
    mkdirSync(dir, { recursive: true });
  }
  const readme = join(paths.openClawVault, 'README.md');
  if (!existsSync(readme)) {
    writeFileSync(readme, [
      '# OpenClaw Memory',
      '',
      'Obsidian vault for JustRouter OpenClaw agent memory.',
      '',
      '- `notes/` ручные заметки и факты',
      '- `conversations/` сохранённые диалоги агента',
      '- `daily/` дневные снимки и наблюдения',
      '- `decisions/` решения по продукту и архитектуре',
      '- `tasks/` задачи и планы действий',
      '',
    ].join('\n'), 'utf-8');
  }
  return paths;
}

function slugify(value) {
  const text = String(value || 'note')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
  return text || 'note';
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function timestamp() {
  return new Date().toISOString();
}

function redactSensitive(content) {
  return String(content || '')
    .replace(/\b(sk-[A-Za-z0-9_-]{20,})\b/g, '[REDACTED_KEY]')
    .replace(/\b(fc_pat_[A-Za-z0-9]{20,})\b/g, '[REDACTED_KEY]')
    .replace(/\b(?:api[_-]?key|token|secret|password|пароль|ключ)\s*[:=-]\s*['"]?[A-Za-z0-9_~!@#$%^&*+=./-]{8,}['"]?/gi, '[REDACTED_SECRET]')
    .replace(/(https?:\/\/)[^:/\s]+:[^@\s]+@/g, '$1[REDACTED]:[REDACTED]@')
    .replace(/(~|(\/home\/[\w-]+)|\/Users\/[^/\s]+)\/\.ssh\/id_\S+/g, '[REDACTED_SSH_KEY]');
}

function normalizeTags(tags) {
  const list = Array.isArray(tags) ? tags : String(tags || '').split(',');
  return [...new Set(list.map((tag) => String(tag || '').trim().replace(/^#/, '')).filter(Boolean))];
}

function frontmatter({ title, kind = 'note', tags = [], source = 'agent', createdAt = timestamp() }) {
  const safeTags = normalizeTags(tags);
  return [
    '---',
    `title: ${JSON.stringify(String(title || 'OpenClaw note'))}`,
    `kind: ${JSON.stringify(String(kind || 'note'))}`,
    `source: ${JSON.stringify(String(source || 'agent'))}`,
    `created: ${JSON.stringify(createdAt)}`,
    `updated: ${JSON.stringify(createdAt)}`,
    `tags: [${safeTags.map((tag) => JSON.stringify(tag)).join(', ')}]`,
    '---',
    '',
  ].join('\n');
}

function assertInside(baseDir, targetPath) {
  const base = resolve(baseDir);
  const target = resolve(targetPath);
  if (target !== base && !target.startsWith(base + sep)) {
    throw new Error('Путь Obsidian note должен быть внутри OpenClaw vault');
  }
  return target;
}

function notePathFor({ folder = 'notes', title, file }) {
  const paths = ensureObsidianVault();
  const folderMap = {
    notes: paths.notesDir,
    conversations: paths.conversationsDir,
    daily: paths.dailyDir,
    decisions: paths.decisionsDir,
    tasks: paths.tasksDir,
  };
  const root = folderMap[folder] || paths.notesDir;
  mkdirSync(root, { recursive: true });
  const name = file
    ? basename(String(file)).replace(/\.md$/i, '')
    : `${today()}-${slugify(title)}`;
  return assertInside(root, join(root, `${slugify(name)}.md`));
}

function walkMarkdown(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkMarkdown(full, out);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      out.push(full);
    }
  }
  return out;
}

function snippetAround(content, query, max = 450) {
  const lower = content.toLowerCase();
  const needle = String(query || '').toLowerCase().split(/\s+/).find(Boolean) || '';
  const idx = needle ? lower.indexOf(needle) : -1;
  const start = idx >= 0 ? Math.max(0, idx - Math.floor(max / 2)) : 0;
  return content.slice(start, start + max).replace(/\s+/g, ' ').trim();
}

function scoreContent(content, terms) {
  const lower = content.toLowerCase();
  return terms.reduce((score, term) => {
    if (!term) return score;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = lower.match(new RegExp(escaped, 'g'));
    return score + (matches ? matches.length : 0);
  }, 0);
}

export function initObsidianMemory() {
  const paths = ensureObsidianVault();
  return { ok: true, vault: paths.openClawVault };
}

export function writeObsidianNote({
  title,
  body,
  folder = 'notes',
  tags = [],
  source = 'agent',
  kind = 'note',
  file,
  mode = 'append',
} = {}) {
  if (!title) return { ok: false, error: 'Укажите title' };
  if (!body) return { ok: false, error: 'Укажите body' };
  const createdAt = timestamp();
  const filePath = notePathFor({ folder, title, file });
  const cleanBody = redactSensitive(body);
  const header = frontmatter({ title, kind, tags, source, createdAt });
  const section = [
    existsSync(filePath) && mode === 'append' ? `\n\n## ${createdAt}\n` : '',
    cleanBody.trim(),
    '',
  ].join('\n');

  if (existsSync(filePath) && mode === 'append') {
    appendFileSync(filePath, section, 'utf-8');
  } else {
    writeFileSync(filePath, `${header}# ${title}\n\n${section}`, 'utf-8');
  }

  return { ok: true, path: filePath, title, folder, bytes: statSync(filePath).size };
}

export function storeConversationInObsidian({ userId, messages, title }) {
  const safeUser = slugify(userId || 'unknown-user');
  const name = `${today()}-${safeUser}`;
  const body = (messages || [])
    .filter((message) => message.role !== 'system')
    .map((message) => {
      const role = String(message.role || 'message').toUpperCase();
      return `## ${role}\n\n${String(message.content || '').slice(0, 6000)}`;
    })
    .join('\n\n');
  if (!body.trim()) return { ok: false, error: 'Нет сообщений для сохранения' };
  return writeObsidianNote({
    title: title || `Agent conversation ${userId}`,
    body,
    folder: 'conversations',
    tags: ['openclaw', 'agent', 'conversation'],
    source: 'agent',
    kind: 'conversation',
    file: name,
    mode: 'append',
  });
}

export function searchObsidianMemory(query, { limit = 8 } = {}) {
  const needle = String(query || '').trim();
  if (!needle) return [];
  const paths = ensureObsidianVault();
  const terms = needle.toLowerCase().split(/\s+/).filter((term) => term.length >= 2);
  if (!terms.length) return [];

  return walkMarkdown(paths.openClawVault)
    .map((filePath) => {
      const content = readFileSync(filePath, 'utf-8');
      const score = scoreContent(content, terms);
      if (score <= 0) return null;
      return {
        title: basename(filePath, '.md'),
        path: filePath,
        score,
        snippet: snippetAround(content, needle),
        source_title: 'OpenClaw Obsidian',
        created_at: statSync(filePath).mtime.toISOString(),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || b.created_at.localeCompare(a.created_at))
    .slice(0, Math.max(1, Math.min(Number(limit) || 8, 50)));
}

export function recallObsidianMemory(query, { maxChars = 6000, limit = 5 } = {}) {
  const matches = searchObsidianMemory(query, { limit });
  let used = 0;
  const out = [];

  for (const match of matches) {
    const content = readFileSync(match.path, 'utf-8');
    const remaining = maxChars - used;
    if (remaining <= 0) break;
    const block = [
      `--- ${match.title} (${match.source_title}) ---`,
      content.slice(0, Math.min(remaining, 2000)),
    ].join('\n');
    out.push(block);
    used += block.length;
  }

  return { context: out.join('\n\n'), matches: matches.length, chars: used };
}

export function obsidianMemoryStatus() {
  const paths = ensureObsidianVault();
  const files = walkMarkdown(paths.openClawVault);
  const bytes = files.reduce((sum, filePath) => sum + statSync(filePath).size, 0);
  return {
    vault: paths.openClawVault,
    notes: files.length,
    bytes,
    folders: {
      notes: walkMarkdown(paths.notesDir).length,
      conversations: walkMarkdown(paths.conversationsDir).length,
      daily: walkMarkdown(paths.dailyDir).length,
      decisions: walkMarkdown(paths.decisionsDir).length,
      tasks: walkMarkdown(paths.tasksDir).length,
    },
  };
}
