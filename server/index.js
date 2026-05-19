import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import db from './db.js';

const BCRYPT_ROUNDS = 10;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://justrouter.ru', 'https://www.justrouter.ru']
    : '*',
  credentials: true,
}));
app.use(express.json());

// ── Rate limiter (simple in-memory) ────────────────────
const rateLimitMap = new Map();
function rateLimit(key, maxRequests = 20, windowMs = 60000) {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now - entry.start > windowMs) {
    rateLimitMap.set(key, { start: now, count: 1 });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now - entry.start > 120000) rateLimitMap.delete(key);
  }
}, 300000);

// Serve static files from dist in production
const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// ── Auth ──────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  if (!rateLimit(`register:${ip}`, 5, 60000)) {
    return res.status(429).json({ error: 'Слишком много запросов. Попробуйте через минуту.' });
  }
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Заполните все поля' });
  if (password.length < 6) return res.status(400).json({ error: 'Пароль должен быть минимум 6 символов' });
  if (name.length > 50) return res.status(400).json({ error: 'Имя не может быть длиннее 50 символов' });

  try {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Пользователь с таким email уже существует' });

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const token = crypto.randomBytes(32).toString('hex');
    const userApiKey = 'jr_' + crypto.randomBytes(24).toString('hex');
    const result = db.prepare('INSERT INTO users (email, password, name, balance, api_key) VALUES (?, ?, ?, ?, ?)').run(email, hashedPassword, name, 1000, userApiKey);
    db.prepare('INSERT INTO sessions (user_id, token) VALUES (?, ?)').run(result.lastInsertRowid, token);

    res.json({ token, user: { id: result.lastInsertRowid, email, name, balance: 1000, api_key: userApiKey } });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  if (!rateLimit(`login:${ip}`, 10, 60000)) {
    return res.status(429).json({ error: 'Слишком много запросов. Попробуйте через минуту.' });
  }
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Заполните все поля' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Неверный email или пароль' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Неверный email или пароль' });

  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (user_id, token) VALUES (?, ?)').run(user.id, token);

  res.json({ token, user: { id: user.id, email: user.email, name: user.name, balance: user.balance, api_key: user.api_key } });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Не авторизован' });

  const session = db.prepare(`
    SELECT users.id, users.email, users.name, users.balance, users.api_key
    FROM sessions JOIN users ON sessions.user_id = users.id
    WHERE sessions.token = ?
  `).get(token);

  if (!session) return res.status(401).json({ error: 'Сессия не найдена' });
  res.json(session);
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.json({ ok: true });
});

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Не авторизован' });

  const session = db.prepare(`
    SELECT users.id, users.email, users.name, users.balance, users.api_key
    FROM sessions JOIN users ON sessions.user_id = users.id
    WHERE sessions.token = ?
  `).get(token);

  if (!session) return res.status(401).json({ error: 'Сессия не найдена' });
  req.user = session;
  next();
}

// ── Models ──────────────────────────────────────────────

app.get('/api/models', (req, res) => {
  const { category, provider, search, sort } = req.query;
  let sql = 'SELECT * FROM models WHERE 1=1';
  const params = [];

  if (category && category !== 'all') { sql += ' AND category = ?'; params.push(category); }
  if (provider && provider !== 'Все') { sql += ' AND provider = ?'; params.push(provider); }
  if (search) { sql += ' AND (name LIKE ? OR id LIKE ? OR provider LIKE ?)'; const q = `%${search}%`; params.push(q, q, q); }

  if (sort === 'price-asc') sql += ' ORDER BY price ASC';
  else if (sort === 'price-desc') sql += ' ORDER BY price DESC';
  else if (sort === 'speed') sql += ' ORDER BY speed DESC';
  else if (sort === 'context') sql += ' ORDER BY context DESC';
  else sql += ' ORDER BY id ASC';

  const models = db.prepare(sql).all(...params);
  res.json(models);
});

app.get('/api/models/:id', (req, res) => {
  const model = db.prepare('SELECT * FROM models WHERE id = ?').get(req.params.id);
  if (!model) return res.status(404).json({ error: 'Модель не найдена' });
  res.json(model);
});

// ── Chat / Messages ─────────────────────────────────────

app.post('/api/chat', authMiddleware, (req, res) => {
  const { model_id, content } = req.body;
  if (!model_id || !content) return res.status(400).json({ error: 'model_id и content обязательны' });

  const model = db.prepare('SELECT * FROM models WHERE id = ?').get(model_id);
  if (!model) return res.status(404).json({ error: 'Модель не найдена' });

  // Check free requests
  const freeCount = db.prepare('SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND model_id = ? AND is_free = 1').get(req.user.id, model_id);
  const isFree = freeCount.count < 10;

  db.prepare('INSERT INTO messages (user_id, model_id, role, content, is_free) VALUES (?, ?, ?, ?, ?)').run(req.user.id, model_id, 'user', content, isFree ? 1 : 0);

  // Generate simulated AI response
  let response = '';
  const q = content.toLowerCase();
  if (q.includes('привет') || q.includes('здравствуй')) response = `Здравствуйте! Я ${model.name}. Чем могу помочь?`;
  else if (q.includes('код') || q.includes('напиши')) response = 'Конечно! Вот пример на Python:\n\n```python\ndef hello(name):\n    print(f"Привет, {name}!")\n\nhello("мир")\n```\n\nНужно что-то ещё?';
  else if (q.includes('что ты')) response = `Я — ${model.name} от ${model.provider}. Могу помочь с написанием кода, ответами на вопросы, анализом данных и многим другим.`;
  else if (q.includes('погода')) response = 'Извините, я — языковая модель и не имею доступа к реальным данным о погоде. Но я могу помочь с другими вопросами!';
  else response = `Интересный вопрос! Я — ${model.name}. По вашему запросу «${content.slice(0, 50)}...» могу сказать, что это многообещающая тема. Готов обсудить детали.`;

  db.prepare('INSERT INTO messages (user_id, model_id, role, content, is_free) VALUES (?, ?, ?, ?, ?)').run(req.user.id, model_id, 'assistant', response, isFree ? 1 : 0);

  if (!isFree) {
    // Deduct from balance if beyond free limit
    const cost = model.price * 0.0001;
    db.prepare('UPDATE users SET balance = MAX(0, balance - ?) WHERE id = ?').run(cost, req.user.id);
    db.prepare("INSERT INTO transactions (type, user_id, amount, description) VALUES ('user_payment', ?, ?, ?)").run(req.user.id, -cost, `Оплата ${model.name}: ${content.slice(0, 50)}`);
  }

  const balance = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id).balance;

  res.json({
    response,
    is_free: isFree,
    free_remaining: Math.max(0, 10 - freeCount.count - 1),
    balance,
  });
});

app.get('/api/messages', authMiddleware, (req, res) => {
  const { model_id } = req.query;
  let sql = 'SELECT * FROM messages WHERE user_id = ?';
  const params = [req.user.id];

  if (model_id) { sql += ' AND model_id = ?'; params.push(model_id); }
  sql += ' ORDER BY created_at ASC LIMIT 100';

  const messages = db.prepare(sql).all(...params);
  res.json(messages);
});

app.get('/api/free-remaining', authMiddleware, (req, res) => {
  const { model_id } = req.query;
  if (!model_id) return res.status(400).json({ error: 'model_id обязателен' });

  const freeCount = db.prepare('SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND model_id = ? AND is_free = 1').get(req.user.id, model_id);
  res.json({ free_remaining: Math.max(0, 10 - freeCount.count) });
});

// ── Agents API ─────────────────────────────────────────

// Универсальная аутентификация: пользователь по токену сессии или api_key, агент по api_key
function universalAuth(req, res, next) {
  let token = req.headers.authorization?.replace('Bearer ', '');
  let apiKey = req.headers['x-api-key'];

  // Try user session token first
  if (token) {
    const session = db.prepare(`
      SELECT users.id, users.email, users.name, users.balance, users.api_key
      FROM sessions JOIN users ON sessions.user_id = users.id
      WHERE sessions.token = ?
    `).get(token);
    if (session) {
      req.authType = 'user';
      req.authUser = session;
      return next();
    }
  }

  // Try API key (user or agent)
  if (apiKey) {
    // Check if it's a user api_key
    if (apiKey.startsWith('jr_')) {
      const user = db.prepare('SELECT id, email, name, balance, api_key FROM users WHERE api_key = ?').get(apiKey);
      if (user) {
        req.authType = 'user';
        req.authUser = user;
        return next();
      }
    }
    // Check if it's an agent api_key
    const agent = db.prepare('SELECT * FROM agents WHERE api_key = ?').get(apiKey);
    if (agent) {
      req.authType = 'agent';
      req.agent = agent;
      return next();
    }
  }

  return res.status(401).json({ error: 'Требуется Authorization: Bearer <token> или X-Api-Key <ключ>' });
}

// POST /api/v1/chat — универсальный чат (пользователь или агент, любая модель)
app.post('/api/v1/chat', universalAuth, (req, res) => {
  const { model_id, content } = req.body;
  if (!model_id || !content) return res.status(400).json({ error: 'model_id и content обязательны' });

  const model = db.prepare('SELECT * FROM models WHERE id = ?').get(model_id);
  if (!model) return res.status(404).json({ error: 'Модель не найдена' });

  if (req.authType === 'user') {
    const userId = req.authUser.id;

    // Check free requests
    const freeCount = db.prepare('SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND model_id = ? AND is_free = 1').get(userId, model_id);
    const isFree = freeCount.count < 10;

    db.prepare('INSERT INTO messages (user_id, model_id, role, content, is_free) VALUES (?, ?, ?, ?, ?)').run(userId, model_id, 'user', content, isFree ? 1 : 0);

    // Generate simulated response
    let response = '';
    const q = content.toLowerCase();
    if (q.includes('привет') || q.includes('здравствуй')) response = `Здравствуйте! Я ${model.name}. Чем могу помочь?`;
    else if (q.includes('код') || q.includes('напиши')) response = 'Конечно! Вот пример на Python:\n\n```python\ndef hello(name):\n    print(f"Привет, {name}!")\n\nhello("мир")\n```';
    else if (q.includes('что ты')) response = `Я — ${model.name} от ${model.provider}. Могу помочь с написанием кода, ответами на вопросы, анализом данных и многим другим.`;
    else if (q.includes('погода')) response = 'Извините, я — языковая модель и не имею доступа к реальным данным о погоде. Но я могу помочь с другими вопросами!';
    else response = `Интересный вопрос! Я — ${model.name}. По вашему запросу «${content.slice(0, 50)}...» могу сказать, что это многообещающая тема. Готов обсудить детали.`;

    db.prepare('INSERT INTO messages (user_id, model_id, role, content, is_free) VALUES (?, ?, ?, ?, ?)').run(userId, model_id, 'assistant', response, isFree ? 1 : 0);

    if (!isFree) {
      const cost = model.price * 0.0001;
      db.prepare('UPDATE users SET balance = MAX(0, balance - ?) WHERE id = ?').run(cost, userId);
      db.prepare("INSERT INTO transactions (type, user_id, amount, description) VALUES ('user_payment', ?, ?, ?)").run(userId, -cost, `Оплата ${model.name}: ${content.slice(0, 50)}`);
    }

    const balance = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId).balance;

    res.json({
      response,
      auth_type: 'user',
      is_free: isFree,
      free_remaining: Math.max(0, 10 - freeCount.count - 1),
      balance,
    });
  } else {
    // Agent
    const agentId = req.agent.id;

    if (req.agent.balance <= 0) {
      return res.status(402).json({ error: 'Недостаточно средств. Пополните баланс агента.' });
    }

    db.prepare('INSERT INTO agent_messages (agent_id, model_id, role, content) VALUES (?, ?, ?, ?)').run(agentId, model_id, 'user', content);

    let response = '';
    const q = content.toLowerCase();
    if (q.includes('привет') || q.includes('здравствуй')) response = `Здравствуйте! Я агент ${req.agent.name}. Чем могу помочь?`;
    else if (q.includes('код') || q.includes('напиши')) response = 'Конечно! Вот пример на Python:\n\n```python\ndef hello(name):\n    print(f"Привет, {name}!")\n\nhello("мир")\n```';
    else response = `Я агент ${req.agent.name}. По вашему запросу «${content.slice(0, 50)}...» — интересная тема!`;

    db.prepare('INSERT INTO agent_messages (agent_id, model_id, role, content) VALUES (?, ?, ?, ?)').run(agentId, model_id, 'assistant', response);

    const cost = Math.max(0.01, model.price * 0.0001);
    db.prepare('UPDATE agents SET balance = MAX(0, balance - ?) WHERE id = ?').run(cost, agentId);
    db.prepare("INSERT INTO transactions (type, agent_id, amount, description) VALUES ('agent_payment', ?, ?, ?)").run(agentId, -cost, `Агент ${req.agent.name}: ${model.name} — ${content.slice(0, 50)}`);
    const balance = db.prepare('SELECT balance FROM agents WHERE id = ?').get(agentId).balance;

    res.json({ response, auth_type: 'agent', balance, cost });
  }
});

// ── Agent Auth middleware (legacy) ──
function agentAuthMiddleware(req, res, next) {
  let apiKey = req.headers['x-api-key'];
  let token = req.headers.authorization?.replace('Bearer ', '');

  if (apiKey) {
    const agent = db.prepare('SELECT * FROM agents WHERE api_key = ?').get(apiKey);
    if (!agent) return res.status(401).json({ error: 'Неверный API ключ' });
    req.agent = agent;
    return next();
  }

  if (token) {
    const session = db.prepare(`
      SELECT agents.* FROM agent_sessions
      JOIN agents ON agent_sessions.agent_id = agents.id
      WHERE agent_sessions.token = ?
    `).get(token);
    if (!session) return res.status(401).json({ error: 'Неверный токен сессии' });
    req.agent = session;
    return next();
  }

  return res.status(401).json({ error: 'Требуется X-Api-Key или Bearer токен' });
}

// POST /api/v1/agents/register — создать агента
app.post('/api/v1/agents/register', (req, res) => {
  const { name, owner_token } = req.body;
  if (!name) return res.status(400).json({ error: 'Имя агента обязательно' });
  if (typeof name !== 'string' || name.length > 100) return res.status(400).json({ error: 'Имя агента не может быть длиннее 100 символов' });

  const ip = req.ip || req.connection.remoteAddress;
  if (!rateLimit(`agent_register:${ip}`, 5, 60000)) {
    return res.status(429).json({ error: 'Слишком много запросов. Попробуйте через минуту.' });
  }

  let ownerUserId = null;
  if (owner_token) {
    const session = db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(owner_token);
    if (session) ownerUserId = session.user_id;
  }

  try {
    const apiKey = 'ag_' + crypto.randomBytes(24).toString('hex');
    const result = db.prepare('INSERT INTO agents (name, api_key, balance, owner_user_id) VALUES (?, ?, ?, ?)').run(name, apiKey, 0, ownerUserId);
    res.json({
      agent: { id: result.lastInsertRowid, name, api_key: apiKey, balance: 0 },
      message: 'Агент создан. Сохраните API ключ — он показывается только один раз.',
    });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка создания агента' });
  }
});

// POST /api/v1/agents/login — получить токен сессии по API ключу
app.post('/api/v1/agents/login', (req, res) => {
  const { api_key } = req.body;
  if (!api_key) return res.status(400).json({ error: 'api_key обязателен' });

  const agent = db.prepare('SELECT * FROM agents WHERE api_key = ?').get(api_key);
  if (!agent) return res.status(401).json({ error: 'Неверный API ключ' });

  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO agent_sessions (agent_id, token) VALUES (?, ?)').run(agent.id, token);

  res.json({ token, agent: { id: agent.id, name: agent.name, balance: agent.balance } });
});

// GET /api/v1/agents/me — данные профиля агента (без api_key)
app.get('/api/v1/agents/me', agentAuthMiddleware, (req, res) => {
  const usage = db.prepare('SELECT COUNT(*) as count FROM agent_messages WHERE agent_id = ?').get(req.agent.id);
  res.json({
    id: req.agent.id,
    name: req.agent.name,
    balance: req.agent.balance,
    total_messages: usage.count,
    created_at: req.agent.created_at,
  });
});

// GET /api/v1/agents/invoice — ссылка на оплату (имитация)
app.get('/api/v1/agents/invoice', agentAuthMiddleware, (req, res) => {
  const { amount } = req.query;
  const amt = parseFloat(amount) || 100;
  res.json({
    invoice_url: `https://justrouter.ru/pay?agent_id=${req.agent.id}&amount=${amt}`,
    amount: amt,
    agent_id: req.agent.id,
    status: 'pending',
  });
});

// POST /api/v1/agents/chat — отправить сообщение от имени агента
app.post('/api/v1/agents/chat', agentAuthMiddleware, (req, res) => {
  const { model_id, content } = req.body;
  if (!model_id || !content) return res.status(400).json({ error: 'model_id и content обязательны' });

  const model = db.prepare('SELECT * FROM models WHERE id = ?').get(model_id);
  if (!model) return res.status(404).json({ error: 'Модель не найдена' });

  if (req.agent.balance <= 0) {
    return res.status(402).json({ error: 'Недостаточно средств. Пополните баланс агента.' });
  }

  db.prepare('INSERT INTO agent_messages (agent_id, model_id, role, content) VALUES (?, ?, ?, ?)').run(req.agent.id, model_id, 'user', content);

  // Simulated AI response
  let response = '';
  const q = content.toLowerCase();
  if (q.includes('привет') || q.includes('здравствуй')) response = `Здравствуйте! Я агент ${req.agent.name}. Чем могу помочь?`;
  else if (q.includes('код') || q.includes('напиши')) response = 'Конечно! Вот пример на Python:\n\n```python\ndef hello(name):\n    print(f"Привет, {name}!")\n\nhello("мир")\n```';
  else response = `Я агент ${req.agent.name}. По вашему запросу «${content.slice(0, 50)}...» — интересная тема!`;

  db.prepare('INSERT INTO agent_messages (agent_id, model_id, role, content) VALUES (?, ?, ?, ?)').run(req.agent.id, model_id, 'assistant', response);

  // Deduct from balance
  const cost = Math.max(0.01, model.price * 0.0001);
  db.prepare('UPDATE agents SET balance = MAX(0, balance - ?) WHERE id = ?').run(cost, req.agent.id);
  db.prepare("INSERT INTO transactions (type, agent_id, amount, description) VALUES ('agent_payment', ?, ?, ?)").run(req.agent.id, -cost, `Агент ${req.agent.name}: ${model.name} — ${content.slice(0, 50)}`);
  const balance = db.prepare('SELECT balance FROM agents WHERE id = ?').get(req.agent.id).balance;

  res.json({ response, balance, cost });
});

// GET /api/v1/agents/messages — история сообщений агента
app.get('/api/v1/agents/messages', agentAuthMiddleware, (req, res) => {
  const { model_id } = req.query;
  let sql = 'SELECT * FROM agent_messages WHERE agent_id = ?';
  const params = [req.agent.id];
  if (model_id) { sql += ' AND model_id = ?'; params.push(model_id); }
  sql += ' ORDER BY created_at ASC LIMIT 100';
  const messages = db.prepare(sql).all(...params);
  res.json(messages);
});

// GET /api/v1/agents/models — список моделей для агента (тот же что и для пользователей)
app.get('/api/v1/agents/models', agentAuthMiddleware, (req, res) => {
  const models = db.prepare('SELECT * FROM models ORDER BY id ASC').all();
  res.json(models);
});

// ── Admin ──────────────────────────────────────────────

app.post('/api/auth/admin-login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Заполните все поля' });

  const ip = req.ip || req.connection.remoteAddress;
  if (!rateLimit(`admin_login:${ip}`, 5, 60000)) {
    return res.status(429).json({ error: 'Слишком много попыток' });
  }

  // Check admin credentials (hardcoded for simplicity, should use env vars in production)
  if (username !== 'admin' || password !== 'admin') {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  // Create an admin session token
  const token = crypto.randomBytes(32).toString('hex');
  // Find admin user or create one
  let adminUser = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@justrouter.ru');
  if (!adminUser) {
    const hashedPw = await bcrypt.hash('admin', BCRYPT_ROUNDS);
    const result = db.prepare('INSERT INTO users (email, password, name, balance) VALUES (?, ?, ?, ?)').run('admin@justrouter.ru', hashedPw, 'Admin', 0);
    adminUser = { id: result.lastInsertRowid };
  }
  db.prepare('INSERT INTO sessions (user_id, token) VALUES (?, ?)').run(adminUser.id, token);
  res.json({ token, admin: { username: 'admin' } });
});

function adminMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Не авторизован' });
  const session = db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token);
  if (!session) return res.status(401).json({ error: 'Неверный токен' });
  req.adminUserId = session.user_id;
  next();
}

// ── Admin: Overview stats ──
app.get('/api/admin/overview', adminMiddleware, (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const totalAgents = db.prepare('SELECT COUNT(*) as count FROM agents').get().count;
  const totalMessages = db.prepare('SELECT COUNT(*) as count FROM messages').get().count;
  const totalModels = db.prepare('SELECT COUNT(*) as count FROM models').get().count;
  const totalRevenue = db.prepare("SELECT COALESCE(SUM(ABS(amount)), 0) as t FROM transactions WHERE amount < 0").get().t;
  const totalTopups = db.prepare("SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE amount > 0").get().t;
  const messagesToday = db.prepare("SELECT COUNT(*) as count FROM messages WHERE created_at >= datetime('now', '-1 day')").get().count;
  const usersToday = db.prepare("SELECT COUNT(*) as count FROM users WHERE created_at >= datetime('now', '-1 day')").get().count;
  const topModels = db.prepare('SELECT model_id, COUNT(*) as count FROM messages GROUP BY model_id ORDER BY count DESC LIMIT 5').all();

  // Revenue by day for chart (last 14 days)
  const revenueChart = db.prepare(`
    SELECT strftime('%Y-%m-%d', created_at) as label,
           COALESCE(SUM(ABS(amount)), 0) as revenue
    FROM transactions WHERE amount < 0 AND created_at >= datetime('now', '-14 days')
    GROUP BY label ORDER BY label ASC
  `).all();

  res.json({
    total_users: totalUsers,
    total_agents: totalAgents,
    total_messages: totalMessages,
    total_models: totalModels,
    total_revenue: totalRevenue,
    total_topups: totalTopups,
    messages_today: messagesToday,
    users_today: usersToday,
    top_models: topModels,
    revenue_chart: revenueChart,
  });
});

// ── Admin: Users list ──
app.get('/api/admin/users', adminMiddleware, (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '';
  const params = [];
  if (search) {
    where = 'WHERE (email LIKE ? OR name LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q);
  }
  const total = db.prepare(`SELECT COUNT(*) as count FROM users ${where}`).get(...params).count;
  const users = db.prepare(`SELECT id, email, name, balance, created_at FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, parseInt(limit), offset);
  res.json({ users, total, page: parseInt(page), limit: parseInt(limit) });
});

app.get('/api/admin/users/:id', adminMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, email, name, balance, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  const msgCount = db.prepare('SELECT COUNT(*) as count FROM messages WHERE user_id = ?').get(user.id).count;
  const paidTotal = db.prepare("SELECT COALESCE(SUM(ABS(amount)), 0) as t FROM transactions WHERE user_id = ? AND amount < 0").get(user.id).t;
  res.json({ ...user, message_count: msgCount, total_paid: paidTotal });
});

app.patch('/api/admin/users/:id/balance', adminMiddleware, (req, res) => {
  const { amount, reason } = req.body;
  if (!amount) return res.status(400).json({ error: 'amount обязателен' });
  db.prepare('UPDATE users SET balance = MAX(0, balance + ?) WHERE id = ?').run(parseFloat(amount), req.params.id);
  db.prepare("INSERT INTO transactions (type, user_id, amount, description) VALUES ('admin_adjustment', ?, ?, ?)").run(req.params.id, parseFloat(amount), reason || 'Корректировка администратором');
  const balance = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.params.id).balance;
  res.json({ balance });
});

// ── Admin: Models list ──
app.get('/api/admin/models', adminMiddleware, (req, res) => {
  const models = db.prepare('SELECT * FROM models ORDER BY provider, name ASC').all();
  res.json(models);
});

app.post('/api/admin/models', adminMiddleware, (req, res) => {
  const { id, name, provider, category, price, context, speed, badge, color, description, strengths } = req.body;
  if (!id || !name || !provider || !category || price === undefined) {
    return res.status(400).json({ error: 'id, name, provider, category, price обязательны' });
  }
  try {
    db.prepare('INSERT INTO models (id, name, provider, category, price, context, speed, badge, color, description, strengths) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      id, name, provider, category, parseFloat(price), parseInt(context || 0), parseInt(speed || 0), badge || null, color || '#10B981', description || null, strengths || null
    );
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: 'Модель с таким ID уже существует' });
  }
});

app.patch('/api/admin/models/:id', adminMiddleware, (req, res) => {
  const { name, provider, category, price, context, speed, badge, color, description, strengths } = req.body;
  const sets = []; const params = [];
  if (name !== undefined) { sets.push('name = ?'); params.push(name); }
  if (provider !== undefined) { sets.push('provider = ?'); params.push(provider); }
  if (category !== undefined) { sets.push('category = ?'); params.push(category); }
  if (price !== undefined) { sets.push('price = ?'); params.push(parseFloat(price)); }
  if (context !== undefined) { sets.push('context = ?'); params.push(parseInt(context)); }
  if (speed !== undefined) { sets.push('speed = ?'); params.push(parseInt(speed)); }
  if (badge !== undefined) { sets.push('badge = ?'); params.push(badge || null); }
  if (color !== undefined) { sets.push('color = ?'); params.push(color); }
  if (description !== undefined) { sets.push('description = ?'); params.push(description || null); }
  if (strengths !== undefined) { sets.push('strengths = ?'); params.push(strengths || null); }
  if (sets.length === 0) return res.status(400).json({ error: 'Нет полей для обновления' });
  params.push(req.params.id);
  db.prepare(`UPDATE models SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  res.json({ success: true });
});

app.delete('/api/admin/models/:id', adminMiddleware, (req, res) => {
  db.prepare('DELETE FROM models WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ── Admin: Providers / API Keys ──
app.get('/api/admin/providers', adminMiddleware, (req, res) => {
  const providers = db.prepare('SELECT * FROM providers ORDER BY name ASC').all();
  res.json(providers);
});

app.put('/api/admin/providers/:id', adminMiddleware, (req, res) => {
  const { api_key, base_url, is_active } = req.body;
  const sets = []; const params = [];
  if (api_key !== undefined) { sets.push('api_key = ?'); params.push(api_key || null); }
  if (base_url !== undefined) { sets.push('base_url = ?'); params.push(base_url); }
  if (is_active !== undefined) { sets.push('is_active = ?'); params.push(is_active ? 1 : 0); }
  if (sets.length === 0) return res.status(400).json({ error: 'Нет полей для обновления' });
  params.push(req.params.id);
  db.prepare(`UPDATE providers SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  const provider = db.prepare('SELECT * FROM providers WHERE id = ?').get(req.params.id);
  res.json(provider);
});

// ── Admin: Provider stats (real data) ──
app.get('/api/admin/provider-stats', adminMiddleware, (req, res) => {
  // Get all providers
  const providers = db.prepare('SELECT * FROM providers ORDER BY name ASC').all();
  // Get message counts per provider from models joined with messages
  const stats = providers.map((p) => {
    const totalMsgs = db.prepare(`
      SELECT COUNT(*) as count FROM messages
      JOIN models ON messages.model_id = models.id
      WHERE models.provider = ?
    `).get(p.name).count;

    const agentMsgs = db.prepare(`
      SELECT COUNT(*) as count FROM agent_messages
      JOIN models ON agent_messages.model_id = models.id
      WHERE models.provider = ?
    `).get(p.name).count;

    const messageCount = totalMsgs + agentMsgs;
    return {
      id: p.id,
      name: p.name,
      api_key: p.api_key,
      base_url: p.base_url,
      is_active: p.is_active,
      message_count: messageCount,
    };
  });

  const totalMessages = stats.reduce((sum, s) => sum + s.message_count, 0);

  const enriched = stats.map((s) => ({
    ...s,
    pct: totalMessages > 0 ? Math.round((s.message_count / totalMessages) * 100) : 0,
  }));

  res.json({ providers: enriched, total_messages: totalMessages });
});

// ── Admin: Test provider API key ──
app.post('/api/admin/providers/:id/test', adminMiddleware, async (req, res) => {
  const provider = db.prepare('SELECT * FROM providers WHERE id = ?').get(req.params.id);
  if (!provider) return res.status(404).json({ error: 'Провайдер не найден' });
  if (!provider.api_key) return res.json({ success: false, message: 'API-ключ не задан' });

  const start = Date.now();
  let success = false;
  let message = '';
  let latency = 0;

  try {
    // Try to make a lightweight request to the provider's API
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    let testUrl = provider.base_url;
    let testHeaders = { 'Authorization': `Bearer ${provider.api_key}` };

    // Different providers have different test endpoints
    if (provider.id === 'openai') testUrl = 'https://api.openai.com/v1/models';
    else if (provider.id === 'anthropic') testUrl = 'https://api.anthropic.com/v1/messages';
    else if (provider.id === 'google') { testUrl = 'https://generativelanguage.googleapis.com/v1/models'; delete testHeaders['Authorization']; testHeaders['x-goog-api-key'] = provider.api_key; }
    else testUrl = provider.base_url ? provider.base_url.replace(/\/+$/, '') : provider.base_url;

    if (!testUrl) {
      clearTimeout(timeout);
      return res.json({ success: false, message: 'Не указан Base URL', latency: 0 });
    }

    const resp = await fetch(testUrl, {
      method: 'GET',
      headers: testHeaders,
      signal: controller.signal,
    });

    latency = Date.now() - start;
    success = resp.status < 500;
    message = success ? `Успешно (${resp.status})` : `Ошибка (${resp.status})`;
    clearTimeout(timeout);
  } catch (e) {
    latency = Date.now() - start;
    message = e.name === 'AbortError' ? 'Таймаут (5с)' : `Ошибка: ${e.message}`;
    success = false;
  }

  res.json({ success, message, latency, provider_id: provider.id });
});

// ── SPA fallback ────────────────────────────────────────

// All non-API routes serve index.html for SPA routing
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
  console.log(`📦 API: http://localhost:${PORT}/api`);
});
