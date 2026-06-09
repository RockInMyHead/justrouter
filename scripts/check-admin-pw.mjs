import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', 'server', 'velorix.db');

const db = new Database(dbPath);
const user = db.prepare("SELECT id, email, password FROM users WHERE is_admin = 1 AND id = 1").get();

if (!user) {
  console.log('Admin user not found');
  process.exit(1);
}

console.log('Admin email:', user.email);
console.log('Hash prefix:', user.password.substring(0, 30));

// Test various passwords
const passwords = ['admin', 'admin123', 'admin@justrouter.ru'];
for (const pw of passwords) {
  const ok = await bcrypt.compare(pw, user.password);
  console.log(`Password "${pw}": ${ok ? 'MATCH' : 'NO MATCH'}`);
}

// If none match, create a new hash with admin123 and update
const matchesAny = passwords.some(pw => bcrypt.compareSync(pw, user.password));
if (!matchesAny) {
  console.log('\nNo password matches. Creating new hash for admin123...');
  const newHash = await bcrypt.hash('admin123', 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newHash, user.id);
  console.log('Password updated to admin123');
}

db.close();
