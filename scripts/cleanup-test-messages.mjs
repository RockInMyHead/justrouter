import db from '../server/db.js';

const pattern = process.argv[2] || 'Ответь одним словом: да';

const before = db.prepare('SELECT COUNT(*) as c FROM messages WHERE content = ?').get(pattern);
const userRows = db.prepare(`
  SELECT id, user_id, model_id, created_at FROM messages
  WHERE content = ? AND role = 'user'
`).all(pattern);

let deleted = 0;
for (const row of userRows) {
  const assistants = db.prepare(`
    SELECT id FROM messages
    WHERE user_id = ? AND model_id = ? AND role = 'assistant'
      AND created_at >= ? AND created_at <= datetime(?, '+2 minutes')
  `).all(row.user_id, row.model_id, row.created_at, row.created_at);

  db.prepare('DELETE FROM messages WHERE id = ?').run(row.id);
  deleted += 1;
  for (const assistant of assistants) {
    db.prepare('DELETE FROM messages WHERE id = ?').run(assistant.id);
    deleted += 1;
  }
}

const after = db.prepare('SELECT COUNT(*) as c FROM messages WHERE content = ?').get(pattern);
console.log(`Pattern: "${pattern}"`);
console.log(`Before: ${before.c} user messages, deleted: ${deleted}, remaining: ${after.c}`);
