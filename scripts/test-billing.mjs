import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import {
  chargeUserBalance,
  getPublicBalance,
  hasTierCoverage,
} from '../server/billing.js';

function createTestDb() {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      balance REAL DEFAULT 0,
      bonus_balance REAL DEFAULT 0,
      bonus_expires_at TEXT
    );
    CREATE TABLE transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      user_id INTEGER,
      amount REAL NOT NULL,
      bonus_amount REAL DEFAULT 0,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plan_type TEXT NOT NULL,
      period TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      end_date TEXT NOT NULL,
      tier TEXT
    );
    CREATE TABLE messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      model_id TEXT NOT NULL,
      role TEXT NOT NULL,
      is_free INTEGER DEFAULT 0
    );
  `);
  return db;
}

function insertUser(db, { balance = 0, bonus = 0 } = {}) {
  return db.prepare(`
    INSERT INTO users (email, password, name, balance, bonus_balance)
    VALUES ('u@example.com', 'x', 'User', ?, ?)
  `).run(balance, bonus).lastInsertRowid;
}

{
  const db = createTestDb();
  const userId = insertUser(db, { balance: 100, bonus: 50 });

  chargeUserBalance(db, userId, 120, 'test charge');

  const wallet = getPublicBalance(db, userId);
  const tx = db.prepare('SELECT amount, bonus_amount FROM transactions WHERE user_id = ?').get(userId);
  assert.equal(wallet.balance, 30);
  assert.equal(wallet.bonus_balance, 30);
  assert.equal(tx.amount, -120);
  assert.equal(tx.bonus_amount, 20);
}

{
  const db = createTestDb();
  const userId = insertUser(db, { balance: 10, bonus: 5 });

  assert.throws(
    () => chargeUserBalance(db, userId, 20, 'too expensive'),
    /Недостаточно средств/,
  );
}

{
  const db = createTestDb();
  const userId = insertUser(db, { balance: 10, bonus: 0 });
  db.prepare(`
    INSERT INTO subscriptions (user_id, plan_type, period, status, end_date, tier)
    VALUES (?, 'tier', 'monthly', 'active', datetime('now', '+1 day'), 'starter')
  `).run(userId);

  assert.equal(hasTierCoverage(db, userId, 0.5, 'text'), true);
  assert.equal(chargeUserBalance(db, userId, 10, 'covered', 0.5, 'text'), 0);
  assert.equal(getPublicBalance(db, userId).balance, 10);
}

console.log('[test-billing] ok');
