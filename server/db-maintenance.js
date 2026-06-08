import { existsSync, copyFileSync, mkdirSync } from 'fs';
import path from 'path';

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export function backupDatabase(dbPath) {
  if (!existsSync(dbPath)) return null;
  const backupDir = path.join(path.dirname(dbPath), 'backups');
  mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `${path.basename(dbPath)}.${timestamp()}.bak`);
  copyFileSync(dbPath, backupPath);
  return backupPath;
}

export function subscriptionsTierCheckNeedsMigration(db) {
  const probeUser = db.prepare('SELECT id FROM users LIMIT 1').get();
  if (!probeUser) return false;

  try {
    db.exec('SAVEPOINT mig_sub_tier_check');
    db.prepare("INSERT INTO subscriptions (user_id, plan_type, period, status, end_date, tier) VALUES (?, 'tier', 'monthly', 'pending', '2026-01-01', 'starter')").run(probeUser.id);
    db.exec('ROLLBACK TO mig_sub_tier_check');
    db.exec('RELEASE mig_sub_tier_check');
    return false;
  } catch {
    try { db.exec('ROLLBACK TO mig_sub_tier_check'); } catch {}
    try { db.exec('RELEASE mig_sub_tier_check'); } catch {}
    return true;
  }
}

export function migrateSubscriptionsTierCheck(db) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(`
      CREATE TABLE subscriptions_new (
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
      )
    `);
    db.exec('INSERT INTO subscriptions_new SELECT id,user_id,plan_type,period,status,start_date,end_date,auto_renew,yookassa_payment_id,tier,created_at,updated_at FROM subscriptions');
    db.exec('DROP TABLE subscriptions');
    db.exec('ALTER TABLE subscriptions_new RENAME TO subscriptions');
    db.exec('CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status)');
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function transactionsPromoBonusNeedsMigration(db) {
  const probeUser = db.prepare('SELECT id FROM users LIMIT 1').get();
  if (!probeUser) return false;

  try {
    db.exec('SAVEPOINT mig_tx_promo_bonus');
    db.prepare("INSERT INTO transactions (type, user_id, amount, description) VALUES ('promo_bonus', ?, 0, '__migration_test__')").run(probeUser.id);
    db.exec('ROLLBACK TO mig_tx_promo_bonus');
    db.exec('RELEASE mig_tx_promo_bonus');
    return false;
  } catch {
    try { db.exec('ROLLBACK TO mig_tx_promo_bonus'); } catch {}
    try { db.exec('RELEASE mig_tx_promo_bonus'); } catch {}
    return true;
  }
}

export function migrateTransactionsPromoBonus(db) {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(`
      CREATE TABLE transactions_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('user_payment','agent_payment','referral_bonus','topup','admin_adjustment','promo_bonus')),
        user_id INTEGER,
        agent_id INTEGER,
        amount REAL NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        bonus_amount REAL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (agent_id) REFERENCES agents(id)
      )
    `);
    db.exec('INSERT INTO transactions_new SELECT id,type,user_id,agent_id,amount,description,created_at,bonus_amount FROM transactions');
    db.exec('DROP TABLE transactions');
    db.exec('ALTER TABLE transactions_new RENAME TO transactions');
    db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id)');
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
