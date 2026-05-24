import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { ProxyAgent, fetch as undiciFetch } from 'undici';
import db from './db.js';
import { syncOpenRouterModels } from './openrouter-models.js';

const BCRYPT_ROUNDS = 10;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'JustRouterBot';
const TELEGRAM_PAYMENT_PROVIDER_TOKEN = process.env.TELEGRAM_PAYMENT_PROVIDER_TOKEN;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const LOW_BALANCE_THRESHOLD = Number(process.env.LOW_BALANCE_THRESHOLD || 100);
const EMAIL_CODE_TTL_MINUTES = Number(process.env.EMAIL_CODE_TTL_MINUTES || 15);
const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;
const YOOKASSA_RETURN_URL = process.env.YOOKASSA_RETURN_URL || 'https://justrouter.ru/account';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_PROXY_URL = process.env.OPENROUTER_PROXY_URL;
const OPENROUTER_MODEL_MAP = (() => {
  try {
    return JSON.parse(process.env.OPENROUTER_MODEL_MAP || '{}');
  } catch {
    return {};
  }
})();
const openRouterDispatcher = OPENROUTER_PROXY_URL ? new ProxyAgent(OPENROUTER_PROXY_URL) : undefined;

const mailTransporter = process.env.SMTP_USER && process.env.SMTP_PASS
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.beget.com',
      port: Number(process.env.SMTP_PORT || 465),
      secure: String(process.env.SMTP_SECURE || 'true') === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

async function sendVerificationEmail(email, code) {
  if (!mailTransporter) {
    throw new Error('SMTP не настроен');
  }

  const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER;
  const previewText = `Код подтверждения JustRouter: ${code}`;
  const info = await mailTransporter.sendMail({
    from: `"JustRouter" <${fromAddress}>`,
    to: email,
    subject: 'Код подтверждения JustRouter',
    text: `Ваш код подтверждения JustRouter: ${code}\n\nКод действует ${EMAIL_CODE_TTL_MINUTES} минут.`,
    html: `
      <!doctype html>
      <html lang="ru">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta name="color-scheme" content="dark light">
          <meta name="supported-color-schemes" content="dark light">
          <title>Код подтверждения JustRouter</title>
        </head>
        <body style="margin:0;padding:0;background:#2f2f2f;font-family:Inter,Arial,sans-serif;color:#f7f1e8;">
          <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
            ${previewText}
          </div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(135deg,#2f2f2f 0%,#3a3a3a 46%,#262626 100%);padding:32px 14px;">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border-collapse:separate;border-spacing:0;">
                  <tr>
                    <td style="padding:0 0 18px 0;text-align:center;">
                      <div style="display:inline-block;padding:10px 16px;border-radius:999px;background:rgba(247,241,232,0.08);border:1px solid rgba(247,241,232,0.14);font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#f7f1e8;">
                        JustRouter
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="border-radius:28px;overflow:hidden;background:#3a3a3a;border:1px solid rgba(247,241,232,0.14);box-shadow:0 24px 70px rgba(0,0,0,.35);">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="padding:34px 30px 18px 30px;background:radial-gradient(circle at 18% 0%,rgba(139,92,246,.34),transparent 34%),radial-gradient(circle at 88% 10%,rgba(16,185,129,.22),transparent 32%);">
                            <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:rgba(247,241,232,.62);margin-bottom:12px;">
                              Подтверждение email
                            </div>
                            <h1 style="margin:0;font-size:30px;line-height:1.15;color:#f7f1e8;font-weight:700;">
                              Ваш код доступа
                            </h1>
                            <p style="margin:14px 0 0 0;font-size:15px;line-height:1.65;color:rgba(247,241,232,.72);">
                              Введите этот код на странице регистрации, чтобы завершить создание аккаунта JustRouter.
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:12px 30px 30px 30px;">
                            <div style="margin:10px 0 22px 0;padding:22px 18px;border-radius:22px;background:#f7f1e8;text-align:center;border:1px solid rgba(255,255,255,.45);">
                              <div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#6f6f6f;margin-bottom:10px;">
                                Код подтверждения
                              </div>
                              <div style="font-family:'SFMono-Regular','Roboto Mono',Consolas,monospace;font-size:40px;line-height:1;font-weight:800;letter-spacing:.32em;color:#4f4f4f;">
                                ${code}
                              </div>
                            </div>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 22px 0;">
                              <tr>
                                <td style="padding:16px;border-radius:18px;background:rgba(247,241,232,.07);border:1px solid rgba(247,241,232,.1);">
                                  <div style="font-size:14px;line-height:1.6;color:rgba(247,241,232,.78);">
                                    Код действует <strong style="color:#f7f1e8;">${EMAIL_CODE_TTL_MINUTES} минут</strong>. Если вы не запрашивали регистрацию, просто проигнорируйте это письмо.
                                  </div>
                                </td>
                              </tr>
                            </table>

                            <div style="height:1px;background:rgba(247,241,232,.1);margin:0 0 20px 0;"></div>

                            <p style="margin:0;font-size:12px;line-height:1.7;color:rgba(247,241,232,.48);">
                              JustRouter — единый API для AI-моделей. Это автоматическое служебное письмо, отвечать на него не нужно.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:18px 8px 0 8px;text-align:center;font-size:11px;line-height:1.6;color:rgba(247,241,232,.38);">
                      © 2026 JustRouter · noreply@justrouter.ru
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });

  console.log('[email] verification sent', {
    to: email,
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
  });
}

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
  const { email, password, name, marketing_enabled = true } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Заполните все поля' });
  if (password.length < 6) return res.status(400).json({ error: 'Пароль должен быть минимум 6 символов' });
  if (name.length > 50) return res.status(400).json({ error: 'Имя не может быть длиннее 50 символов' });

  try {
    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) return res.status(409).json({ error: 'Пользователь с таким email уже существует' });

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const code = String(crypto.randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60 * 1000).toISOString();

    db.prepare('UPDATE email_verification_codes SET used_at = datetime(\'now\') WHERE email = ? AND used_at IS NULL').run(normalizedEmail);
    db.prepare(`
      INSERT INTO email_verification_codes (email, name, password_hash, code, marketing_enabled, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(normalizedEmail, name.trim(), hashedPassword, code, marketing_enabled ? 1 : 0, expiresAt);

    await sendVerificationEmail(normalizedEmail, code);

    res.json({ pending_verification: true, email: normalizedEmail, message: 'Код подтверждения отправлен на email' });
  } catch (e) {
    console.error('[email] verification send failed', {
      email,
      error: e.message,
      code: e.code,
      response: e.response,
    });
    res.status(500).json({ error: e.message === 'SMTP не настроен' ? 'Почта для отправки кодов не настроена' : 'Не удалось отправить код подтверждения' });
  }
});

app.post('/api/auth/verify-email', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  if (!rateLimit(`verify_email:${ip}`, 10, 60000)) {
    return res.status(429).json({ error: 'Слишком много попыток. Попробуйте через минуту.' });
  }

  const email = String(req.body.email || '').trim().toLowerCase();
  const code = String(req.body.code || '').trim();
  if (!email || !code) return res.status(400).json({ error: 'Введите email и код подтверждения' });

  const verification = db.prepare(`
    SELECT * FROM email_verification_codes
    WHERE email = ? AND used_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `).get(email);

  if (!verification) return res.status(400).json({ error: 'Код не найден. Запросите новый код.' });
  if (new Date(verification.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: 'Код истёк. Запросите новый код.' });
  }
  if (verification.attempts >= 5) {
    return res.status(400).json({ error: 'Слишком много неверных попыток. Запросите новый код.' });
  }
  if (verification.code !== code) {
    db.prepare('UPDATE email_verification_codes SET attempts = attempts + 1 WHERE id = ?').run(verification.id);
    return res.status(400).json({ error: 'Неверный код подтверждения' });
  }

  try {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Пользователь с таким email уже существует' });

    const token = crypto.randomBytes(32).toString('hex');
    const userApiKey = 'jr_' + crypto.randomBytes(24).toString('hex');
    const result = db.prepare('INSERT INTO users (email, password, name, balance, api_key) VALUES (?, ?, ?, ?, ?)').run(email, verification.password_hash, verification.name, 1000, userApiKey);
    db.prepare('INSERT INTO sessions (user_id, token) VALUES (?, ?)').run(result.lastInsertRowid, token);
    db.prepare('UPDATE email_verification_codes SET used_at = datetime(\'now\') WHERE id = ?').run(verification.id);

    res.json({
      token,
      user: {
        id: result.lastInsertRowid,
        email,
        name: verification.name,
        balance: 1000,
        api_key: userApiKey,
        marketing_enabled: Boolean(verification.marketing_enabled),
      },
    });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка подтверждения регистрации' });
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

app.post('/api/billing/yookassa/payment', authMiddleware, async (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount < 10) {
    return res.status(400).json({ error: 'Минимальная сумма пополнения 10 ₽' });
  }

  try {
    const payment = await createYookassaPayment({
      userId: req.user.id,
      email: req.user.email,
      amount,
    });

    res.json({
      payment_id: payment.id,
      status: payment.status,
      confirmation_url: payment.confirmation?.confirmation_url,
    });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Ошибка создания платежа' });
  }
});

app.post('/api/yookassa/webhook', (req, res) => {
  const event = req.body?.event;
  const payment = req.body?.object;

  if (!event || !payment?.id) {
    return res.status(400).json({ error: 'Некорректное уведомление ЮKassa' });
  }

  const existing = db.prepare('SELECT * FROM yookassa_payments WHERE payment_id = ?').get(payment.id);
  if (!existing) {
    console.warn('[yookassa] webhook for unknown payment', { event, payment_id: payment.id });
    return res.json({ ok: true });
  }

  if (event === 'payment.succeeded' && payment.status === 'succeeded') {
    if (existing.status !== 'succeeded') {
      const paidAmount = Number(payment.amount?.value || existing.amount);
      const tx = db.transaction(() => {
        db.prepare('UPDATE yookassa_payments SET status = ?, raw_payload = ?, paid_at = datetime(\'now\') WHERE id = ?')
          .run('succeeded', JSON.stringify(req.body), existing.id);
        db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(paidAmount, existing.user_id);
        db.prepare("INSERT INTO transactions (type, user_id, amount, description) VALUES ('topup', ?, ?, ?)")
          .run(existing.user_id, paidAmount, `Пополнение ЮKassa: ${payment.id}`);
      });
      tx();
      console.log('[yookassa] payment succeeded', { payment_id: payment.id, user_id: existing.user_id, amount: paidAmount });
    }
  } else if (event === 'payment.canceled' || payment.status === 'canceled') {
    db.prepare('UPDATE yookassa_payments SET status = ?, raw_payload = ? WHERE id = ?')
      .run('canceled', JSON.stringify(req.body), existing.id);
    console.log('[yookassa] payment canceled', { payment_id: payment.id, user_id: existing.user_id });
  } else {
    db.prepare('UPDATE yookassa_payments SET status = ?, raw_payload = ? WHERE id = ?')
      .run(payment.status || existing.status, JSON.stringify(req.body), existing.id);
  }

  res.json({ ok: true });
});

function formatRub(value) {
  return `${Number(value || 0).toFixed(2)} ₽`;
}

function yookassaAuthHeader() {
  return `Basic ${Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString('base64')}`;
}

async function createYookassaPayment({ userId, email, amount }) {
  if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
    throw new Error('ЮKassa не настроена');
  }

  const normalizedAmount = Math.max(10, Math.min(100000, Number(amount) || 0));
  const idempotenceKey = crypto.randomUUID();
  const payload = {
    amount: {
      value: normalizedAmount.toFixed(2),
      currency: 'RUB',
    },
    capture: true,
    confirmation: {
      type: 'redirect',
      return_url: YOOKASSA_RETURN_URL,
    },
    description: `Пополнение баланса JustRouter на ${formatRub(normalizedAmount)}`,
    metadata: {
      user_id: String(userId),
      source: 'justrouter_account',
    },
    receipt: email ? {
      customer: { email },
      items: [
        {
          description: 'Пополнение баланса JustRouter',
          quantity: '1.00',
          amount: { value: normalizedAmount.toFixed(2), currency: 'RUB' },
          vat_code: 1,
          payment_mode: 'advance',
          payment_subject: 'payment',
        },
      ],
    } : undefined,
  };

  const response = await fetch('https://api.yookassa.ru/v3/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotence-Key': idempotenceKey,
      Authorization: yookassaAuthHeader(),
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('[yookassa] create payment failed', data);
    throw new Error(data?.description || 'Не удалось создать платеж ЮKassa');
  }

  db.prepare(`
    INSERT INTO yookassa_payments (user_id, payment_id, idempotence_key, amount, status, confirmation_url, raw_payload)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, data.id, idempotenceKey, normalizedAmount, data.status || 'pending', data.confirmation?.confirmation_url || null, JSON.stringify(data));

  return data;
}

function getUserByTelegramId(telegramId) {
  return db.prepare(`
    SELECT users.id, users.email, users.name, users.balance, users.api_key, telegram_links.marketing_enabled
    FROM telegram_links
    JOIN users ON users.id = telegram_links.user_id
    WHERE telegram_links.telegram_id = ?
  `).get(String(telegramId));
}

async function telegramApi(method, payload) {
  if (!TELEGRAM_BOT_TOKEN) return null;

  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    console.error(`Telegram ${method} failed`, data);
  }
  return data;
}

function buildMainKeyboard(isLinked = true) {
  const keyboard = isLinked
    ? [['Баланс', 'API ключ'], ['Пополнить 500 ₽', 'Пополнить 1000 ₽'], ['Помощь']]
    : [['Помощь']];
  return { keyboard, resize_keyboard: true };
}

async function sendTelegramMessage(chatId, text, options = {}) {
  return telegramApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    ...options,
  });
}

async function sendTelegramInvoice(chatId, userId, amount) {
  if (!TELEGRAM_PAYMENT_PROVIDER_TOKEN) {
    return sendTelegramMessage(chatId, 'Пополнение через Telegram пока не настроено. Нужен TELEGRAM_PAYMENT_PROVIDER_TOKEN от YooKassa.');
  }

  const normalizedAmount = Math.max(10, Math.min(100000, Number(amount) || 0));
  const payload = `tg_topup:${userId}:${crypto.randomBytes(12).toString('hex')}`;
  db.prepare(`
    INSERT INTO telegram_payments (user_id, telegram_id, payload, amount, currency, status)
    VALUES (?, ?, ?, ?, 'RUB', 'pending')
  `).run(userId, String(chatId), payload, normalizedAmount);

  return telegramApi('sendInvoice', {
    chat_id: chatId,
    title: 'Пополнение JustRouter',
    description: `Баланс JustRouter: +${formatRub(normalizedAmount)}`,
    payload,
    provider_token: TELEGRAM_PAYMENT_PROVIDER_TOKEN,
    currency: 'RUB',
    prices: [{ label: 'Баланс JustRouter', amount: Math.round(normalizedAmount * 100) }],
  });
}

async function maybeNotifyLowBalance(userId, balance) {
  if (balance > LOW_BALANCE_THRESHOLD) {
    db.prepare('UPDATE telegram_links SET low_balance_notified = 0 WHERE user_id = ? AND low_balance_notified = 1').run(userId);
    return;
  }

  const links = db.prepare(`
    SELECT telegram_id FROM telegram_links
    WHERE user_id = ? AND low_balance_notified = 0
  `).all(userId);

  for (const link of links) {
    await sendTelegramMessage(
      link.telegram_id,
      `Баланс JustRouter низкий: ${formatRub(balance)}. Пополните баланс прямо в боте командой /topup 500.`,
      { reply_markup: buildMainKeyboard(true) }
    );
  }

  if (links.length > 0) {
    db.prepare('UPDATE telegram_links SET low_balance_notified = 1, updated_at = datetime(\'now\') WHERE user_id = ?').run(userId);
  }
}

async function answerTelegramUpdate(update) {
  if (update.pre_checkout_query) {
    await telegramApi('answerPreCheckoutQuery', {
      pre_checkout_query_id: update.pre_checkout_query.id,
      ok: true,
    });
    return;
  }

  const message = update.message;
  if (!message) return;

  const chatId = message.chat.id;
  const telegramUser = message.from || {};
  const text = (message.text || '').trim();

  if (message.successful_payment) {
    const payload = message.successful_payment.invoice_payload;
    const payment = db.prepare('SELECT * FROM telegram_payments WHERE payload = ?').get(payload);
    if (!payment || payment.status === 'paid') {
      await sendTelegramMessage(chatId, 'Платеж уже обработан.');
      return;
    }

    const chargeId = message.successful_payment.telegram_payment_charge_id;
    const providerChargeId = message.successful_payment.provider_payment_charge_id;
    const tx = db.transaction(() => {
      db.prepare('UPDATE users SET balance = balance + ? WHERE id = ?').run(payment.amount, payment.user_id);
      db.prepare(`
        UPDATE telegram_payments
        SET status = 'paid', paid_at = datetime('now'), telegram_payment_charge_id = ?, provider_payment_charge_id = ?
        WHERE payload = ?
      `).run(chargeId, providerChargeId, payload);
      db.prepare(`
        INSERT INTO transactions (type, user_id, amount, description)
        VALUES ('topup', ?, ?, ?)
      `).run(payment.user_id, payment.amount, 'Пополнение через Telegram / YooKassa');
      db.prepare('UPDATE telegram_links SET low_balance_notified = 0, updated_at = datetime(\'now\') WHERE user_id = ?').run(payment.user_id);
      return db.prepare('SELECT balance FROM users WHERE id = ?').get(payment.user_id);
    });
    const updated = tx();
    await sendTelegramMessage(chatId, `Оплата прошла. Новый баланс: ${formatRub(updated.balance)}.`, { reply_markup: buildMainKeyboard(true) });
    return;
  }

  const linkedUser = getUserByTelegramId(chatId);

  if (text.startsWith('/start')) {
    const [, startParam] = text.split(/\s+/, 2);
    if (startParam) {
      await connectTelegramCode(chatId, telegramUser, startParam);
      return;
    }

    await sendTelegramMessage(
      chatId,
      linkedUser
        ? `JustRouter подключен. Баланс: ${formatRub(linkedUser.balance)}.`
        : 'Пришлите /connect код из личного кабинета JustRouter, чтобы подключить аккаунт.',
      { reply_markup: buildMainKeyboard(Boolean(linkedUser)) }
    );
    return;
  }

  if (text.startsWith('/connect')) {
    const code = text.split(/\s+/, 2)[1];
    await connectTelegramCode(chatId, telegramUser, code);
    return;
  }

  if (!linkedUser) {
    await sendTelegramMessage(chatId, 'Сначала подключите аккаунт: /connect код из личного кабинета JustRouter.', { reply_markup: buildMainKeyboard(false) });
    return;
  }

  if (text === '/balance' || text.toLowerCase() === 'баланс') {
    await sendTelegramMessage(chatId, `Баланс: ${formatRub(linkedUser.balance)}.`, { reply_markup: buildMainKeyboard(true) });
    return;
  }

  if (text === '/key' || text.toLowerCase() === 'api ключ' || text.toLowerCase() === 'ключ') {
    await sendTelegramMessage(chatId, `Ваш API ключ:\n<code>${linkedUser.api_key}</code>`, { reply_markup: buildMainKeyboard(true) });
    return;
  }

  if (text.startsWith('/topup') || text.toLowerCase().startsWith('пополнить')) {
    const amountMatch = text.match(/\d+/);
    const amount = amountMatch ? Number(amountMatch[0]) : 500;
    await sendTelegramInvoice(chatId, linkedUser.id, amount);
    return;
  }

  if (text === '/ads_on') {
    db.prepare('UPDATE telegram_links SET marketing_enabled = 1, updated_at = datetime(\'now\') WHERE telegram_id = ?').run(String(chatId));
    await sendTelegramMessage(chatId, 'Рекламные и продуктовые уведомления включены.');
    return;
  }

  if (text === '/ads_off') {
    db.prepare('UPDATE telegram_links SET marketing_enabled = 0, updated_at = datetime(\'now\') WHERE telegram_id = ?').run(String(chatId));
    await sendTelegramMessage(chatId, 'Рекламные и продуктовые уведомления отключены.');
    return;
  }

  await sendTelegramMessage(
    chatId,
    'Команды: /balance, /key, /topup 500, /ads_on, /ads_off.',
    { reply_markup: buildMainKeyboard(true) }
  );
}

async function connectTelegramCode(chatId, telegramUser, code) {
  if (!code) {
    await sendTelegramMessage(chatId, 'Отправьте код так: /connect 123456');
    return;
  }

  const linkCode = db.prepare(`
    SELECT * FROM telegram_link_codes
    WHERE code = ? AND used_at IS NULL AND expires_at > datetime('now')
  `).get(code.trim());

  if (!linkCode) {
    await sendTelegramMessage(chatId, 'Код не найден или истек. Получите новый код в личном кабинете JustRouter.');
    return;
  }

  db.transaction(() => {
    db.prepare(`
      INSERT INTO telegram_links (user_id, telegram_id, username, first_name, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(telegram_id) DO UPDATE SET
        user_id = excluded.user_id,
        username = excluded.username,
        first_name = excluded.first_name,
        updated_at = datetime('now')
    `).run(linkCode.user_id, String(chatId), telegramUser.username || null, telegramUser.first_name || null);
    db.prepare('UPDATE telegram_link_codes SET used_at = datetime(\'now\') WHERE id = ?').run(linkCode.id);
  })();

  const user = db.prepare('SELECT balance FROM users WHERE id = ?').get(linkCode.user_id);
  await sendTelegramMessage(chatId, `Аккаунт подключен. Баланс: ${formatRub(user.balance)}.`, { reply_markup: buildMainKeyboard(true) });
}

app.post('/api/telegram/webhook', async (req, res) => {
  if (TELEGRAM_WEBHOOK_SECRET && req.headers['x-telegram-bot-api-secret-token'] !== TELEGRAM_WEBHOOK_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.json({ ok: true });
  try {
    await answerTelegramUpdate(req.body);
  } catch (e) {
    console.error('Telegram webhook error', e);
  }
});

app.post('/api/telegram/link-code', authMiddleware, (req, res) => {
  const code = String(crypto.randomInt(100000, 999999));
  db.prepare(`
    INSERT INTO telegram_link_codes (user_id, code, expires_at)
    VALUES (?, ?, datetime('now', '+15 minutes'))
  `).run(req.user.id, code);

  res.json({
    code,
    expires_in_minutes: 15,
    command: `/connect ${code}`,
    telegram_url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${code}`,
  });
});

// ── Models ──────────────────────────────────────────────

app.get('/api/models', (req, res) => {
  const { category, provider, search, sort } = req.query;
  let sql = 'SELECT * FROM models WHERE is_active = 1';
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
  const model = db.prepare('SELECT * FROM models WHERE id = ? AND is_active = 1').get(req.params.id);
  if (!model) return res.status(404).json({ error: 'Модель не найдена' });
  res.json(model);
});

// ── Chat / Messages ─────────────────────────────────────

function mapOpenRouterModel(modelId) {
  return OPENROUTER_MODEL_MAP[modelId] || modelId;
}

async function requestOpenRouterCompletion(modelId, content) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OpenRouter не настроен');
  }

  const response = await undiciFetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    dispatcher: openRouterDispatcher,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://justrouter.ru',
      'X-Title': 'JustRouter',
    },
    body: JSON.stringify({
      model: mapOpenRouterModel(modelId),
      messages: [{ role: 'user', content }],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('[openrouter] request failed', data);
    throw new Error(data?.error?.message || data?.message || 'Не удалось получить ответ от OpenRouter');
  }

  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('OpenRouter вернул пустой ответ');
  }

  return text;
}

function generateMockResponse(model, content, agentName = null) {
  const q = content.toLowerCase();
  if (agentName) {
    if (q.includes('привет') || q.includes('здравствуй')) return `Здравствуйте! Я агент ${agentName}. Чем могу помочь?`;
    if (q.includes('код') || q.includes('напиши')) return 'Конечно! Вот пример на Python:\n\n```python\ndef hello(name):\n    print(f"Привет, {name}!")\n\nhello("мир")\n```';
    return `Я агент ${agentName}. По вашему запросу «${content.slice(0, 50)}...» — интересная тема!`;
  }

  if (q.includes('привет') || q.includes('здравствуй')) return `Здравствуйте! Я ${model.name}. Чем могу помочь?`;
  if (q.includes('код') || q.includes('напиши')) return 'Конечно! Вот пример на Python:\n\n```python\ndef hello(name):\n    print(f"Привет, {name}!")\n\nhello("мир")\n```\n\nНужно что-то ещё?';
  if (q.includes('что ты')) return `Я — ${model.name} от ${model.provider}. Могу помочь с написанием кода, ответами на вопросы, анализом данных и многим другим.`;
  if (q.includes('погода')) return 'Извините, я — языковая модель и не имею доступа к реальным данным о погоде. Но я могу помочь с другими вопросами!';
  return `Интересный вопрос! Я — ${model.name}. По вашему запросу «${content.slice(0, 50)}...» могу сказать, что это многообещающая тема. Готов обсудить детали.`;
}

async function generateModelResponse(model, content, agentName = null) {
  if (OPENROUTER_API_KEY && model.category === 'text') {
    return requestOpenRouterCompletion(model.id, content);
  }
  return generateMockResponse(model, content, agentName);
}

app.post('/api/chat', authMiddleware, async (req, res) => {
  const { model_id, content } = req.body;
  if (!model_id || !content) return res.status(400).json({ error: 'model_id и content обязательны' });

  const model = db.prepare('SELECT * FROM models WHERE id = ? AND is_active = 1').get(model_id);
  if (!model) return res.status(404).json({ error: 'Модель не найдена' });

  // Check free requests
  const freeCount = db.prepare('SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND model_id = ? AND is_free = 1').get(req.user.id, model_id);
  const isFree = freeCount.count < 10;

  db.prepare('INSERT INTO messages (user_id, model_id, role, content, is_free) VALUES (?, ?, ?, ?, ?)').run(req.user.id, model_id, 'user', content, isFree ? 1 : 0);

  let response;
  try {
    response = await generateModelResponse(model, content);
  } catch (e) {
    console.error('[chat] response generation failed', e);
    return res.status(502).json({ error: e.message || 'Ошибка генерации ответа' });
  }

  db.prepare('INSERT INTO messages (user_id, model_id, role, content, is_free) VALUES (?, ?, ?, ?, ?)').run(req.user.id, model_id, 'assistant', response, isFree ? 1 : 0);

  if (!isFree) {
    // Deduct from balance if beyond free limit
    const cost = model.price * 0.0001;
    db.prepare('UPDATE users SET balance = MAX(0, balance - ?) WHERE id = ?').run(cost, req.user.id);
    db.prepare("INSERT INTO transactions (type, user_id, amount, description) VALUES ('user_payment', ?, ?, ?)").run(req.user.id, -cost, `Оплата ${model.name}: ${content.slice(0, 50)}`);
  }

  const balance = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.user.id).balance;
  void maybeNotifyLowBalance(req.user.id, balance);

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
app.post('/api/v1/chat', universalAuth, async (req, res) => {
  const { model_id, content } = req.body;
  if (!model_id || !content) return res.status(400).json({ error: 'model_id и content обязательны' });

  const model = db.prepare('SELECT * FROM models WHERE id = ? AND is_active = 1').get(model_id);
  if (!model) return res.status(404).json({ error: 'Модель не найдена' });

  if (req.authType === 'user') {
    const userId = req.authUser.id;

    // Check free requests
    const freeCount = db.prepare('SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND model_id = ? AND is_free = 1').get(userId, model_id);
    const isFree = freeCount.count < 10;

    db.prepare('INSERT INTO messages (user_id, model_id, role, content, is_free) VALUES (?, ?, ?, ?, ?)').run(userId, model_id, 'user', content, isFree ? 1 : 0);

    let response;
    try {
      response = await generateModelResponse(model, content);
    } catch (e) {
      console.error('[v1/chat] response generation failed', e);
      return res.status(502).json({ error: e.message || 'Ошибка генерации ответа' });
    }

    db.prepare('INSERT INTO messages (user_id, model_id, role, content, is_free) VALUES (?, ?, ?, ?, ?)').run(userId, model_id, 'assistant', response, isFree ? 1 : 0);

    if (!isFree) {
      const cost = model.price * 0.0001;
      db.prepare('UPDATE users SET balance = MAX(0, balance - ?) WHERE id = ?').run(cost, userId);
      db.prepare("INSERT INTO transactions (type, user_id, amount, description) VALUES ('user_payment', ?, ?, ?)").run(userId, -cost, `Оплата ${model.name}: ${content.slice(0, 50)}`);
    }

    const balance = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId).balance;
    void maybeNotifyLowBalance(userId, balance);

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

    let response;
    try {
      response = await generateModelResponse(model, content, req.agent.name);
    } catch (e) {
      console.error('[v1/chat agent] response generation failed', e);
      return res.status(502).json({ error: e.message || 'Ошибка генерации ответа' });
    }

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

  const model = db.prepare('SELECT * FROM models WHERE id = ? AND is_active = 1').get(model_id);
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

app.post('/api/admin/telegram/broadcast', adminMiddleware, async (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string' || message.trim().length < 1) {
    return res.status(400).json({ error: 'message обязателен' });
  }
  if (message.length > 3000) {
    return res.status(400).json({ error: 'message слишком длинный' });
  }

  const links = db.prepare('SELECT telegram_id FROM telegram_links WHERE marketing_enabled = 1').all();
  let sent = 0;
  for (const link of links) {
    const result = await sendTelegramMessage(link.telegram_id, message.trim());
    if (result?.ok) sent++;
  }

  res.json({ sent, total: links.length });
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

app.post('/api/admin/models/sync-openrouter', adminMiddleware, async (req, res) => {
  if (!OPENROUTER_API_KEY) {
    return res.status(400).json({ error: 'OPENROUTER_API_KEY не настроен' });
  }

  try {
    const count = await syncOpenRouterModels({
      db,
      apiKey: OPENROUTER_API_KEY,
      proxyUrl: OPENROUTER_PROXY_URL,
    });
    res.json({ success: true, count });
  } catch (e) {
    console.error('[openrouter] manual sync failed', e);
    res.status(500).json({ error: e.message || 'Не удалось синхронизировать модели OpenRouter' });
  }
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

  if (OPENROUTER_API_KEY) {
    syncOpenRouterModels({
      db,
      apiKey: OPENROUTER_API_KEY,
      proxyUrl: OPENROUTER_PROXY_URL,
    })
      .then((count) => console.log(`[openrouter] synced ${count} models`))
      .catch((e) => console.error('[openrouter] model sync failed', e));
  }
});
