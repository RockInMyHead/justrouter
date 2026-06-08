// Memory tree wrapper — integrates agent2.0 memory with JustRouter agent
import { resolveConfig, ensureDirectories } from '../agent2.0/src/config.js';
import { createDb, generateId, now, tokenEstimate } from '../agent2.0/src/db.js';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import {
  initObsidianMemory,
  obsidianMemoryStatus,
  recallObsidianMemory,
  searchObsidianMemory,
  storeConversationInObsidian,
  writeObsidianNote,
} from './openclaw-obsidian-memory.js';

// ── Config ──────────────────────────────────────────────────────

const MEMORY_DIR = process.env.JUSTROUTER_MEMORY_DIR || '/var/www/justrouter.ru/.memory';
const MEMORY_DB = join(MEMORY_DIR, 'memory.db');
const MEMORY_VAULT = join(MEMORY_DIR, 'vault');

// Cached DB connection
let _db = null;
let _dbHasFts = false;

function getDb() {
  ensureMemoryEnv();
  if (_db) return { db: _db, hasFts: _dbHasFts };
  const result = createDb(MEMORY_DB);
  _db = result.db;
  _dbHasFts = result.hasFts;
  // WAL mode for better concurrent access
  _db.pragma('journal_mode = WAL');
  _db.pragma('busy_timeout = 5000');
  return result;
}

function ensureMemoryEnv() {
  process.env.OPENCLAW_HOME = MEMORY_DIR;
  process.env.OPENCLAW_MEMORY_DB = MEMORY_DB;
  process.env.OPENCLAW_MEMORY_VAULT = MEMORY_VAULT;
  return { dbPath: MEMORY_DB, vault: MEMORY_VAULT };
}

// ── Init ────────────────────────────────────────────────────────

export function initMemory() {
  ensureMemoryEnv();
  ensureDirectories(resolveConfig());
  initObsidianMemory();
  const { db, hasFts } = createDb(MEMORY_DB);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  _db = db;
  _dbHasFts = hasFts;
  console.log('[memory] initialized:', MEMORY_DB);
}

// ── Store conversation ──────────────────────────────────────────

export function storeConversation({ userId, messages, title }) {
  const { db } = getDb();
  const ts = now();
  const srcId = generateId(`agent-session-${userId}-${ts}`);
  const label = title || `Session ${userId} ${ts.slice(0, 10)}`;

  db.prepare(`
    INSERT OR IGNORE INTO sources (id, kind, path, title, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(srcId, 'agent-session', `${MEMORY_VAULT}/sources/${userId}.json`, label, ts, ts);

  const text = messages
    .filter(m => m.role !== 'system')
    .map(m => `[${m.role.toUpperCase()}]: ${m.content?.slice(0, 2000)}`)
    .join('\n\n');

  const chunkId = generateId(`agent-chunk-${userId}-${ts}`);
  db.prepare(`
    INSERT INTO chunks (id, source_id, title, content, token_estimate, created_at, updated_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
  `).run(chunkId, srcId, `${label} - ${messages.length} messages`, text, tokenEstimate(text), ts, ts);

  try {
    storeConversationInObsidian({ userId, messages, title: label });
  } catch (e) {
    console.warn('[memory] obsidian conversation save failed:', e.message);
  }
}

// ── Search memory ──────────────────────────────────────────────

export function searchMemory(query, limit = 5) {
  const { db, hasFts } = getDb();

  let results;
  if (hasFts) {
    const ftsQuery = query.replace(/[^\wа-яё\s]/gi, ' ').split(/\s+/).filter(w => w.length >= 2).map(w => `${w}*`).join(' OR ');
    if (!ftsQuery) return [];
    results = db.prepare(`
      SELECT c.title, substr(c.content, 1, 500) as snippet, c.created_at, s.title as source_title
      FROM chunks c JOIN chunks_fts fts ON c.rowid = fts.rowid JOIN sources s ON c.source_id = s.id
      WHERE chunks_fts MATCH ? AND c.status = 'active'
      ORDER BY rank LIMIT ?
    `).all(ftsQuery, limit);
  } else {
    results = db.prepare(`
      SELECT c.title, substr(c.content, 1, 500) as snippet, c.created_at, s.title as source_title
      FROM chunks c JOIN sources s ON c.source_id = s.id
      WHERE (c.content LIKE ? OR c.title LIKE ?) AND c.status = 'active'
      ORDER BY c.created_at DESC LIMIT ?
    `).all(`%${query}%`, `%${query}%`, limit);
  }

  let obsidian = [];
  try {
    obsidian = searchObsidianMemory(query, { limit }).map((item) => ({
      title: item.title,
      snippet: item.snippet,
      created_at: item.created_at,
      source_title: item.source_title,
      path: item.path,
      score: item.score,
    }));
  } catch (e) {
    obsidian = [{ title: 'OpenClaw Obsidian error', snippet: e.message, source_title: 'OpenClaw Obsidian', created_at: new Date().toISOString() }];
  }

  return [...obsidian, ...results].slice(0, limit);
}

// ── Recall (compact context) ────────────────────────────────────

export function recallMemory(query, maxTokens = 3000) {
  const { db, hasFts } = getDb();
  let total = 0;
  const out = [];

  const ftsQuery = query.replace(/[^\wа-яё\s]/gi, ' ').split(/\s+/).filter(w => w.length >= 2).map(w => `${w}*`).join(' OR ');

  if (hasFts && ftsQuery) {
    const chunks = db.prepare(`
      SELECT c.title, c.content, s.title as source_title
      FROM chunks c JOIN chunks_fts fts ON c.rowid = fts.rowid JOIN sources s ON c.source_id = s.id
      WHERE chunks_fts MATCH ? AND c.status = 'active' ORDER BY rank LIMIT 5
    `).all(ftsQuery);

    for (const c of chunks) {
      const t = tokenEstimate(c.content);
      if (total + t > maxTokens) break;
      out.push(`--- ${c.title} (${c.source_title}) ---`);
      out.push(c.content);
      total += t;
    }
  }

  let obsidianContext = '';
  try {
    obsidianContext = recallObsidianMemory(query, { maxChars: Math.min(maxTokens * 2, 6000), limit: 4 }).context;
  } catch (e) {
    obsidianContext = `--- OpenClaw Obsidian error ---\n${e.message}`;
  }

  return [obsidianContext, out.join('\n')].filter(Boolean).join('\n\n');
}

// ── Status ──────────────────────────────────────────────────────

export function memoryStatus() {
  const { db } = getDb();
  let obsidian = null;
  try {
    obsidian = obsidianMemoryStatus();
  } catch (e) {
    obsidian = { error: e.message };
  }
  const info = {
    sources: db.prepare('SELECT COUNT(*) as c FROM sources').get().c,
    chunks: db.prepare("SELECT COUNT(*) as c FROM chunks WHERE status = 'active'").get().c,
    summaries: db.prepare('SELECT COUNT(*) as c FROM summaries').get().c,
    db_exists: existsSync(MEMORY_DB),
    obsidian,
  };
  return info;
}

// ── Wrapper functions for agent tools ──────────────────────────

export async function agentMemorySearch(query) {
  try {
    const results = searchMemory(query);
    return { results, count: results.length };
  } catch (e) {
    return { error: e.message };
  }
}

export async function agentMemoryRecall(query) {
  try {
    const context = recallMemory(query);
    return { context: context.substring(0, 5000), chars: context.length };
  } catch (e) {
    return { error: e.message };
  }
}

export async function agentMemoryStatus() {
  return memoryStatus();
}

export async function agentMemoryWrite({ title, body, folder = 'notes', tags = [] } = {}) {
  try {
    return writeObsidianNote({
      title,
      body,
      folder,
      tags,
      source: 'agent',
      kind: folder === 'tasks' ? 'task' : folder === 'decisions' ? 'decision' : 'note',
    });
  } catch (e) {
    return { error: e.message };
  }
}
