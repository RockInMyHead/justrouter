import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  subscriptionsTierCheckNeedsMigration,
  transactionsPromoBonusNeedsMigration,
} from './db-maintenance.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'velorix.db');

export const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent access
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Core tables ──

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    balance REAL DEFAULT 0,
    api_key TEXT UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    model_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT,
    is_free INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    bonus_amount REAL DEFAULT 0,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'text',
    price REAL NOT NULL DEFAULT 0,
    context INTEGER DEFAULT 0,
    speed INTEGER DEFAULT 80,
    badge TEXT,
    color TEXT DEFAULT '#10B981',
    description TEXT,
    description_en TEXT,
    strengths TEXT,
    video_meta TEXT,
    is_active INTEGER DEFAULT 1
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    system_prompt TEXT,
    greeting TEXT,
    model TEXT,
    temperature REAL DEFAULT 1.0,
    max_tokens INTEGER DEFAULT 2048,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS agent_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    name TEXT,
    user_id INTEGER NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    base_url TEXT NOT NULL,
    api_key TEXT,
    is_active INTEGER DEFAULT 1
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS yookassa_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    payment_id TEXT UNIQUE NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    bonus_amount REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    subscription_id INTEGER REFERENCES subscriptions(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS support_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    guest_token TEXT,
    guest_name TEXT,
    handoff_to_human INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    closed_at TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS support_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    admin_user_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES support_conversations(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS telegram_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    telegram_id TEXT NOT NULL UNIQUE,
    marketing_enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS site_purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    site_id TEXT NOT NULL,
    amount REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS video_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    model_id TEXT NOT NULL,
    job_id TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending',
    prompt TEXT,
    duration INTEGER,
    resolution TEXT,
    aspect_ratio TEXT,
    cost REAL DEFAULT 0,
    stream_urls TEXT,
    error TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS analytics_events (
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
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS referrals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_user_id INTEGER NOT NULL,
    referred_user_id INTEGER NOT NULL UNIQUE,
    referral_code TEXT NOT NULL,
    bonuses REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (referrer_user_id) REFERENCES users(id),
    FOREIGN KEY (referred_user_id) REFERENCES users(id)
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS analytics_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_type TEXT NOT NULL,
    period_start TEXT,
    period_end TEXT,
    summary_json TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// ── Migrations ──

try { db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0'); } catch { /* exists */ }
try { db.exec('ALTER TABLE users ADD COLUMN bonus_balance REAL DEFAULT 0'); } catch { /* exists */ }
try { db.exec('ALTER TABLE users ADD COLUMN bonus_expires_at TEXT'); } catch { /* exists */ }
try { db.exec('ALTER TABLE users ADD COLUMN marketing_enabled INTEGER DEFAULT 1'); } catch { /* exists */ }
try { db.exec('ALTER TABLE users ADD COLUMN referral_code TEXT'); } catch { /* exists */ }
try { db.exec('ALTER TABLE users ADD COLUMN referred_by_user_id INTEGER REFERENCES users(id)'); } catch { /* exists */ }
try { db.exec('ALTER TABLE support_conversations ADD COLUMN updated_at TEXT DEFAULT (datetime(\'now\'))'); } catch { /* exists */ }
try { db.exec('ALTER TABLE support_messages ADD COLUMN admin_user_id INTEGER'); } catch { /* exists */ }

try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL'); } catch { /* exists */ }
try { db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)'); } catch { /* exists */ }
try { db.exec('CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id)'); } catch { /* exists */ }
try { db.exec('CREATE INDEX IF NOT EXISTS idx_support_conversations_user ON support_conversations(user_id)'); } catch { /* exists */ }
try { db.exec('CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at)'); } catch { /* exists */ }
try { db.exec('CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_user_id)'); } catch { /* exists */ }
try { db.exec('CREATE INDEX IF NOT EXISTS idx_messages_model ON messages(model_id)'); } catch { /* exists */ }

// ── Subscriptions table ──
db.exec(`
  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan_type TEXT NOT NULL CHECK(plan_type IN ('base', 'pro', 'tier')),
    period TEXT NOT NULL CHECK(period IN ('monthly', 'yearly')),
    status TEXT NOT NULL DEFAULT 'active',
    start_date TEXT NOT NULL DEFAULT (datetime('now')),
    end_date TEXT NOT NULL,
    auto_renew INTEGER DEFAULT 1,
    yookassa_payment_id TEXT,
    tier TEXT CHECK(tier IN ('starter', 'standard', 'premium')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
  CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
`);

try { db.exec('ALTER TABLE yookassa_payments ADD COLUMN subscription_id INTEGER REFERENCES subscriptions(id)'); } catch { /* exists */ }
try { db.exec('ALTER TABLE users ADD COLUMN subscription_plan TEXT'); } catch { /* exists */ }
try { db.exec('ALTER TABLE users ADD COLUMN subscription_end_date TEXT'); } catch { /* exists */ }

// Add video_meta column to models table
try { db.exec('ALTER TABLE models ADD COLUMN video_meta TEXT'); } catch { /* exists */ }

// Add missing columns to analytics_events
try { db.exec('ALTER TABLE analytics_events ADD COLUMN visitor_id TEXT'); } catch { /* exists */ }
try { db.exec('ALTER TABLE analytics_events ADD COLUMN user_id INTEGER'); } catch { /* exists */ }
try { db.exec('ALTER TABLE analytics_events ADD COLUMN element TEXT'); } catch { /* exists */ }
try { db.exec('ALTER TABLE analytics_events ADD COLUMN text TEXT'); } catch { /* exists */ }
try { db.exec('ALTER TABLE analytics_events ADD COLUMN metadata TEXT'); } catch { /* exists */ }
try { db.exec('ALTER TABLE analytics_events ADD COLUMN x REAL'); } catch { /* exists */ }
try { db.exec('ALTER TABLE analytics_events ADD COLUMN y REAL'); } catch { /* exists */ }
try { db.exec('ALTER TABLE analytics_events ADD COLUMN scroll_y REAL'); } catch { /* exists */ }
try { db.exec('ALTER TABLE analytics_events ADD COLUMN viewport_w REAL'); } catch { /* exists */ }
try { db.exec('ALTER TABLE analytics_events ADD COLUMN viewport_h REAL'); } catch { /* exists */ }

// Add banned column for user blocking
try { db.exec('ALTER TABLE users ADD COLUMN banned INTEGER DEFAULT 0'); } catch { /* exists */ }

// Add corporate column for corporate clients
try { db.exec('ALTER TABLE users ADD COLUMN corporate INTEGER DEFAULT 0'); } catch { /* exists */ }

// Add tier column to subscriptions for unlimited tier access
try { db.exec('ALTER TABLE subscriptions ADD COLUMN tier TEXT'); } catch { /* exists */ }

if (subscriptionsTierCheckNeedsMigration(db)) {
  console.warn('[db] subscriptions table requires manual rebuild migration: npm run migrate:db');
}

// ── Promo codes table ──
db.exec(`
  CREATE TABLE IF NOT EXISTS promo_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    amount_type TEXT NOT NULL CHECK(amount_type IN ('fixed', 'percent')) DEFAULT 'fixed',
    amount_value REAL NOT NULL,
    max_uses INTEGER NOT NULL DEFAULT 1,
    used_count INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    expires_at TEXT,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// ── Promo redemptions table (tracks who used which code) ──
db.exec(`
  CREATE TABLE IF NOT EXISTS promo_redemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    promo_code_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    bonus_amount REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);
db.exec('CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON promo_redemptions(user_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_promo_redemptions_code ON promo_redemptions(promo_code_id)');

// ── Blog posts table ──
db.exec(`
  CREATE TABLE IF NOT EXISTS blog_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '[]',
    image_url TEXT,
    date_published TEXT,
    date_modified TEXT,
    read_minutes INTEGER NOT NULL DEFAULT 5,
    is_published INTEGER NOT NULL DEFAULT 0,
    faq TEXT NOT NULL DEFAULT '[]',
    author TEXT NOT NULL DEFAULT 'JustRouter',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);
db.exec('CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug)');
db.exec('CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(is_published)');

// ── FAQ table ──
db.exec(`
  CREATE TABLE IF NOT EXISTS faq (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_published INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`);
db.exec('CREATE INDEX IF NOT EXISTS idx_faq_category ON faq(category)');
db.exec('CREATE INDEX IF NOT EXISTS idx_faq_published ON faq(is_published)');

if (transactionsPromoBonusNeedsMigration(db)) {
  console.warn('[db] transactions table requires manual rebuild migration: npm run migrate:db');
}

// Старые списания без разбивки
// (до введения колонки все траты шли с bonus_balance первым).
try {
  db.exec(`
    UPDATE transactions
    SET bonus_amount = ABS(amount)
    WHERE type IN ('user_payment', 'agent_payment')
      AND amount < 0
      AND COALESCE(bonus_amount, 0) = 0
  `);
} catch {
  // ignore
}

// Mark built-in admin account
db.prepare('UPDATE users SET is_admin = 1 WHERE email = ?').run('admin@justrouter.ru');

// Models are synced from OpenRouter on server startup.

// Seed providers
const existingProviders = db.prepare('SELECT COUNT(*) as count FROM providers').get();
if (existingProviders.count === 0) {
  const insertProvider = db.prepare('INSERT INTO providers (id, name, base_url) VALUES (?, ?, ?)');
  const providersData = [
    ['openai', 'OpenAI', 'https://api.openai.com/v1'],
    ['anthropic', 'Anthropic', 'https://api.anthropic.com/v1'],
    ['google', 'Google AI', 'https://generativelanguage.googleapis.com/v1'],
    ['meta', 'Meta', 'https://api.meta.ai/v1'],
    ['deepseek', 'DeepSeek', 'https://api.deepseek.com/v1'],
    ['mistral', 'Mistral AI', 'https://api.mistral.ai/v1'],
    ['stability', 'Stability AI', 'https://api.stability.ai/v1'],
    ['recraft', 'Recraft', 'https://api.recraft.ai/v1'],
    ['cartesia', 'Cartesia', 'https://api.cartesia.ai/v1'],
    ['runway', 'Runway', 'https://api.runwayml.com/v1'],
  ];
  const insertMany = db.transaction((data) => {
    for (const p of data) insertProvider.run(...p);
  });
  insertMany(providersData);
  console.log('[db] seeded providers');
}

/**
 * WAL checkpoint helper — pass 'TRUNCATE' on shutdown for a clean checkpoint.
 */
export function checkpointDatabase(mode = 'PASSIVE') {
  try {
    db.pragma(`wal_checkpoint = ${mode}`);
  } catch {
    // best-effort during shutdown
  }
}

export default db;
