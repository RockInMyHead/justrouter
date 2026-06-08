#!/usr/bin/env node
// CLI wrapper for memory tree on server
// Usage: node memory-cli.js <command>
// Runs from /var/www/justrouter.ru/server/

import { resolveConfig, ensureDirectories } from '../memory/config.js';
import { createDb } from '../memory/db.js';
import { ingestAllSources } from '../memory/ingest.js';
import { summarizeAll } from '../memory/summarize.js';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const MEMORY_DIR = process.env.JUSTROUTER_MEMORY_DIR || '/var/www/justrouter.ru/.memory';

function setupEnv() {
  process.env.OPENCLAW_HOME = MEMORY_DIR;
  process.env.OPENCLAW_MEMORY_DB = join(MEMORY_DIR, 'memory.db');
  process.env.OPENCLAW_MEMORY_VAULT = join(MEMORY_DIR, 'vault');
}

const cmd = process.argv[2];

switch (cmd) {
  case 'init': {
    setupEnv();
    ensureDirectories(resolveConfig());
    const { db, hasFts } = createDb(join(MEMORY_DIR, 'memory.db'));
    db.close();
    console.log(`[memory] initialized at ${MEMORY_DIR}/memory.db`);
    console.log(`[memory] FTS5: ${hasFts ? 'available' : 'NOT available'}`);
    break;
  }

  case 'ingest': {
    setupEnv();
    const cfg = resolveConfig();
    ensureDirectories(cfg);
    const { db } = createDb(cfg.OPENCLAW_MEMORY_DB);
    const result = ingestAllSources(cfg, db);
    summarizeAll(db, cfg);
    db.close();
    console.log(`[memory] ingested:`, result);
    break;
  }

  case 'search': {
    const query = process.argv.slice(3).join(' ');
    if (!query) { console.log('Usage: node memory-cli.js search <query>'); process.exit(1); }
    setupEnv();
    const { db, hasFts } = createDb(join(MEMORY_DIR, 'memory.db'));
    let results;
    if (hasFts) {
      const ftsQuery = query.replace(/[^\wа-яё\s]/gi, ' ').split(/\s+/).filter(w => w.length >= 2).map(w => `${w}*`).join(' OR ');
      if (!ftsQuery) { results = []; }
      else {
        results = db.prepare(`
          SELECT c.title, substr(c.content,1,300) as snippet, s.title as source_title, c.created_at
          FROM chunks c JOIN chunks_fts fts ON c.rowid = fts.rowid JOIN sources s ON c.source_id = s.id
          WHERE chunks_fts MATCH ? AND c.status = 'active' ORDER BY rank LIMIT 10
        `).all(ftsQuery);
      }
    } else {
      results = db.prepare(`
        SELECT c.title, substr(c.content,1,300) as snippet, s.title as source_title, c.created_at
        FROM chunks c JOIN sources s ON c.source_id = s.id
        WHERE (c.content LIKE ? OR c.title LIKE ?) AND c.status = 'active'
        ORDER BY c.created_at DESC LIMIT 10
      `).all(`%${query}%`, `%${query}%`);
    }
    db.close();
    console.log(`\nSearch results for "${query}":\n`);
    if (results.length === 0) { console.log('  No results.\n'); break; }
    for (const r of results) {
      console.log(`  [${r.created_at?.slice(0, 10)}] ${r.title}`);
      console.log(`  Source: ${r.source_title}`);
      console.log(`  ${r.snippet.replace(/\n/g, ' ')}\n`);
    }
    break;
  }

  case 'recall': {
    const query = process.argv.slice(3).join(' ');
    if (!query) { console.log('Usage: node memory-cli.js recall <query>'); process.exit(1); }
    setupEnv();
    const { db, hasFts } = createDb(join(MEMORY_DIR, 'memory.db'));
    let tokens = 0;
    const out = ['<memory_context>'];
    const ftsQuery = query.replace(/[^\wа-яё\s]/gi, ' ').split(/\s+/).filter(w => w.length >= 2).map(w => `${w}*`).join(' OR ');
    if (hasFts && ftsQuery) {
      const chunks = db.prepare(`
        SELECT c.title, c.content, s.title as source_title
        FROM chunks c JOIN chunks_fts fts ON c.rowid = fts.rowid JOIN sources s ON c.source_id = s.id
        WHERE chunks_fts MATCH ? AND c.status = 'active' ORDER BY rank LIMIT 5
      `).all(ftsQuery);
      for (const c of chunks) {
        const t = Math.ceil((c.content || '').length / 4);
        if (tokens + t > 5000) break;
        out.push(`\n### ${c.title}\n`);
        out.push(c.content.substring(0, 1000));
        tokens += t;
      }
    }
    out.push('\n</memory_context>');
    db.close();
    console.log(out.join('\n'));
    break;
  }

  case 'status': {
    setupEnv();
    const memDb = join(MEMORY_DIR, 'memory.db');
    if (!existsSync(memDb)) { console.log('\n  Memory not initialized. Run: node memory-cli.js init\n'); break; }
    const { db } = createDb(memDb);
    const src = db.prepare('SELECT COUNT(*) as c FROM sources').get().c;
    const chk = db.prepare("SELECT COUNT(*) as c FROM chunks WHERE status = 'active'").get().c;
    const sum = db.prepare('SELECT COUNT(*) as c FROM summaries').get().c;
    const tok = db.prepare("SELECT COALESCE(SUM(token_estimate),0) as t FROM chunks WHERE status = 'active'").get().t;
    const sz = existsSync(memDb) ? readFileSync(memDb).length : 0;
    db.close();
    console.log(`\nMemory Tree Status:\n`);
    console.log(`  DB:      ${sz > 1024 ? (sz / 1024).toFixed(1) + ' KB' : sz + ' B'}`);
    console.log(`  Sources: ${src}`);
    console.log(`  Chunks:  ${chk}`);
    console.log(`  Summaries: ${sum}`);
    console.log(`  Tokens:  ~${tok}\n`);
    break;
  }

  default:
    console.log(`
Memory Tree CLI for JustRouter Agent

Commands:
  init          Initialize memory database
  ingest        Ingest sessions and files into memory
  search <q>    Search memory
  recall <q>    Recall context for agent
  status        Show memory stats
    `);
}
