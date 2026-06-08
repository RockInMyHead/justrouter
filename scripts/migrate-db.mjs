import path from 'path';
import db from '../server/db.js';
import {
  backupDatabase,
  migrateSubscriptionsTierCheck,
  migrateTransactionsPromoBonus,
  subscriptionsTierCheckNeedsMigration,
  transactionsPromoBonusNeedsMigration,
} from '../server/db-maintenance.js';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'server', 'velorix.db');
const dryRun = process.argv.includes('--dry-run');
const skipBackup = process.argv.includes('--skip-backup');

const tasks = [
  {
    name: 'subscriptions tier CHECK constraint',
    needed: subscriptionsTierCheckNeedsMigration(db),
    run: () => migrateSubscriptionsTierCheck(db),
  },
  {
    name: 'transactions promo_bonus CHECK constraint',
    needed: transactionsPromoBonusNeedsMigration(db),
    run: () => migrateTransactionsPromoBonus(db),
  },
];

const pending = tasks.filter((task) => task.needed);

if (pending.length === 0) {
  console.log('[migrate-db] no rebuild migrations needed');
  process.exit(0);
}

console.log('[migrate-db] pending:', pending.map((task) => task.name).join(', '));

if (dryRun) {
  console.log('[migrate-db] dry run, no changes applied');
  process.exit(0);
}

if (!skipBackup) {
  const backupPath = backupDatabase(dbPath);
  if (backupPath) console.log('[migrate-db] backup:', backupPath);
  else console.log('[migrate-db] database file not found, backup skipped');
}

for (const task of pending) {
  console.log('[migrate-db] running:', task.name);
  task.run();
}

console.log('[migrate-db] complete');
