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
import { checkpointDatabase } from './db.js';
import { syncOpenRouterModels, countModelsNeedingRussianTranslation, parseStoredVideoMeta, enrichModelVideoMetaRow, fetchOpenRouterVideoMeta } from './openrouter-models.js';
import {
  submitOpenRouterVideoJob,
  pollOpenRouterVideoJob,
  fetchOpenRouterVideoContent,
  estimateVideoCostRub,
  ensureOpenRouterCreditsForVideo,
  formatOpenRouterClientError,
} from './openrouter-video.js';
import {
  generateOpenRouterImage,
  imageCostRubFromUsage,
  estimateImageCostRub,
} from './openrouter-image.js';
import {
  normalizeImageList,
  normalizeStructuredImages,
  summarizeImagesForLog,
  validateVideoRequestForModel,
} from './media-utils.js';
import {
  getFreeRemaining,
  isFreeRequest,
  costRubFromOpenRouterUsage,
  estimateTextMessageCostRub,
  chargeUserBalance,
  hasTierCoverage,
  getActiveTierSubscription,
  TIER_DEFINITIONS,
  assertSufficientBalance,
  getPublicBalance,
  getTotalBalance,
  getWallet,
  toPublicUser,
  getAdminFinanceStats,
  getUserFinanceStats,
  sumUserFinanceStats,
  PRICE_MULTIPLIER,
} from './billing.js';
import {
  recordAnalyticsEvent,
  getAnalyticsSummary,
  getHeatmapClickData,
  getHeatmapMouseData,
  getScrollDepthData,
  getRageClickData,
  getSessionAnalytics,
  recordFunnelEvent,
} from './analytics.js';
import {
  getOrCreateConversation,
  getConversationMessages,
  generateSupportAssistantReply,
  formatConversationRow,
  getGuestToken,
} from './support.js';
import {
  applyReferralOnSignup,
  backfillReferralCodes,
  ensureUserReferralCode,
  findReferrerByCode,
  getReferralStats,
  isReferralPromoActive,
  normalizeReferralCode,
  REFERRAL_BONUS_RUB,
  getAdminReferralOverview,
  getAdminUserReferralInfo,
  creditReferralForTopup,
} from './referrals.js';
import { renderSeoHtml } from './seo-html.js';
import { isDisposableEmail } from '../shared/disposable-domains.js';
import { getSiteById } from './site-catalog.js';
import { syncBlogPostsFromDb } from '../shared/blog-posts.js';
import { isNoIndexPath } from './http-policy.js';
import { registerContentRoutes } from './routes/content.js';
import { registerSpaRoutes } from './routes/spa.js';
import { createRateLimit } from './rate-limit.js';
import { requireJsonFields, requirePositiveAmount } from './request-validation.js';
import { logger } from './logger.js';

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[.,;]+$/g, '');
}

const BCRYPT_ROUNDS = 10;
const ADMIN_EMAIL = normalizeEmail(process.env.ADMIN_EMAIL || 'admin@justrouter.ru');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

if (process.env.NODE_ENV === 'production' && ADMIN_PASSWORD === 'admin' && !process.env.ADMIN_PASSWORD) {
  console.warn('[security] Default ADMIN_PASSWORD blocked in production — set ADMIN_PASSWORD env var');
}

async function ensureAdminAccount() {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(ADMIN_EMAIL);
  if (existing) {
    db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(existing.id);
    return;
  }

  if (!process.env.ADMIN_PASSWORD) {
    console.warn(`[admin] Admin account ${ADMIN_EMAIL} not found and ADMIN_PASSWORD is not set`);
    return;
  }

  if (process.env.NODE_ENV === 'production' && ADMIN_PASSWORD === 'admin') {
    console.warn('[admin] Refusing to create admin with default password in production');
    return;
  }

  const hashedPw = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);
  db.prepare(`
    INSERT INTO users (email, password, name, balance, is_admin)
    VALUES (?, ?, 'Admin', 0, 1)
  `).run(ADMIN_EMAIL, hashedPw);
  console.log(`[admin] Created admin account ${ADMIN_EMAIL}`);
}

function resolveAdminLoginEmail(value) {
  const login = String(value || '').trim().toLowerCase();
  if (!login) return '';
  if (login.includes('@')) return normalizeEmail(login);
  if (login === 'admin' || login === (process.env.ADMIN_USERNAME || 'admin')) return ADMIN_EMAIL;
  return normalizeEmail(login);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const authRateLimit = createRateLimit({ windowMs: 15 * 60 * 1000, max: 20, keyPrefix: 'auth' });
const mediaRateLimit = createRateLimit({ windowMs: 60 * 1000, max: 30, keyPrefix: 'media' });
const publicWriteRateLimit = createRateLimit({ windowMs: 60 * 1000, max: 120, keyPrefix: 'public-write' });

app.use((req, res, next) => {
  if (isNoIndexPath(req.path)) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
  next();
});
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'JustRouterBot';
const TELEGRAM_WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL || `${process.env.SITE_URL || 'https://justrouter.ru'}/api/telegram/webhook`;
const TELEGRAM_PAYMENT_PROVIDER_TOKEN = process.env.TELEGRAM_PAYMENT_PROVIDER_TOKEN;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const LOW_BALANCE_THRESHOLD = Number(process.env.LOW_BALANCE_THRESHOLD || 100);
const JUSTROUTER_ADMIN_CHAT_ID = process.env.JUSTROUTER_ADMIN_CHAT_ID;
const EMAIL_CODE_TTL_MINUTES = Number(process.env.EMAIL_CODE_TTL_MINUTES || 15);
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.SMTP_USER || "noreply@justrouter.ru";
const YOOKASSA_SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const YOOKASSA_SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;
const YOOKASSA_RETURN_URL = process.env.YOOKASSA_RETURN_URL || 'https://justrouter.ru/account';

// ── Subscription pricing ──
const SUBSCRIPTION_PRICES = {
  base: { monthly: 499, yearly: 4990 },
  pro: { monthly: 1499, yearly: 14990 },
};
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_PROXY_URL = process.env.OPENROUTER_PROXY_URL;
const SUPPORT_MODEL_ID = process.env.SUPPORT_MODEL_ID || 'google/gemini-2.5-flash';
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
      pool: true,
      maxConnections: 2,
      maxMessages: 100,
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 15_000,
    })
  : null;

if (mailTransporter) {
  mailTransporter.verify().then(() => {
    console.log('[email] SMTP pool ready');
  }).catch((e) => {
    console.error('[email] SMTP verify failed', e.message);
  });
}

function queueVerificationEmail(email, code) {
  sendVerificationEmail(email, code).catch((e) => {
    console.error('[email] verification send failed (background)', {
      email,
      error: e.message,
      code: e.code,
    });
  });
}

async function sendVerificationEmailWithTimeout(email, code, mode, timeoutMs = 12_000) {
  let timeoutId;
  const sendTask = sendVerificationEmail(email, code, mode);
  const timeoutTask = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('SMTP timeout')), timeoutMs);
  });

  try {
    await Promise.race([sendTask, timeoutTask]);
    return true;
  } catch (e) {
    if (e.message === 'SMTP timeout') {
      console.warn('[email] SMTP handoff slow, continuing in background', { email });
      return false;
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function sendVerificationEmail(email, code, mode) {
  if (!mailTransporter) {
    throw new Error('SMTP не настроен');
  }

  const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER;
  const previewText = mode === 'reset' ? `Код восстановления пароля JustRouter: ${code}` : `Код подтверждения JustRouter: ${code}`;
  const info = await mailTransporter.sendMail({
    from: `"JustRouter" <${fromAddress}>`,
    to: email,
    subject: mode === 'reset' ? 'Восстановление пароля JustRouter' : 'Код подтверждения JustRouter',
    priority: 'high',
    text: mode === 'reset' ? `Ваш код для восстановления пароля JustRouter: ${code}\n\nКод действует ${EMAIL_CODE_TTL_MINUTES} минут.\n\nЕсли вы не запрашивали сброс пароля — проигнорируйте письмо.` : `Ваш код подтверждения JustRouter: ${code}\n\nКод действует ${EMAIL_CODE_TTL_MINUTES} минут.\n\nЕсли вы не регистрировались — проигнорируйте письмо.`,
    html: `
      <!doctype html>
      <html lang="ru">
        <body style="margin:0;padding:24px;background:#2f2f2f;font-family:Inter,Arial,sans-serif;color:#f7f1e8;">
          <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${previewText}</div>
          <div style="max-width:520px;margin:0 auto;background:#3a3a3a;border:1px solid rgba(247,241,232,0.14);border-radius:24px;padding:28px;">
            <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:rgba(247,241,232,.55);margin-bottom:10px;">JustRouter</div>
            <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;color:#f7f1e8;">${mode === 'reset' ? 'Восстановление пароля' : 'Подтверждение email'}</h1>
            <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:rgba(247,241,232,.72);">
              ${mode === 'reset' ? 'Введите код на странице, чтобы восстановить доступ к аккаунту.' : 'Введите код на странице регистрации, чтобы завершить создание аккаунта.'}
            </p>
            <div style="padding:20px;border-radius:18px;background:#f7f1e8;text-align:center;">
              <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#6f6f6f;margin-bottom:8px;">Код</div>
              <div style="font-family:Consolas,monospace;font-size:36px;font-weight:800;letter-spacing:.28em;color:#4f4f4f;">${code}</div>
                              </div>
            <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:rgba(247,241,232,.55);">
              ${mode === 'reset' ? `Код действует ${EMAIL_CODE_TTL_MINUTES} минут. Если вы не запрашивали сброс — просто проигнорируйте письмо.` : `Код действует ${EMAIL_CODE_TTL_MINUTES} минут. Если вы не регистрировались — просто проигнорируйте письмо.`}
            </p>
          </div>
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
app.set('trust proxy', 1);
app.use(express.json({ limit: '20mb' }));

function normalizeClientIp(ip) {
  return String(ip || '').replace(/^::ffff:/, '');
}

function isYookassaIp(ip) {
  const normalized = normalizeClientIp(ip);
  return normalized.startsWith('77.75.153.')
    || normalized.startsWith('77.75.154.')
    || normalized.startsWith('185.71.76.')
    || normalized.startsWith('185.71.77.');
}

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
}, 60000);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// ── Auth ──────────────────────────────────────────────

app.post('/api/auth/register', authRateLimit, requireJsonFields(['email', 'password', 'name']), async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  if (!rateLimit(`register:${ip}`, 5, 60000)) {
    return res.status(429).json({ error: 'Слишком много запросов. Попробуйте через минуту.' });
  }
  const { email, password, name, marketing_enabled = true, referral_code, ref } = req.body;
  if (!email || !password || !name) return res.status(400).json({ error: 'Заполните все поля' });
  if (password.length < 6) return res.status(400).json({ error: 'Пароль должен быть минимум 6 символов' });
  if (name.length > 50) return res.status(400).json({ error: 'Имя не может быть длиннее 50 символов' });

  // Block disposable / temporary email domains
  if (isDisposableEmail(email)) {
    return res.status(403).json({ error: 'Регистрация с одноразовых почтовых адресов запрещена. Используйте постоянный email.' });
  }

  const normalizedReferralCodeRaw = normalizeReferralCode(referral_code || ref);
  const normalizedReferralCode = normalizedReferralCodeRaw && findReferrerByCode(db, normalizedReferralCodeRaw)
    ? normalizedReferralCodeRaw
    : null;

  try {
    const normalizedEmail = normalizeEmail(email);
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) return res.status(409).json({ error: 'Пользователь с таким email уже существует' });

    // Email verification flow — store code, send email, create user after verification
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const code = String(crypto.randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60 * 1000).toISOString();

    // Remove old unused codes for this email
    db.prepare('DELETE FROM email_verification_codes WHERE email = ? AND used_at IS NULL').run(normalizedEmail);

    db.prepare(`
      INSERT INTO email_verification_codes (email, name, password_hash, code, marketing_enabled, referral_code, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(normalizedEmail, name.trim(), hashedPassword, code, marketing_enabled ? 1 : 0, normalizedReferralCode, expiresAt);

    let emailSent = false;
    try {
      emailSent = await sendVerificationEmailWithTimeout(normalizedEmail, code, null);
    } catch (e) {
      console.error('[auth] email error during register:', e.message);
      queueVerificationEmail(normalizedEmail, code);
    }

    if (!emailSent && !mailTransporter) {
      return res.status(503).json({ error: 'Почта для отправки кодов не настроена' });
    }

    console.log(`[auth] verification code sent to ${normalizedEmail}`);
    return res.json({ ok: true, message: 'Код отправлен на почту. Проверьте папку «Спам».' });
  } catch (e) {
    console.error('[auth] register failed', { email, error: e.message });
    res.status(500).json({ error: 'Не удалось создать пользователя. Попробуйте ещё раз.' });
  }
});

app.post('/api/auth/resend-verification', authRateLimit, requireJsonFields(['email']), async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  if (!rateLimit(`resend_verify:${ip}`, 3, 60000)) {
    return res.status(429).json({ error: 'Слишком много запросов. Попробуйте через минуту.' });
  }

  const email = normalizeEmail(req.body.email);
  if (!email) return res.status(400).json({ error: 'Введите email' });

  const verification = db.prepare(`
    SELECT * FROM email_verification_codes
    WHERE email = ? AND used_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `).get(email);

  if (!verification) {
    return res.status(400).json({ error: 'Регистрация не найдена. Заполните форму заново.' });
  }
  if (new Date(verification.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: 'Код истёк. Заполните форму регистрации заново.' });
  }

  if (!mailTransporter) {
    return res.status(503).json({ error: 'Почта для отправки кодов не настроена' });
  }

  const newCode = String(crypto.randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60 * 1000).toISOString();
  db.prepare(`
    UPDATE email_verification_codes
    SET code = ?, attempts = 0, expires_at = ?
    WHERE id = ?
  `).run(newCode, expiresAt, verification.id);

  try {
    const sentNow = await sendVerificationEmailWithTimeout(email, newCode, null);
    res.json({
      message: sentNow ? 'Код отправлен повторно' : 'Код отправляется — письмо может прийти в течение 1–2 минут',
      email_sent: sentNow,
    });
  } catch (e) {
    console.error('[email] resend failed', { email, error: e.message });
    queueVerificationEmail(email, newCode);
    res.status(503).json({ error: 'Не удалось отправить код. Попробуйте ещё раз через минуту.' });
  }
});

// POST /api/auth/forgot-password — send reset code
app.post('/api/auth/forgot-password', authRateLimit, requireJsonFields(['email']), async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!email) return res.status(400).json({ error: 'Введите email' });

  const user = db.prepare('SELECT id, name, email FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.json({ ok: true, message: 'Если такой email зарегистрирован, код будет отправлен.' });
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + EMAIL_CODE_TTL_MINUTES * 60 * 1000).toISOString();

  db.prepare('DELETE FROM email_verification_codes WHERE email = ? AND used_at IS NULL').run(email);
  db.prepare("INSERT INTO email_verification_codes (email, code, password_hash, expires_at) VALUES (?, ?, '" + "__reset__" + "', ?)").run(email, code, expiresAt);

  let emailSent = false;
  try {
    emailSent = await sendVerificationEmailWithTimeout(email, code, 'reset');
  } catch (e) {
    console.error('[auth] forgot-password email error:', e.message);
    queueVerificationEmail(email, code);
  }

  if (!emailSent && !mailTransporter) {
    return res.status(503).json({ error: 'Почта для отправки кодов не настроена' });
  }

  console.log('[auth] password reset code sent to', email);
  return res.json({ ok: true, message: 'Код отправлен на почту. Проверьте папку «Спам».' });
});

// POST /api/auth/reset-password — verify code and update password
app.post('/api/auth/reset-password', authRateLimit, requireJsonFields(['email', 'code', 'password']), async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const code = String(req.body.code || '').trim();
  const password = req.body.password;

  if (!email || !code || !password) return res.status(400).json({ error: 'Заполните все поля' });
  if (password.length < 6) return res.status(400).json({ error: 'Пароль должен быть минимум 6 символов' });

  const verification = db.prepare('SELECT * FROM email_verification_codes WHERE email = ? AND code = ? AND used_at IS NULL').get(email, code);

  if (!verification) {
    return res.status(400).json({ error: 'Неверный код' });
  }
  if (new Date(verification.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: 'Код истёк. Запросите новый.' });
  }

  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
  db.prepare('UPDATE users SET password_hash = ? WHERE email = ?').run(hashedPassword, email);
  db.prepare("UPDATE email_verification_codes SET used_at = datetime('now') WHERE id = ?").run(verification.id);

  console.log('[auth] password reset for', email);
  return res.json({ ok: true, message: 'Пароль успешно изменён. Войдите с новым паролем.' });
});


function notifyAdmin(text) {
  const ADMIN_CHAT_ID = JUSTROUTER_ADMIN_CHAT_ID || '1051395584';
  if (!TELEGRAM_BOT_TOKEN) return;
  fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: ADMIN_CHAT_ID,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  }).catch(err => console.error('[notifyAdmin] failed:', err.message));
}

app.post('/api/auth/verify-email', authRateLimit, requireJsonFields(['email', 'code']), (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  if (!rateLimit(`verify_email:${ip}`, 10, 60000)) {
    return res.status(429).json({ error: 'Слишком много попыток. Попробуйте через минуту.' });
  }

  const email = normalizeEmail(req.body.email);
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

    const tx = db.transaction(() => {
        const marked = db.prepare(`
          UPDATE email_verification_codes
          SET used_at = datetime('now')
          WHERE id = ? AND used_at IS NULL
        `).run(verification.id);
        if (marked.changes === 0) {
          const err = new Error('Код уже использован');
          err.statusCode = 409;
          throw err;
        }

        const result = db.prepare(`
          INSERT INTO users (email, password, name, balance, api_key, marketing_enabled)
          VALUES (?, ?, ?, 0, ?, ?)
        `).run(email, verification.password_hash, verification.name, userApiKey, verification.marketing_enabled ? 1 : 0);
        const userId = result.lastInsertRowid;
        db.prepare('INSERT INTO sessions (user_id, token) VALUES (?, ?)').run(userId, token);

        ensureUserReferralCode(db, userId);

      if (verification.referral_code) {
        applyReferralOnSignup(db, {
          referredUserId: userId,
          referralCode: verification.referral_code,
          referredEmail: email,
        });
      }

      return userId;
    });

    const userId = tx();

    // Notify admin about new registration
    try {
      notifyAdmin('🆕 <b>Новая регистрация</b>\nИмя: ' + (verification.name || '—') + '\nEmail: ' + email + '\nРеферальный код: ' + (verification.referral_code || '—'));
    } catch (e) {}

    const user = toPublicUser(db, {
      id: userId,
        email,
        name: verification.name,
        api_key: userApiKey,
        marketing_enabled: Boolean(verification.marketing_enabled),
    });

    res.json({
      token,
      user,
      referral_promo_active: isReferralPromoActive(),
      referral_bonus_rub: REFERRAL_BONUS_RUB,
    });
  } catch (e) {
    if (e.statusCode === 409) {
      return res.status(409).json({ error: e.message });
    }
    res.status(500).json({ error: 'Ошибка подтверждения регистрации' });
  }
});

app.post('/api/auth/login', authRateLimit, requireJsonFields(['email', 'password']), async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  if (!rateLimit(`login:${ip}`, 10, 60000)) {
    return res.status(429).json({ error: 'Слишком много запросов. Попробуйте через минуту.' });
  }
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Заполните все поля' });

  const normalizedEmail = normalizeEmail(email);
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
  if (!user) {
    const pending = db.prepare(`
      SELECT id FROM email_verification_codes
      WHERE email = ? AND used_at IS NULL AND datetime(expires_at) > datetime('now')
      ORDER BY created_at DESC
      LIMIT 1
    `).get(normalizedEmail);

    if (pending) {
      return res.status(403).json({
        error: 'Подтвердите email — код уже отправлен на почту. Войти можно после подтверждения.',
        pending_verification: true,
        email: normalizedEmail,
      });
    }

    return res.status(401).json({ error: 'Неверный email или пароль' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Неверный email или пароль' });

  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (user_id, token) VALUES (?, ?)').run(user.id, token);

  res.json({
    token,
    user: toPublicUser(db, user),
    referral_promo_active: isReferralPromoActive(),
    referral_bonus_rub: REFERRAL_BONUS_RUB,
  });
});

app.get('/api/referrals/me', authMiddleware, (req, res) => {
  try {
    res.json(getReferralStats(db, req.user.id));
  } catch (e) {
    console.error('[referrals] stats failed', e);
    res.status(500).json({ error: 'Не удалось загрузить реферальную программу' });
  }
});

app.get('/api/referrals/promo', authMiddleware, (req, res) => {
  res.json({
    promo_active: isReferralPromoActive(),
    bonus_rub: REFERRAL_BONUS_RUB,
  });
});

// ── OAuth: Yandex, Google, Apple ──
const OAUTH_CONFIG = {
  yandex: {
    authorizeUrl: 'https://oauth.yandex.ru/authorize',
    tokenUrl: 'https://oauth.yandex.ru/token',
    userInfoUrl: 'https://login.yandex.ru/info',
    clientId: process.env.OAUTH_YANDEX_CLIENT_ID || '',
    clientSecret: process.env.OAUTH_YANDEX_CLIENT_SECRET || '',
    redirectUri: process.env.OAUTH_YANDEX_REDIRECT_URI || '',
    scope: 'login:email login:info',
    userField: 'oauth_yandex_id',
    parseUser: (data) => ({ id: String(data.id), email: data.default_email, name: data.real_name || data.display_name || data.login }),
  },
  google: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    clientId: process.env.OAUTH_GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.OAUTH_GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.OAUTH_GOOGLE_REDIRECT_URI || '',
    scope: 'openid email profile',
    userField: 'oauth_google_id',
    parseUser: (data) => ({ id: String(data.id), email: data.email, name: data.name }),
  },
  apple: {
    authorizeUrl: 'https://appleid.apple.com/auth/authorize',
    tokenUrl: 'https://appleid.apple.com/auth/token',
    userInfoUrl: null,
    clientId: process.env.OAUTH_APPLE_CLIENT_ID || '',
    clientSecret: process.env.OAUTH_APPLE_CLIENT_SECRET || '',
    redirectUri: process.env.OAUTH_APPLE_REDIRECT_URI || '',
    scope: 'name email',
    userField: 'oauth_apple_id',
    parseUser: (data) => ({ id: data.sub, email: data.email || '', name: (data.name?.firstName || '') + ' ' + (data.name?.lastName || '') || data.email?.split('@')[0] || 'User' }),
  },
};

// Redirect to OAuth provider
app.get('/api/auth/oauth/:provider', (req, res) => {
  const provider = OAUTH_CONFIG[req.params.provider];
  if (!provider) return res.status(400).json({ error: 'Unknown provider' });
  if (!provider.clientId) return res.status(503).json({ error: 'OAuth не настроен для этого провайдера' });
  const state = crypto.randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: provider.clientId,
    redirect_uri: provider.redirectUri,
    scope: provider.scope,
    state,
  });
  res.redirect(provider.authorizeUrl + '?' + params.toString());
});

// OAuth callback
app.get('/api/auth/oauth/:provider/callback', async (req, res) => {
  const provider = OAUTH_CONFIG[req.params.provider];
  if (!provider) return res.status(400).send('Unknown provider');
  const { code, state } = req.query;
  if (!code) return res.status(400).send('No code provided');

  try {
    // Exchange code for token
    const tokenResponse = await undiciFetch(provider.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: provider.clientId,
        client_secret: provider.clientSecret,
        redirect_uri: provider.redirectUri,
      }).toString(),
    });
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
      return res.status(400).send('OAuth error: ' + (tokenData.error || 'no access_token'));
    }

    // Fetch user info
    let userData = {};
    if (provider.userInfoUrl) {
      const userResponse = await undiciFetch(provider.userInfoUrl, {
        headers: { Authorization: 'Bearer ' + tokenData.access_token },
      });
      userData = await userResponse.json();
    } else if (tokenData.id_token) {
      // Apple: decode id_token JWT
      const parts = tokenData.id_token.split('.');
      if (parts.length === 3) {
        userData = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      }
    }

    const oauthUser = provider.parseUser(userData);
    if (!oauthUser.id) return res.status(400).send('Could not get user info from provider');

    // Find or create user
    const existing = db.prepare(`SELECT * FROM users WHERE ${provider.userField} = ?`).get(oauthUser.id);
    let userId;
    if (existing) {
      userId = existing.id;
    } else {
      // Try to link by email
      const emailUser = oauthUser.email ? db.prepare('SELECT * FROM users WHERE email = ?').get(oauthUser.email) : null;
      if (emailUser) {
        db.prepare(`UPDATE users SET ${provider.userField} = ? WHERE id = ?`).run(oauthUser.id, emailUser.id);
        userId = emailUser.id;
      } else {
        // Create new user
        const fakePassword = crypto.randomBytes(24).toString('hex');
        const hashedPassword = await bcrypt.hash(fakePassword, 10);
        const apiKey = 'jr_' + crypto.randomBytes(24).toString('hex');
        const email = oauthUser.email || `oauth_${req.params.provider}_${oauthUser.id}@justrouter.local`;
        const name = oauthUser.name || oauthUser.email?.split('@')[0] || 'User';
        const result = db.prepare(`
          INSERT INTO users (email, password, name, api_key, ${provider.userField})
          VALUES (?, ?, ?, ?, ?)
        `).run(email, hashedPassword, name, apiKey, oauthUser.id);
        userId = result.lastInsertRowid;
        ensureUserReferralCode(db, userId);
      }
    }

    // Create session
    const token = crypto.randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions (user_id, token) VALUES (?, ?)').run(userId, token);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    // Return HTML page that posts a message to the opener window
    const script = `
      <script>
        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth-success',
            payload: ${JSON.stringify({ token, user: toPublicUser(db, user), referral_promo_active: isReferralPromoActive(), referral_bonus_rub: REFERRAL_BONUS_RUB })}
          }, '*');
          window.close();
        } else {
          document.write('OAuth успешен. Закройте это окно.');
        }
      </script>
    `;
    res.send('<!DOCTYPE html><html><body>' + script + '</body></html>');
  } catch (e) {
    console.error('[oauth] callback error:', e.message);
    res.status(500).send('OAuth error: ' + e.message);
  }
});

app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Не авторизован' });

  const session = db.prepare(`
    SELECT users.id, users.email, users.name, users.api_key, users.created_at, users.marketing_enabled
    FROM sessions JOIN users ON sessions.user_id = users.id
    WHERE sessions.token = ?
  `).get(token);

  if (!session) return res.status(401).json({ error: 'Сессия не найдена' });
  res.json(toPublicUser(db, session));
});

app.patch('/api/auth/settings', authMiddleware, (req, res) => {
  const { marketing_enabled } = req.body;
  if (marketing_enabled === undefined) {
    return res.status(400).json({ error: 'Нет полей для обновления' });
  }

  db.prepare('UPDATE users SET marketing_enabled = ? WHERE id = ?')
    .run(marketing_enabled ? 1 : 0, req.user.id);

  const user = db.prepare('SELECT id, email, name, api_key, created_at, marketing_enabled FROM users WHERE id = ?')
    .get(req.user.id);

  res.json({ user: toPublicUser(db, user) });
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
    SELECT users.id, users.email, users.name, users.api_key
    FROM sessions JOIN users ON sessions.user_id = users.id
    WHERE sessions.token = ?
  `).get(token);

  if (!session) return res.status(401).json({ error: 'Сессия не найдена' });
  req.user = { ...session, ...getPublicBalance(db, session.id) };
  next();
}

function optionalAuthMiddleware(req, _res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    const session = db.prepare(`
      SELECT users.id, users.email, users.name, users.api_key
      FROM sessions JOIN users ON sessions.user_id = users.id
      WHERE sessions.token = ?
    `).get(token);
    if (session) {
      req.user = { ...session, ...getPublicBalance(db, session.id) };
    }
  }
  next();
}

function resolveSupportGuestToken(req) {
  return String(req.headers['x-guest-token'] || req.body?.guest_token || '').trim() || null;
}

function assertSupportConversationAccess(conversation, { userId, guestToken }) {
  if (!conversation) return false;
  if (userId) return conversation.user_id === userId;
  return guestToken && conversation.guest_token === guestToken;
}

// ── Support chat ─────────────────────────────────────────

app.get('/api/support/conversation', optionalAuthMiddleware, (req, res) => {
  const guestToken = resolveSupportGuestToken(req);
  if (!req.user?.id && !guestToken) {
    const token = getGuestToken();
    const conversation = getOrCreateConversation(db, { guestToken: token });
    return res.json({
      conversation_id: conversation.id,
      guest_token: conversation.guest_token,
      handoff_to_human: !!conversation.handoff_to_human,
      messages: [],
    });
  }

  const conversation = getOrCreateConversation(db, {
    userId: req.user?.id,
    guestToken: req.user?.id ? null : guestToken,
  });

  res.json({
    conversation_id: conversation.id,
    guest_token: conversation.guest_token || guestToken,
    handoff_to_human: !!conversation.handoff_to_human,
    messages: getConversationMessages(db, conversation.id),
  });
});

app.post('/api/support/messages', publicWriteRateLimit, optionalAuthMiddleware, async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  if (!rateLimit(`support:${ip}`, 30, 60000)) {
    return res.status(429).json({ error: 'Слишком много сообщений. Подождите немного.' });
  }

  const content = String(req.body?.content || '').trim();
  if (!content) return res.status(400).json({ error: 'Введите сообщение' });
  if (content.length > 4000) return res.status(400).json({ error: 'Сообщение слишком длинное' });

  const guestToken = resolveSupportGuestToken(req);
  const conversation = getOrCreateConversation(db, {
    userId: req.user?.id,
    guestToken: req.user?.id ? null : guestToken,
  });

  if (!assertSupportConversationAccess(conversation, { userId: req.user?.id, guestToken })) {
    return res.status(403).json({ error: 'Нет доступа к этому чату' });
  }

  const insertUserMessage = db.prepare(`
    INSERT INTO support_messages (conversation_id, role, content)
    VALUES (?, 'user', ?)
  `);
  const insertAssistantMessage = db.prepare(`
    INSERT INTO support_messages (conversation_id, role, content)
    VALUES (?, 'assistant', ?)
  `);
  const touchConversation = db.prepare(`
    UPDATE support_conversations SET updated_at = datetime('now') WHERE id = ?
  `);

  insertUserMessage.run(conversation.id, content);
  touchConversation.run(conversation.id);

  const freshConversation = db.prepare('SELECT * FROM support_conversations WHERE id = ?').get(conversation.id);
  let assistantReply = null;

  if (!freshConversation.handoff_to_human) {
    try {
      assistantReply = await generateSupportAssistantReply(db, conversation.id, {
        apiKey: OPENROUTER_API_KEY,
        modelIdEnv: SUPPORT_MODEL_ID,
        modelMap: OPENROUTER_MODEL_MAP,
        dispatcher: openRouterDispatcher,
      });
      insertAssistantMessage.run(conversation.id, assistantReply);
      touchConversation.run(conversation.id);
    } catch (e) {
      console.error('[support] assistant reply failed', e);
      assistantReply = 'Извините, не удалось получить автоматический ответ. Оператор ответит в этом чате.';
      insertAssistantMessage.run(conversation.id, assistantReply);
      db.prepare('UPDATE support_conversations SET handoff_to_human = 1, updated_at = datetime(\'now\') WHERE id = ?')
        .run(conversation.id);
      touchConversation.run(conversation.id);
    }
  }

  res.json({
    conversation_id: conversation.id,
    guest_token: conversation.guest_token || guestToken,
    handoff_to_human: !!db.prepare('SELECT handoff_to_human FROM support_conversations WHERE id = ?').get(conversation.id)?.handoff_to_human,
    messages: getConversationMessages(db, conversation.id),
    assistant_reply: assistantReply,
  });
});

app.get('/api/support/messages', optionalAuthMiddleware, (req, res) => {
  const conversationId = Number(req.query.conversation_id);
  const guestToken = resolveSupportGuestToken(req);
  if (!conversationId) return res.status(400).json({ error: 'conversation_id обязателен' });

  const conversation = db.prepare('SELECT * FROM support_conversations WHERE id = ?').get(conversationId);
  if (!assertSupportConversationAccess(conversation, { userId: req.user?.id, guestToken })) {
    return res.status(403).json({ error: 'Нет доступа к этому чату' });
  }

  res.json({
    conversation_id: conversation.id,
    handoff_to_human: !!conversation.handoff_to_human,
    messages: getConversationMessages(db, conversation.id),
  });
});

app.post('/api/billing/yookassa/payment', authMiddleware, requirePositiveAmount('amount'), async (req, res) => {
  const amount = Number(req.body.amount);
  const siteId = typeof req.body.site_id === 'string' ? req.body.site_id.trim() : '';
  const siteTitle = typeof req.body.site_title === 'string' ? req.body.site_title.trim() : '';
  const isSitePurchase = Boolean(siteId);
  let minAmount = 10;
  let maxAmount = 100000;
  if (isSitePurchase) {
    minAmount = 0;
    maxAmount = 5000;
  }

  if (!Number.isFinite(amount) || amount < minAmount) {
    return res.status(400).json({
      error: isSitePurchase ? 'Цена шаблона от 0 ₽ (есть бесплатные)' : 'Минимальная сумма пополнения 10 ₽',
    });
  }

  if (isSitePurchase && amount > maxAmount) {
    return res.status(400).json({ error: 'Максимальная цена шаблона 5000 ₽' });
  }

  try {
    const payment = await createYookassaPayment({
      userId: req.user.id,
      email: req.user.email,
      amount,
      siteId: siteId || undefined,
      siteTitle: siteTitle || undefined,
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

app.get('/api/billing/site-purchases', authMiddleware, (req, res) => {
  const rows = db.prepare('SELECT site_id FROM site_purchases WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ site_ids: rows.map((row) => row.site_id) });
});

app.get('/api/billing/site-prompt/:siteId', authMiddleware, (req, res) => {
  const siteId = String(req.params.siteId || '').trim();
  const site = getSiteById(siteId);

  if (!site) {
    return res.status(404).json({ error: 'Шаблон не найден' });
  }

  const owned = db.prepare('SELECT id FROM site_purchases WHERE user_id = ? AND site_id = ?').get(req.user.id, siteId);
  if (!owned) {
    return res.status(403).json({ error: 'Сначала купите шаблон' });
  }

  res.json({ site_id: siteId, prompt: site.promptRu });
});

app.post('/api/billing/site-purchase', authMiddleware, (req, res) => {
  const siteId = typeof req.body.site_id === 'string' ? req.body.site_id.trim() : '';
  const site = getSiteById(siteId);

  if (!site) {
    return res.status(404).json({ error: 'Шаблон не найден' });
  }

  const owned = db.prepare('SELECT id FROM site_purchases WHERE user_id = ? AND site_id = ?').get(req.user.id, siteId);
  if (owned) {
    const { balance } = getPublicBalance(db, req.user.id);
    return res.json({
      already_owned: true,
      site_id: siteId,
      prompt: site.promptRu,
      balance,
    });
  }

  try {
    if (site.priceRub > 0) {
      chargeUserBalance(db, req.user.id, site.priceRub, `Покупка шаблона «${site.titleRu}»`);
    }
    db.prepare('INSERT INTO site_purchases (user_id, site_id, amount) VALUES (?, ?, ?)').run(req.user.id, siteId, site.priceRub);
    const { balance } = getPublicBalance(db, req.user.id);
    res.json({
      site_id: siteId,
      prompt: site.promptRu,
      cost: site.priceRub,
      balance,
    });
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message || 'Не удалось списать средства' });
  }
});

// ── Subscriptions ──

app.post('/api/billing/subscription/create', authMiddleware, async (req, res) => {
  const { plan_type, period } = req.body;
  const validPlans = ['base', 'pro'];
  const validPeriods = ['monthly', 'yearly'];

  if (!validPlans.includes(plan_type) || !validPeriods.includes(period)) {
    return res.status(400).json({ error: 'Некорректный тариф или период' });
  }

  if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
    return res.status(503).json({ error: 'ЮKassa не настроена' });
  }

  const amount = SUBSCRIPTION_PRICES[plan_type][period];
  const description = `Подписка ${plan_type === 'base' ? 'Base' : 'Pro'} — ${period === 'monthly' ? 'ежемесячно' : 'ежегодно'}`;
  const idempotenceKey = crypto.randomUUID();

  try {
    const payload = {
      amount: { value: amount.toFixed(2), currency: 'RUB' },
      capture: true,
      confirmation: { type: 'redirect', return_url: YOOKASSA_RETURN_URL },
      description: `${description} — ${formatRub(amount)}`,
      metadata: {
        user_id: String(req.user.id),
        source: 'subscription',
        plan_type,
        period,
      },
      receipt: {
        customer: { email: req.user.email },
        items: [
          {
            description,
            quantity: '1.00',
            amount: { value: amount.toFixed(2), currency: 'RUB' },
            vat_code: 1,
            payment_mode: 'full_payment',
            payment_subject: 'service',
          },
        ],
      },
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
      console.error('[subscription] create payment failed', data);
      throw new Error(data?.description || 'Не удалось создать платёж ЮKassa');
    }

    // Create yookassa_payments record
    const ypResult = db.prepare(`
      INSERT INTO yookassa_payments (user_id, payment_id, idempotence_key, amount, status, confirmation_url, raw_payload)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, data.id, idempotenceKey, amount, data.status || 'pending', data.confirmation?.confirmation_url || null, JSON.stringify(data));

    // Create pending subscription record linked to this payment
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + (period === 'monthly' ? 30 : 365));

    db.prepare(`
      INSERT INTO subscriptions (user_id, plan_type, period, status, end_date, yookassa_payment_id)
      VALUES (?, ?, ?, 'pending', ?, ?)
    `).run(req.user.id, plan_type, period, endDate.toISOString(), data.id);

    // Link yookassa_payment to subscription
    db.prepare('UPDATE yookassa_payments SET subscription_id = last_insert_rowid() WHERE id = ?').run(ypResult.lastInsertRowid);

    res.json({
      payment_id: data.id,
      status: data.status,
      confirmation_url: data.confirmation?.confirmation_url,
      plan_type,
      period,
      amount,
    });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Ошибка создания подписки' });
  }
});

app.get('/api/billing/subscription/status', authMiddleware, (req, res) => {
  const active = db.prepare(`
    SELECT id, plan_type, period, status, start_date, end_date, auto_renew
    FROM subscriptions
    WHERE user_id = ? AND status = 'active' AND end_date > datetime('now')
    ORDER BY end_date DESC
    LIMIT 1
  `).get(req.user.id);

  const pending = db.prepare(`
    SELECT id, plan_type, period, status, created_at, end_date
    FROM subscriptions
    WHERE user_id = ? AND status = 'pending'
    ORDER BY created_at DESC
    LIMIT 1
  `).get(req.user.id);

  res.json({ active, pending });
});

app.post('/api/billing/subscription/cancel', authMiddleware, (req, res) => {
  const sub = db.prepare(`
    SELECT id, auto_renew FROM subscriptions
    WHERE user_id = ? AND status = 'active' AND end_date > datetime('now')
    ORDER BY end_date DESC LIMIT 1
  `).get(req.user.id);

  if (!sub) {
    return res.status(404).json({ error: 'Нет активной подписки' });
  }

  db.prepare('UPDATE subscriptions SET auto_renew = 0, updated_at = datetime(\'now\') WHERE id = ?').run(sub.id);
  res.json({ ok: true, message: 'Автопродление отключено. Подписка действует до конца оплаченного периода.' });
});

// ── Tier subscription: purchase one-time unlimited access ──
app.post('/api/billing/subscription/tier', authMiddleware, async (req, res) => {
  const { tier } = req.body;
  const validTiers = ['starter', 'standard', 'premium'];
  if (!validTiers.includes(tier)) {
    return res.status(400).json({ error: 'Некорректный тариф. Доступно: starter, standard, premium' });
  }
  if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
    return res.status(503).json({ error: 'ЮKassa не настроена' });
  }

  const tierDef = TIER_DEFINITIONS[tier];
  const amount = tierDef.price;
  const description = 'Безлимит ' + tierDef.label;
  const idempotenceKey = crypto.randomUUID();

  try {
    const payload = {
      amount: { value: amount.toFixed(2), currency: 'RUB' },
      capture: true,
      confirmation: { type: 'redirect', return_url: YOOKASSA_RETURN_URL },
      description: description + ' — ' + formatRub(amount),
      metadata: {
        user_id: String(req.user.id),
        source: 'tier_subscription',
        tier_subscription: tier,
      },
      receipt: {
        customer: { email: req.user.email },
        items: [
          {
            description,
            quantity: '1.00',
            amount: { value: amount.toFixed(2), currency: 'RUB' },
            vat_code: 1,
            payment_mode: 'full_payment',
            payment_subject: 'service',
          },
        ],
      },
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
      console.error('[tier-subscription] create payment failed', data);
      throw new Error(data?.description || 'Не удалось создать платёж ЮKassa');
    }

    const ypResult = db.prepare(`
      INSERT INTO yookassa_payments (user_id, payment_id, idempotence_key, amount, status, confirmation_url, raw_payload)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(req.user.id, data.id, idempotenceKey, amount, data.status || 'pending', data.confirmation?.confirmation_url || null, JSON.stringify(data));

    // Create pending tier subscription
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);

    db.prepare(`
      INSERT INTO subscriptions (user_id, plan_type, period, status, end_date, tier, yookassa_payment_id)
      VALUES (?, 'tier', 'monthly', 'pending', ?, ?, ?)
    `).run(req.user.id, endDate.toISOString(), tier, data.id);

    db.prepare('UPDATE yookassa_payments SET subscription_id = last_insert_rowid() WHERE id = ?').run(ypResult.lastInsertRowid);

    res.json({
      payment_id: data.id,
      status: data.status,
      confirmation_url: data.confirmation?.confirmation_url,
      tier,
      amount,
    });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Ошибка создания подписки' });
  }
});

// ── Tier info: return tier definitions with model lists for the modal ──
app.get('/api/subscription/tiers-info', (req, res) => {
  const tiers = {};
  for (const [key, def] of Object.entries(TIER_DEFINITIONS)) {
    const categories = {};
    let totalModelCount = 0;
    let allSampleModels = [];

    for (const [catKey, catDef] of Object.entries(def.categories)) {
      let query;
      let params;
      if (catDef.minPrice !== undefined) {
        query = `SELECT COUNT(*) as c FROM models WHERE is_active = 1 AND category = ? AND price > 0 AND price >= ? AND price <= ?`;
        params = [catKey, catDef.minPrice, catDef.maxPrice];
      } else {
        query = `SELECT COUNT(*) as c FROM models WHERE is_active = 1 AND category = ? AND price > 0 AND price <= ?`;
        params = [catKey, catDef.maxPrice];
      }
      const count = db.prepare(query).get(...params).c;
      totalModelCount += count;

      // Sample models for this category
      let samples;
      if (catDef.minPrice !== undefined) {
        samples = db.prepare(`
          SELECT id, name, provider, category, price
          FROM models WHERE is_active = 1 AND category = ? AND price > 0 AND price >= ? AND price <= ?
          ORDER BY price ASC LIMIT 4
        `).all(catKey, catDef.minPrice, catDef.maxPrice);
      } else {
        samples = db.prepare(`
          SELECT id, name, provider, category, price
          FROM models WHERE is_active = 1 AND category = ? AND price > 0 AND price <= ?
          ORDER BY price ASC LIMIT 4
        `).all(catKey, catDef.maxPrice);
      }

      categories[catKey] = {
        label: catDef.label,
        desc: catDef.desc,
        count,
        sampleModels: samples,
      };
      allSampleModels = allSampleModels.concat(samples);
    }

    tiers[key] = {
      key,
      label: def.label,
      price: def.price,
      modelCount: totalModelCount,
      categories,
      sampleModels: allSampleModels,
    };
  }
  res.json({ tiers });
});

app.post('/api/yookassa/webhook', (req, res) => {
  const clientIp = normalizeClientIp(req.ip || req.connection?.remoteAddress);
  if (!isYookassaIp(clientIp)) {
    console.warn('[yookassa] webhook rejected from untrusted IP', clientIp);
    return res.status(403).json({ error: 'Forbidden' });
  }

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
      const paidAmount = Number(existing.amount);
      const webhookAmount = Number(payment.amount?.value);
      if (Number.isFinite(webhookAmount) && Math.abs(webhookAmount - paidAmount) > 0.01) {
        console.error('[yookassa] amount mismatch', { payment_id: payment.id, stored: paidAmount, webhook: webhookAmount });
      }

      const tx = db.transaction(() => {
        db.prepare('UPDATE yookassa_payments SET status = ?, raw_payload = ?, paid_at = datetime(\'now\') WHERE id = ? AND status != ?')
          .run('succeeded', JSON.stringify(req.body), existing.id, 'succeeded');

        // If this is a subscription payment, activate the subscription
        if (existing.subscription_id) {
          const sub = db.prepare('SELECT id, end_date FROM subscriptions WHERE id = ? AND status = ?').get(existing.subscription_id, 'pending');
          if (sub) {
            db.prepare(`
              UPDATE subscriptions SET status = 'active', start_date = datetime('now'), updated_at = datetime('now')
              WHERE id = ?
            `).run(existing.subscription_id);
            console.log('[subscription] activated', { subscription_id: existing.subscription_id, user_id: existing.user_id, end_date: sub.end_date });
          }
          // Also record a topup transaction so subscription revenue is counted in financial analytics
          db.prepare("INSERT INTO transactions (type, user_id, amount, description) VALUES ('topup', ?, ?, ?)")
            .run(existing.user_id, paidAmount, `Подписка ЮKassa: ${payment.id}`);
        } else {
          // Regular topup — add to balance + bonus ladder (20% bonus)
          const bonusAmount = Math.floor(paidAmount * 0.2);
          db.prepare('UPDATE users SET balance = balance + ?, bonus_balance = COALESCE(bonus_balance, 0) + ? WHERE id = ?')
            .run(paidAmount, bonusAmount, existing.user_id);
          db.prepare("INSERT INTO transactions (type, user_id, amount, description) VALUES ('topup', ?, ?, ?)")
        }
      });
      tx();
      // Credit referral bonus if this is the referred user's first topup
      if (!existing.subscription_id) {
        creditReferralForTopup(db, existing.user_id);
      }
        // Notify admin about topup
    try {
      const user = db.prepare('SELECT name, email FROM users WHERE id = ?').get(existing.user_id);
      const name = user?.name || '—';
      const email = user?.email || '—';
      notifyAdmin('💰 <b>Пополнение</b>\nСумма: ' + paidAmount + ' ₽\nИмя: ' + name + '\nEmail: ' + email + '\nМетод: ' + (existing.subscription_id ? 'Подписка' : 'Баланс'));
    } catch (e) {}

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

async function createYookassaPayment({ userId, email, amount, siteId, siteTitle }) {
  if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
    throw new Error('ЮKassa не настроена');
  }

  const isSitePurchase = Boolean(siteId);
  const floor = isSitePurchase ? 0 : 10;
  const ceiling = isSitePurchase ? 5000 : 100000;
  const normalizedAmount = Math.max(floor, Math.min(ceiling, Number(amount) || 0));
  const idempotenceKey = crypto.randomUUID();
  const receiptLine = isSitePurchase
    ? `Шаблон сайта «${siteTitle || siteId}»`
    : 'Пополнение баланса JustRouter';
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
    description: isSitePurchase
      ? `${receiptLine} — ${formatRub(normalizedAmount)}`
      : `Пополнение баланса JustRouter на ${formatRub(normalizedAmount)}`,
    metadata: {
      user_id: String(userId),
      source: isSitePurchase ? 'site_template' : 'justrouter_account',
      ...(siteId ? { site_id: siteId } : {}),
    },
    receipt: email ? {
      customer: { email },
      items: [
        {
          description: receiptLine,
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
    SELECT users.id, users.email, users.name, users.balance, users.api_key, users.is_admin, telegram_links.marketing_enabled
    FROM telegram_links
    JOIN users ON users.id = telegram_links.user_id
    WHERE telegram_links.telegram_id = ?
  `).get(String(telegramId));
}

async function telegramApi(method, payload) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('[telegram] TELEGRAM_BOT_TOKEN is missing, cannot call Telegram API');
    return null;
  }

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

async function ensureTelegramWebhook() {
  // Webhook disabled — OpenClaw handles Telegram via polling
  if (TELEGRAM_BOT_TOKEN) {
    console.log('[telegram] skipping webhook setup (OpenClaw handles polling)');
  }
}

function buildMainKeyboard(isLinked = true) {
  const rows = [];
  if (isLinked) {
    rows.push(['Баланс', 'API ключ']);
    rows.push(['Пополнить 500 ₽', 'Пополнить 1000 ₽']);
    rows.push(['Помощь']);
  } else {
    rows.push(['Помощь']);
  }
  return { keyboard: rows, resize_keyboard: true };
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

async function sendTelegramLongMessage(chatId, text, options = {}) {
  const maxLen = 3900;
  const value = String(text || '');
  if (value.length <= maxLen) {
    await sendTelegramMessage(chatId, value, options);
    return;
  }
  for (let i = 0; i < value.length; i += maxLen) {
    await sendTelegramMessage(chatId, value.substring(i, i + maxLen), options);
  }
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

  // Email-дожим при низком балансе
  if (links.length === 0) {
    const user = db.prepare('SELECT email, name, low_balance_email_notified FROM users WHERE id = ?').get(userId);
    if (user && user.email && user.email.includes('@') && !user.low_balance_email_notified) {
      try {
        const siteUrl = process.env.SITE_URL || 'https://justrouter.ru';
        await new Promise((resolve, reject) => {
          mailTransporter.sendMail({
            from: '"JustRouter" <' + EMAIL_FROM + '>',
            to: user.email,
            subject: 'Баланс на исходе — продолжите работу с JustRouter',
            html: '<div style="max-width:480px;margin:0 auto;font-family:Arial,sans-serif;">'
              + '<h2 style="color:#10b981;">Баланс почти закончился \u{1FA99}</h2>'
              + '<p style="color:#555;font-size:14px;line-height:1.6;">'
              + 'Здравствуйте' + (user.name ? ', ' + user.name : '') + '!<br><br>'
              + 'Ваш баланс в JustRouter — <strong>' + formatRub(balance) + '</strong>.<br>'
              + 'Когда он закончится, доступ к моделям приостановится.'
              + '</p>'
              + '<div style="text-align:center;margin:24px 0;">'
              + '<a href="' + siteUrl + '/account" style="display:inline-block;padding:12px 28px;background:#10b981;color:#000;text-decoration:none;border-radius:8px;font-weight:600;">'
              + '\u{1F4B0} Пополнить баланс</a>'
              + '</div>'
              + '<p style="color:#999;font-size:12px;">Или напишите нам: <a href="mailto:support@justrouter.ru" style="color:#10b981;">support@justrouter.ru</a></p>'
              + '</div>',
          }, (err, info) => {
            if (err) reject(err); else resolve(info);
          });
        });
        console.log('[email] low balance notified', { userId, email: user.email, balance });
        db.prepare('UPDATE users SET low_balance_email_notified = 1 WHERE id = ?').run(userId);
      } catch (e) {
        console.error('[email] low balance notify failed', { userId, error: e.message });
      }
    }
  }
}

async function answerTelegramUpdate(update) {
  if (update.pre_checkout_query) {
    const query = update.pre_checkout_query;
    const payment = db.prepare('SELECT * FROM telegram_payments WHERE payload = ?').get(query.invoice_payload);
    const expectedAmount = payment ? Math.round(Number(payment.amount) * 100) : null;
    const ok = Boolean(
      payment
      && payment.status === 'pending'
      && query.currency === 'RUB'
      && expectedAmount === Number(query.total_amount),
    );

    await telegramApi('answerPreCheckoutQuery', {
      pre_checkout_query_id: query.id,
      ok,
      ...(ok ? {} : { error_message: 'Платёж не найден или сумма не совпадает' }),
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
      const bonusAmount = Math.floor(payment.amount * 0.2);
      db.prepare('UPDATE users SET balance = balance + ?, bonus_balance = COALESCE(bonus_balance, 0) + ? WHERE id = ?')
        .run(payment.amount, bonusAmount, payment.user_id);
      db.prepare(`
        UPDATE telegram_payments
        SET status = 'paid', paid_at = datetime('now'), telegram_payment_charge_id = ?, provider_payment_charge_id = ?
        WHERE payload = ?
      `).run(chargeId, providerChargeId, payload);
      db.prepare(`
        INSERT INTO transactions (type, user_id, amount, description)
        VALUES ('topup', ?, ?, ?)
      `).run(payment.user_id, payment.amount, `Пополнение через Telegram / YooKassa${bonusAmount > 0 ? ` (+${bonusAmount} ₽ бонус)` : ''}`);
      db.prepare('UPDATE telegram_links SET low_balance_notified = 0, updated_at = datetime(\'now\') WHERE user_id = ?').run(payment.user_id);
      return db.prepare('SELECT balance, bonus_balance FROM users WHERE id = ?').get(payment.user_id);
    });
    const updated = tx();
    // Credit referral bonus if this is the referred user's first topup
    creditReferralForTopup(db, payment.user_id);
    const bonusText = Number(updated.bonus_balance) > 0 ? ` (из них ${formatRub(updated.bonus_balance)} бонусных)` : '';
    await sendTelegramMessage(chatId, `Оплата прошла. Баланс: ${formatRub(Number(updated.balance) + Number(updated.bonus_balance))}.${bonusText}`, { reply_markup: buildMainKeyboard(true) });
    return;
  }

  const linkedUser = getUserByTelegramId(chatId);

  if (text === '/start') {
    const [, startParam] = text.split(/\s+/, 2);
    if (startParam) {
      await connectTelegramCode(chatId, telegramUser, startParam);
      return;
    }

    await sendTelegramMessage(
      chatId,
      linkedUser
        ? `JustRouter подключен. Баланс: ${formatRub(getPublicBalance(db, linkedUser.id).balance)}.`
        : 'Пришлите /connect код из личного кабинета JustRouter, чтобы подключить аккаунт.',
      { reply_markup: buildMainKeyboard(Boolean(linkedUser)) }
    );
    return;
  }

  if (text.startsWith('/connect')) {
    const code = text.split(/\s+/, 2)[1];
    if (!code) {
      await sendTelegramMessage(chatId, '🔗 <b>Подключение аккаунта JustRouter</b>\n\n' +
        'Чтобы пользоваться ботом, нужно привязать аккаунт JustRouter.\n\n' +
        '1️⃣ Зайдите в личный кабинет на justrouter.ru\n' +
        '2️⃣ Откройте настройки → Telegram\n' +
        '3️⃣ Скопируйте код привязки\n' +
        '4️⃣ Отправьте его сюда: <code>/connect КОД</code>\n\n' +
        'Пример: <code>/connect JR492326</code>\n\n' +
        '<i>Если вы администратор, можно подключить пользователя напрямую по ID: <code>/connect 1275229</code></i>',
        { parse_mode: 'HTML' }
      );
      return;
    }

    // If code is a pure number, try direct user_id link (target must be admin)
    if (/^\d+$/.test(code.trim())) {
      const targetUser = db.prepare('SELECT id, email, name, balance, is_admin FROM users WHERE id = ?').get(Number(code));
      if (!targetUser) {
        await sendTelegramMessage(chatId, `Пользователь с ID ${code} не найден.`);
        return;
      }
      if (!targetUser.is_admin) {
        await sendTelegramMessage(chatId, 'Прямая привязка по ID доступна только для администраторов.');
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
        `).run(targetUser.id, String(chatId), telegramUser.username || null, telegramUser.first_name || null);
      })();

      await sendTelegramMessage(
        chatId,
        `Подключен пользователь: ${targetUser.name || targetUser.email} (ID ${targetUser.id}).\nБаланс: ${formatRub(targetUser.balance)}.`,
        { reply_markup: buildMainKeyboard(true) }
      );
      return;
    }

    // Otherwise use the existing code-based flow
    await connectTelegramCode(chatId, telegramUser, code);
    return;
  }

  if (!linkedUser) {
    await sendTelegramMessage(chatId, 'Сначала подключите аккаунт: /connect код из личного кабинета JustRouter.', { reply_markup: buildMainKeyboard(false) });
    return;
  }

  if (text === '/balance' || text.toLowerCase() === 'баланс') {
    await sendTelegramMessage(chatId, `Баланс: ${formatRub(getPublicBalance(db, linkedUser.id).balance)}.`, { reply_markup: buildMainKeyboard(true) });
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

app.post('/api/telegram/webhook', publicWriteRateLimit, async (req, res) => {
  if (TELEGRAM_WEBHOOK_SECRET && req.headers['x-telegram-bot-api-secret-token'] !== TELEGRAM_WEBHOOK_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Log webhook update
  const updateType = req.body?.message ? 'message' : req.body?.pre_checkout_query ? 'pre_checkout_query' : req.body?.callback_query ? 'callback_query' : 'other';
  const chatId = req.body?.message?.chat?.id || req.body?.callback_query?.message?.chat?.id || '?';
  const text = req.body?.message?.text || '';
  console.log(`[telegram] webhook update type=${updateType} chat=${chatId} text="${text.slice(0, 50)}"`);

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
  // Hide openrouter/auto (Auto Router) from image models — it's a routing placeholder, not a real model
  if (category === 'image') { sql += " AND id != 'openrouter/auto'"; }
  if (provider && provider !== 'Все') { sql += ' AND provider = ?'; params.push(provider); }
  if (search) { sql += ' AND (name LIKE ? OR id LIKE ? OR provider LIKE ?)'; const q = `%${search}%`; params.push(q, q, q); }

  if (sort === 'price-asc') sql += ' ORDER BY CASE WHEN price < 0 THEN 999999 ELSE price END ASC';
  else if (sort === 'price-desc') sql += ' ORDER BY CASE WHEN price < 0 THEN -1 ELSE price END DESC';
  else if (sort === 'speed') sql += ' ORDER BY speed DESC';
  else if (sort === 'context') sql += ' ORDER BY context DESC';
  else sql += ' ORDER BY id ASC';

  const models = db.prepare(sql).all(...params).map(enrichModelVideoMetaRow);
  res.json(models);
});

app.get('/api/models/:id', (req, res) => {
  const model = db.prepare('SELECT * FROM models WHERE id = ? AND is_active = 1').get(req.params.id);
  if (!model) return res.status(404).json({ error: 'Модель не найдена' });
  res.json(enrichModelVideoMetaRow(model));
});

// ── Chat / Messages ─────────────────────────────────────

function mapOpenRouterModel(modelId) {
  return OPENROUTER_MODEL_MAP[modelId] || modelId;
}

const OPENROUTER_CHAT_MAX_TOKENS = Number(process.env.OPENROUTER_CHAT_MAX_TOKENS || 2048);

async function requestOpenRouterCompletion(modelId, content) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('Сервис моделей временно недоступен');
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
      max_tokens: OPENROUTER_CHAT_MAX_TOKENS,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error('[openrouter] request failed', data);
    throw new Error(formatOpenRouterClientError(
      data?.error?.message || data?.message || 'Не удалось получить ответ от модели',
    ));
  }

  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Модель вернула пустой ответ');
  }

  return { text, usage: data.usage || {} };
}

async function generateModelResponse(model, content, agentName = null) {
  if (!OPENROUTER_API_KEY || model.category !== 'text') {
    const err = new Error('Генерация текста временно недоступна');
    err.statusCode = 503;
    throw err;
  }

  const { text, usage } = await requestOpenRouterCompletion(model.id, content);
  return {
    response: text,
    costRub: costRubFromOpenRouterUsage(model, usage),
    usage,
  };
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

app.post('/api/chat', mediaRateLimit, authMiddleware, requireJsonFields(['model_id', 'content']), async (req, res) => {
  const { model_id, content } = req.body;
  if (!model_id || !content) return res.status(400).json({ error: 'model_id и content обязательны' });

  const banned = db.prepare('SELECT banned FROM users WHERE id = ?').get(req.user.id);
  if (banned?.banned) return res.status(403).json({ error: 'Ваш аккаунт заблокирован администратором' });

  const model = db.prepare('SELECT * FROM models WHERE id = ? AND is_active = 1').get(model_id);
  if (!model) return res.status(404).json({ error: 'Модель не найдена' });

  const user = getWallet(db, req.user.id);
  const isFree = isFreeRequest(db, req.user.id, model_id);
  const estimatedCost = estimateTextMessageCostRub(model);

  if (!isFree) {
    try {
      assertSufficientBalance({ balance: getTotalBalance(user) }, estimatedCost);
    } catch (e) {
      return res.status(e.statusCode || 402).json({ error: e.message });
    }
  }

  if (!isFree && !OPENROUTER_API_KEY) {
    return res.status(503).json({ error: 'Генерация временно недоступна' });
  }

  db.prepare('INSERT INTO messages (user_id, model_id, role, content, is_free) VALUES (?, ?, ?, ?, ?)').run(req.user.id, model_id, 'user', content, isFree ? 1 : 0);

  let result;
  try {
    result = await generateModelResponse(model, content);
  } catch (e) {
    console.error('[chat] response generation failed', e);
    return res.status(e.statusCode || 502).json({ error: e.message || 'Ошибка генерации ответа' });
  }

  db.prepare('INSERT INTO messages (user_id, model_id, role, content, is_free) VALUES (?, ?, ?, ?, ?)').run(req.user.id, model_id, 'assistant', result.response, isFree ? 1 : 0);

  let charged = 0;
  if (!isFree) {
    try {
      charged = chargeUserBalance(
        db,
        req.user.id,
        result.costRub,
        `Оплата ${model.name}: ${content.slice(0, 50)}`,
        model.price,
        model.category,
      );
    } catch (e) {
      return res.status(e.statusCode || 402).json({ error: e.message });
    }
  }

  const { balance } = getPublicBalance(db, req.user.id);
  void maybeNotifyLowBalance(req.user.id, balance);

  res.json({
    response: result.response,
    is_free: isFree,
    free_remaining: getFreeRemaining(db, req.user.id, model_id),
    balance,
    cost: charged,
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

  res.json({ free_remaining: getFreeRemaining(db, req.user.id, model_id) });
});

function syncVideoJobRecord(job, model) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('Сервис моделей временно недоступен');
  }

  return pollOpenRouterVideoJob({
    apiKey: OPENROUTER_API_KEY,
    proxyUrl: OPENROUTER_PROXY_URL,
    openrouterJobId: job.openrouter_job_id,
  }).then((statusData) => {
    const status = statusData.status || job.status;
    const videoUrls = statusData.unsigned_urls || [];
    const error = statusData.error || statusData.message || null;
    const costRub = estimateVideoCostRub(model, job.duration, statusData.usage?.cost);

    db.prepare(`
      UPDATE video_jobs
      SET status = ?, video_urls = ?, error = ?, cost_rub = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(status, videoUrls.length ? JSON.stringify(videoUrls) : null, error, costRub, job.id);

    const updatedJob = db.prepare('SELECT * FROM video_jobs WHERE id = ?').get(job.id);

    if (status === 'completed') {
      db.transaction(() => {
        const claim = db.prepare(`
          UPDATE video_jobs
          SET is_charged = 1, updated_at = datetime('now')
          WHERE id = ? AND is_charged = 0
        `).run(updatedJob.id);
        if (claim.changes === 0) return;

        const assistantContent = JSON.stringify({
          type: 'video',
          prompt: updatedJob.prompt,
          job_id: updatedJob.id,
          duration: updatedJob.duration,
        });

        db.prepare('INSERT INTO messages (user_id, model_id, role, content, is_free) VALUES (?, ?, ?, ?, ?)').run(
          updatedJob.user_id,
          updatedJob.model_id,
          'assistant',
          assistantContent,
          updatedJob.is_free,
        );

        if (!updatedJob.is_free && costRub > 0) {
          const wallet = getWallet(db, updatedJob.user_id);
          assertSufficientBalance({ balance: getTotalBalance(wallet) }, costRub);
          chargeUserBalance(
            db,
            updatedJob.user_id,
            costRub,
            `Видео ${model.name}: ${updatedJob.prompt.slice(0, 50)}`,
          );
        }
      })();
    }

    return { statusData, updatedJob: db.prepare('SELECT * FROM video_jobs WHERE id = ?').get(job.id), costRub };
  });
}

app.post('/api/video', mediaRateLimit, authMiddleware, requireJsonFields(['model_id', 'prompt']), async (req, res) => {
  const banned = db.prepare('SELECT banned FROM users WHERE id = ?').get(req.user.id);
  if (banned?.banned) return res.status(403).json({ error: 'Ваш аккаунт заблокирован администратором' });
  const {
    model_id,
    prompt,
    duration = 8,
    resolution = '720p',
    aspect_ratio = '16:9',
    images,
    reference_images,
  } = req.body;
  if (!model_id || !prompt?.trim()) {
    return res.status(400).json({ error: 'model_id и prompt обязательны' });
  }

  if (!OPENROUTER_API_KEY) {
    return res.status(503).json({ error: 'Генерация видео временно недоступна' });
  }

  const model = enrichModelVideoMetaRow(
    db.prepare('SELECT * FROM models WHERE id = ? AND is_active = 1').get(model_id),
  );
  if (!model) return res.status(404).json({ error: 'Модель не найдена' });
  if (model.category !== 'video') return res.status(400).json({ error: 'Эта модель не поддерживает генерацию видео' });

  let frameImages = [];
  let inputReferences = [];
  try {
    if (Array.isArray(images) && images.length) {
      ({ frameImages, inputReferences } = normalizeStructuredImages(images));
    } else if (Array.isArray(reference_images) && reference_images.length) {
      inputReferences = normalizeImageList(reference_images).map((url) => ({
        type: 'image_url',
        image_url: { url },
      }));
    }
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  try {
    validateVideoRequestForModel(model, {
      frameImages,
      inputReferences,
      duration,
      resolution,
      aspectRatio: aspect_ratio,
      videoMeta: parseStoredVideoMeta(model.video_meta),
    });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const imageCount = frameImages.length + inputReferences.length;
  const isFree = isFreeRequest(db, req.user.id, model_id);
  const estimatedCost = estimateVideoCostRub(model, duration);
  const user = getWallet(db, req.user.id);

  if (!isFree) {
    try {
      assertSufficientBalance({ balance: getTotalBalance(user) }, estimatedCost);
    } catch (e) {
      return res.status(e.statusCode || 402).json({ error: e.message });
    }
  }

  try {
    await ensureOpenRouterCreditsForVideo({
      apiKey: OPENROUTER_API_KEY,
      proxyUrl: OPENROUTER_PROXY_URL,
      model,
      durationSeconds: duration,
    });

    const result = await submitOpenRouterVideoJob({
      apiKey: OPENROUTER_API_KEY,
      proxyUrl: OPENROUTER_PROXY_URL,
      modelId: model_id,
      prompt: prompt.trim(),
      duration: Number(duration) || 8,
      resolution,
      aspectRatio: aspect_ratio,
      frameImages,
      inputReferences,
    });

    if (!result?.id) {
      throw new Error('Провайдер не вернул идентификатор задачи');
    }

    const userContent = prompt.trim() + summarizeImagesForLog(imageCount);
    db.prepare('INSERT INTO messages (user_id, model_id, role, content, is_free) VALUES (?, ?, ?, ?, ?)').run(
      req.user.id,
      model_id,
      'user',
      userContent,
      isFree ? 1 : 0,
    );

    const insert = db.prepare(`
      INSERT INTO video_jobs (user_id, model_id, prompt, openrouter_job_id, status, duration, is_free)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const info = insert.run(
      req.user.id,
      model_id,
      prompt.trim(),
      result.id,
      result.status || 'pending',
      Number(duration) || 8,
      isFree ? 1 : 0,
    );

    res.status(202).json({
      job_id: info.lastInsertRowid,
      status: result.status || 'pending',
      is_free: isFree,
      free_remaining: getFreeRemaining(db, req.user.id, model_id),
      estimated_cost_rub: isFree ? 0 : estimatedCost,
      balance: getPublicBalance(db, req.user.id).balance,
    });
  } catch (e) {
    console.error('[video] submit failed', e);
    const message = formatOpenRouterClientError(e.message);
    const status = /временно недоступ/i.test(message) ? 503 : 502;
    res.status(status).json({ error: message || 'Не удалось запустить генерацию видео' });
  }
});

app.post('/api/audio', mediaRateLimit, authMiddleware, requireJsonFields(['model_id', 'prompt']), async (req, res) => {
  const banned = db.prepare('SELECT banned FROM users WHERE id = ?').get(req.user.id);
  if (banned?.banned) return res.status(403).json({ error: 'Ваш аккаунт заблокирован администратором' });
  const { model_id, prompt, voice = 'alloy' } = req.body;
  if (!model_id || !prompt?.trim()) {
    return res.status(400).json({ error: 'model_id и prompt обязательны' });
  }

  if (!OPENROUTER_API_KEY) {
    return res.status(503).json({ error: 'Генерация аудио временно недоступна' });
  }

  const model = db.prepare('SELECT * FROM models WHERE id = ? AND is_active = 1').get(model_id);
  if (!model) return res.status(404).json({ error: 'Модель не найдена' });
  if (model.category !== 'audio') return res.status(400).json({ error: 'Эта модель не поддерживает генерацию аудио' });

  const user = getWallet(db, req.user.id);
  const isFree = isFreeRequest(db, req.user.id, model_id);
  const estimatedCost = estimateTextMessageCostRub(model);

  if (!isFree) {
    try {
      assertSufficientBalance({ balance: getTotalBalance(user) }, estimatedCost);
    } catch (e) {
      return res.status(e.statusCode || 402).json({ error: e.message });
    }
  }

  try {
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
        model: mapOpenRouterModel(model_id),
        modalities: ['text', 'audio'],
        audio: { voice, format: 'wav' },
        messages: [{ role: 'user', content: prompt.trim() }],
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(formatOpenRouterClientError(
        data?.error?.message || data?.message || 'Не удалось получить ответ от модели',
      ));
    }

    const audioData = data?.choices?.[0]?.message?.audio?.data;
    const transcript = data?.choices?.[0]?.message?.audio?.transcript;
    const text = data?.choices?.[0]?.message?.content;
    if (!audioData) {
      throw new Error('Модель не вернула аудио');
    }

    const costRub = costRubFromOpenRouterUsage(model, data.usage || {});

    let charged = 0;
    if (!isFree) {
      charged = chargeUserBalance(
        db,
        req.user.id,
        costRub,
        `Генерация аудио через ${model.name}: ${prompt.trim().slice(0, 50)}`,
        model.price,
        model.category,
      );
    }

    db.prepare('INSERT INTO messages (user_id, model_id, role, content, is_free) VALUES (?, ?, ?, ?, ?)').run(req.user.id, model_id, 'user', prompt.trim(), isFree ? 1 : 0);
    db.prepare('INSERT INTO messages (user_id, model_id, role, content, is_free) VALUES (?, ?, ?, ?, ?)').run(req.user.id, model_id, 'assistant', transcript || text || '(аудио)', isFree ? 1 : 0);

    const { balance } = getPublicBalance(db, req.user.id);
    void maybeNotifyLowBalance(req.user.id, balance);

    res.json({
      audio: audioData,
      format: 'wav',
      transcript: transcript || null,
      text: text || null,
      cost: charged,
      costRub,
      balance,
      is_free: isFree,
    });
  } catch (e) {
    console.error('[audio] generation failed', e);
    return res.status(e.statusCode || 502).json({ error: e.message || 'Ошибка генерации аудио' });
  }
});

app.post('/api/image', mediaRateLimit, authMiddleware, requireJsonFields(['model_id', 'prompt']), async (req, res) => {
  const banned = db.prepare('SELECT banned FROM users WHERE id = ?').get(req.user.id);
  if (banned?.banned) return res.status(403).json({ error: 'Ваш аккаунт заблокирован администратором' });
  const {
    model_id,
    prompt,
    reference_images,
    aspect_ratio,
    image_size,
  } = req.body;

  if (!model_id || !prompt?.trim()) {
    return res.status(400).json({ error: 'model_id и prompt обязательны' });
  }

  if (!OPENROUTER_API_KEY) {
    return res.status(503).json({ error: 'Генерация изображений временно недоступна' });
  }

  const model = db.prepare('SELECT * FROM models WHERE id = ? AND is_active = 1').get(model_id);
  if (!model) return res.status(404).json({ error: 'Модель не найдена' });
  if (model.category !== 'image') {
    return res.status(400).json({ error: 'Эта модель не поддерживает генерацию изображений' });
  }

  let referenceImages = [];
  try {
    referenceImages = normalizeImageList(reference_images);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }

  const isFree = isFreeRequest(db, req.user.id, model_id);
  const estimatedCost = estimateImageCostRub(model, referenceImages.length);
  const user = getWallet(db, req.user.id);

  if (!isFree) {
    try {
      assertSufficientBalance({ balance: getTotalBalance(user) }, estimatedCost);
    } catch (e) {
      return res.status(e.statusCode || 402).json({ error: e.message });
    }
  }

  const imageConfig = {};
  if (aspect_ratio) imageConfig.aspect_ratio = aspect_ratio;
  if (image_size) imageConfig.image_size = image_size;

  try {
    const result = await generateOpenRouterImage({
      apiKey: OPENROUTER_API_KEY,
      proxyUrl: OPENROUTER_PROXY_URL,
      modelId: model_id,
      prompt: prompt.trim(),
      referenceImages,
      imageConfig,
    });

    const userContent = prompt.trim() + summarizeImagesForLog(referenceImages.length);
    db.prepare('INSERT INTO messages (user_id, model_id, role, content, is_free) VALUES (?, ?, ?, ?, ?)').run(
      req.user.id,
      model_id,
      'user',
      userContent,
      isFree ? 1 : 0,
    );

    const assistantContent = JSON.stringify({
      type: 'image',
      images: result.images,
      text: result.text || null,
    });
    db.prepare('INSERT INTO messages (user_id, model_id, role, content, is_free) VALUES (?, ?, ?, ?, ?)').run(
      req.user.id,
      model_id,
      'assistant',
      assistantContent,
      isFree ? 1 : 0,
    );

    let charged = 0;
    if (!isFree) {
      try {
        charged = chargeUserBalance(
          db,
          req.user.id,
          imageCostRubFromUsage(model, result.usage),
          `Оплата ${model.name}: ${prompt.trim().slice(0, 50)}`,
          model.price,
          model.category,
        );
      } catch (e) {
        return res.status(e.statusCode || 402).json({ error: e.message });
      }
    }

    const { balance } = getPublicBalance(db, req.user.id);
    void maybeNotifyLowBalance(req.user.id, balance);

    res.json({
      images: result.images,
      text: result.text || null,
      is_free: isFree,
      free_remaining: getFreeRemaining(db, req.user.id, model_id),
      balance,
      cost: charged,
    });
  } catch (e) {
    console.error('[image] generation failed', e);
    const message = formatOpenRouterClientError(e.message);
    const status = /временно недоступ/i.test(message) ? 503 : 502;
    res.status(status).json({ error: message || 'Не удалось сгенерировать изображение' });
  }
});

app.get('/api/video/jobs/:id', authMiddleware, async (req, res) => {
  const job = db.prepare('SELECT * FROM video_jobs WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!job) return res.status(404).json({ error: 'Задача не найдена' });

  const model = db.prepare('SELECT * FROM models WHERE id = ?').get(job.model_id);
  if (!model) return res.status(404).json({ error: 'Модель не найдена' });

  try {
    let currentJob = job;
    if (currentJob.status !== 'completed' && currentJob.status !== 'failed') {
      const { updatedJob } = await syncVideoJobRecord(currentJob, model);
      currentJob = updatedJob;
    }

    const { balance } = getPublicBalance(db, req.user.id);
    const freeCount = getFreeRemaining(db, req.user.id, job.model_id);

    res.json({
      job_id: currentJob.id,
      status: currentJob.status,
      error: currentJob.error,
      prompt: currentJob.prompt?.length > 500 ? `${currentJob.prompt.slice(0, 500)}…` : currentJob.prompt,
      duration: currentJob.duration,
      cost_rub: currentJob.cost_rub,
      stream_urls: currentJob.video_urls
        ? JSON.parse(currentJob.video_urls).map((_, index) => `/api/video/jobs/${currentJob.id}/stream?index=${index}`)
        : [],
      is_free: Boolean(currentJob.is_free),
      free_remaining: freeCount,
      balance,
    });
  } catch (e) {
    console.error('[video] poll failed', e);
    res.status(502).json({ error: e.message || 'Не удалось проверить статус генерации' });
  }
});

app.get('/api/video/jobs/:id/stream', authMiddleware, async (req, res) => {
  const job = db.prepare('SELECT * FROM video_jobs WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!job) return res.status(404).json({ error: 'Задача не найдена' });
  if (job.status !== 'completed' || !job.video_urls) {
    return res.status(409).json({ error: 'Видео ещё не готово' });
  }

  const index = Number(req.query.index || 0);
  const urls = JSON.parse(job.video_urls);
  const contentUrl = urls[index];
  if (!contentUrl) return res.status(404).json({ error: 'Видео не найдено' });

  try {
    const upstream = await fetchOpenRouterVideoContent({
      apiKey: OPENROUTER_API_KEY,
      proxyUrl: OPENROUTER_PROXY_URL,
      contentUrl,
    });
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'video/mp4');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.send(buffer);
  } catch (e) {
    console.error('[video] stream failed', e);
    res.status(502).json({ error: e.message || 'Не удалось загрузить видео' });
  }
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
app.post('/api/v1/chat', mediaRateLimit, universalAuth, requireJsonFields(['model_id', 'content']), async (req, res) => {
  const { model_id, content } = req.body;
  if (!model_id || !content) return res.status(400).json({ error: 'model_id и content обязательны' });

  const model = db.prepare('SELECT * FROM models WHERE id = ? AND is_active = 1').get(model_id);
  if (!model) return res.status(404).json({ error: 'Модель не найдена' });

  // Check if user is banned
  if (req.authType === 'user') {
    const banned = db.prepare('SELECT banned FROM users WHERE id = ?').get(req.authUser.id);
    if (banned?.banned) return res.status(403).json({ error: 'Ваш аккаунт заблокирован администратором' });
  } else if (req.authType === 'agent') {
    const banned = db.prepare('SELECT banned FROM users WHERE id = ?').get(req.agent.user_id);
    if (banned?.banned) return res.status(403).json({ error: 'Ваш аккаунт заблокирован администратором' });
  }

  if (req.authType === 'user') {
    const userId = req.authUser.id;
    const user = getWallet(db, userId);
    const isFree = isFreeRequest(db, userId, model_id);
    const estimatedCost = estimateTextMessageCostRub(model);

    if (!isFree) {
      try {
        assertSufficientBalance({ balance: getTotalBalance(user) }, estimatedCost);
      } catch (e) {
        return res.status(e.statusCode || 402).json({ error: e.message });
      }
    }

    if (!isFree && !OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'Генерация временно недоступна' });
    }

    db.prepare('INSERT INTO messages (user_id, model_id, role, content, is_free) VALUES (?, ?, ?, ?, ?)').run(userId, model_id, 'user', content, isFree ? 1 : 0);

    let result;
    try {
      result = await generateModelResponse(model, content);
    } catch (e) {
      console.error('[v1/chat] response generation failed', e);
      return res.status(e.statusCode || 502).json({ error: e.message || 'Ошибка генерации ответа' });
    }

    db.prepare('INSERT INTO messages (user_id, model_id, role, content, is_free) VALUES (?, ?, ?, ?, ?)').run(userId, model_id, 'assistant', result.response, isFree ? 1 : 0);

    let charged = 0;
    if (!isFree) {
      try {
        charged = chargeUserBalance(db, userId, result.costRub, `Оплата ${model.name}: ${content.slice(0, 50)}`, model.price, model.category);
      } catch (e) {
        return res.status(e.statusCode || 402).json({ error: e.message });
      }
    }

    const { balance } = getPublicBalance(db, userId);
    void maybeNotifyLowBalance(userId, balance);

    res.json({
      response: result.response,
      auth_type: 'user',
      is_free: isFree,
      free_remaining: getFreeRemaining(db, userId, model_id),
      balance,
      cost: charged,
    });
  } else {
    // Agent
    const agentId = req.agent.id;

    const estimatedCost = estimateTextMessageCostRub(model);
    if (req.agent.balance < estimatedCost) {
      return res.status(402).json({ error: 'Недостаточно средств. Пополните баланс агента.' });
    }

    db.prepare('INSERT INTO agent_messages (agent_id, model_id, role, content) VALUES (?, ?, ?, ?)').run(agentId, model_id, 'user', content);

    let result;
    try {
      result = await generateModelResponse(model, content, req.agent.name);
    } catch (e) {
      console.error('[v1/chat agent] response generation failed', e);
      return res.status(502).json({ error: e.message || 'Ошибка генерации ответа' });
    }

    db.prepare('INSERT INTO agent_messages (agent_id, model_id, role, content) VALUES (?, ?, ?, ?)').run(agentId, model_id, 'assistant', result.response);

    const cost = Math.max(0.01, result.costRub);
    db.prepare('UPDATE agents SET balance = MAX(0, balance - ?) WHERE id = ?').run(cost, agentId);
    db.prepare("INSERT INTO transactions (type, agent_id, amount, description) VALUES ('agent_payment', ?, ?, ?)").run(agentId, -cost, `Агент ${req.agent.name}: ${model.name} — ${content.slice(0, 50)}`);
    const balance = db.prepare('SELECT balance FROM agents WHERE id = ?').get(agentId).balance;

    res.json({ response: result.response, auth_type: 'agent', balance, cost });
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
app.post('/api/v1/agents/register', authRateLimit, (req, res) => {
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
app.post('/api/v1/agents/login', authRateLimit, (req, res) => {
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
app.post('/api/v1/agents/chat', agentAuthMiddleware, async (req, res) => {
  const { model_id, content } = req.body;
  if (!model_id || !content) return res.status(400).json({ error: 'model_id и content обязательны' });

  const model = db.prepare('SELECT * FROM models WHERE id = ? AND is_active = 1').get(model_id);
  if (!model) return res.status(404).json({ error: 'Модель не найдена' });

  const estimatedCost = estimateTextMessageCostRub(model);
  if (req.agent.balance < estimatedCost) {
    return res.status(402).json({ error: 'Недостаточно средств. Пополните баланс агента.' });
  }

  db.prepare('INSERT INTO agent_messages (agent_id, model_id, role, content) VALUES (?, ?, ?, ?)').run(req.agent.id, model_id, 'user', content);

  let result;
  try {
    result = await generateModelResponse(model, content, req.agent.name);
  } catch (e) {
    console.error('[v1/agents/chat] response generation failed', e);
    return res.status(502).json({ error: e.message || 'Ошибка генерации ответа' });
  }

  db.prepare('INSERT INTO agent_messages (agent_id, model_id, role, content) VALUES (?, ?, ?, ?)').run(req.agent.id, model_id, 'assistant', result.response);

  const cost = Math.max(0.01, result.costRub);
  db.prepare('UPDATE agents SET balance = MAX(0, balance - ?) WHERE id = ?').run(cost, req.agent.id);
  db.prepare("INSERT INTO transactions (type, agent_id, amount, description) VALUES ('agent_payment', ?, ?, ?)").run(req.agent.id, -cost, `Агент ${req.agent.name}: ${model.name} — ${content.slice(0, 50)}`);
  const balance = db.prepare('SELECT balance FROM agents WHERE id = ?').get(req.agent.id).balance;

  res.json({ response: result.response, balance, cost });
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
  const { password } = req.body;
  const email = resolveAdminLoginEmail(req.body.login || req.body.email || req.body.username);
  if (!email || !password) return res.status(400).json({ error: 'Заполните логин и пароль' });

  const ip = req.ip || req.connection.remoteAddress;
  if (!rateLimit(`admin_login:${ip}`, 5, 60000)) {
    return res.status(429).json({ error: 'Слишком много попыток' });
  }

  if (process.env.NODE_ENV === 'production' && ADMIN_PASSWORD === 'admin' && !process.env.ADMIN_PASSWORD) {
    return res.status(503).json({ error: 'Вход в админку отключён. Задайте ADMIN_PASSWORD на сервере.' });
  }

  const adminUser = db.prepare(`
    SELECT id, email, password
    FROM users
    WHERE email = ? AND COALESCE(is_admin, 0) = 1
  `).get(email);

  if (!adminUser) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  const valid = await bcrypt.compare(password, adminUser.password);
  if (!valid) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }

  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (user_id, token) VALUES (?, ?)').run(adminUser.id, token);
  res.json({ token, admin: { email: adminUser.email } });
});

function adminMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Не авторизован' });
  const session = db.prepare(`
    SELECT s.user_id, u.is_admin
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ?
  `).get(token);
  if (!session) return res.status(401).json({ error: 'Неверный токен' });
  if (!session.is_admin) return res.status(403).json({ error: 'Доступ запрещён' });
  req.adminUserId = session.user_id;
  next();
}


// ── Admin: Overview stats ──
app.get('/api/admin/overview', adminMiddleware, (req, res) => {
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE COALESCE(is_admin, 0) = 0').get().count;
  const totalAgents = db.prepare('SELECT COUNT(*) as count FROM agents').get().count;
  const totalMessages = db.prepare('SELECT COUNT(*) as count FROM messages').get().count;
  const totalModels = db.prepare('SELECT COUNT(*) as count FROM models').get().count;
  const finance = getAdminFinanceStats(db);
  const messagesToday = db.prepare("SELECT COUNT(*) as count FROM messages WHERE created_at >= datetime('now', '-1 day')").get().count;
  const usersToday = db.prepare("SELECT COUNT(*) as count FROM users WHERE COALESCE(is_admin, 0) = 0 AND created_at >= datetime('now', '-1 day')").get().count;
  const topModels = db.prepare('SELECT model_id, COUNT(*) as count FROM messages GROUP BY model_id ORDER BY count DESC LIMIT 5').all();

  const spendChart = db.prepare(`
    SELECT strftime('%Y-%m-%d', created_at) as label,
           COALESCE(SUM(ABS(amount)), 0) as total_spent,
           COALESCE(SUM(COALESCE(bonus_amount, 0)), 0) as bonus_spent
    FROM transactions
    WHERE amount < 0
      AND type IN ('user_payment', 'agent_payment')
      AND created_at >= datetime('now', '-14 days')
    GROUP BY label
    ORDER BY label ASC
  `).all().map((row) => ({
    label: row.label,
    real_spent: Math.max(0, Number(row.total_spent) - Number(row.bonus_spent)),
    bonus_spent: Number(row.bonus_spent),
    total_spent: Number(row.total_spent),
  }));

  const topupsChart = db.prepare(`
    SELECT strftime('%Y-%m-%d', created_at) as label,
           COALESCE(SUM(amount), 0) as total_topups
    FROM transactions
    WHERE type = 'topup' AND amount > 0
      AND created_at >= datetime('now', '-14 days')
    GROUP BY label
    ORDER BY label ASC
  `).all().map((row) => ({
    label: row.label,
    topups: Number(row.total_topups),
  }));

  res.json({
    total_users: totalUsers,
    total_agents: totalAgents,
    total_messages: totalMessages,
    total_models: totalModels,
    finance,
    total_revenue: finance.real_spent,
    total_topups: finance.real_topups,
    messages_today: messagesToday,
    users_today: usersToday,
    top_models: topModels,
    spend_chart: spendChart,
    topups_chart: topupsChart,
  });
});

// ── Admin: Users list ──
const ADMIN_USER_FINANCE_SQL = `
  SELECT
    u.id,
    u.email,
    u.name,
    u.balance,
    u.bonus_balance,
    u.created_at,
    u.corporate,
    COALESCE(topups.real_topups, 0) AS real_topups,
    COALESCE(spent.total_spent, 0) AS total_spent,
    COALESCE(spent.bonus_spent, 0) AS bonus_spent,
    COALESCE(bonus_issued.bonuses_issued, 0) AS bonuses_issued
  FROM users u
  LEFT JOIN (
    SELECT user_id, SUM(amount) AS real_topups
    FROM transactions
    WHERE type = 'topup' AND amount > 0
    GROUP BY user_id
  ) topups ON topups.user_id = u.id
  LEFT JOIN (
    SELECT user_id,
      SUM(ABS(amount)) AS total_spent,
      SUM(COALESCE(bonus_amount, 0)) AS bonus_spent
    FROM transactions
    WHERE type IN ('user_payment', 'agent_payment') AND amount < 0
    GROUP BY user_id
  ) spent ON spent.user_id = u.id
  LEFT JOIN (
    SELECT user_id, SUM(amount) AS bonuses_issued
    FROM transactions
    WHERE type = 'referral_bonus' AND amount > 0
    GROUP BY user_id
  ) bonus_issued ON bonus_issued.user_id = u.id
`;

function mapAdminUserRow(row) {
  const finance = getUserFinanceStats(row);
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    balance: row.balance,
    created_at: row.created_at,
    bonus_balance: finance.bonus_balance,
    bonuses_issued: finance.bonuses_issued,
    bonus_spent: finance.bonus_spent,
    real_topups: finance.real_topups,
    real_spent: finance.real_spent,
    cash_margin: finance.cash_margin,
    margin_percent: finance.margin_percent,
    profit: finance.profit,
    corporate: !!row.corporate,
  };
}

app.get('/api/admin/users', adminMiddleware, (req, res) => {
  const { search, corporate, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '';
  const params = [];
  if (search) {
    where = 'WHERE (u.email LIKE ? OR u.name LIKE ?)';
    const q = `%${search}%`;
    params.push(q, q);
  }
  if (corporate === '1') {
    where = where ? where + ' AND u.corporate = 1' : 'WHERE u.corporate = 1';
  }
  const total = db.prepare(`SELECT COUNT(*) as count FROM users u ${where.replace(/\b(email|name)\b/g, 'u.$1')}`).get(...params).count;
  const allRows = db.prepare(`${ADMIN_USER_FINANCE_SQL} ${where} ORDER BY u.created_at DESC`).all(...params);
  const allUsers = allRows.map(mapAdminUserRow);
  const users = allUsers.slice(offset, offset + parseInt(limit));
  const totals = sumUserFinanceStats(allUsers);
  res.json({ users, totals, total, page: parseInt(page), limit: parseInt(limit) });
});

// ── Admin: Users dashboard ──
app.get('/api/admin/users/dashboard', adminMiddleware, (req, res) => {
  const days = Math.min(90, Math.max(7, Number(req.query.days) || 14));

  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE COALESCE(is_admin, 0) = 0').get().count;
  const usersToday = db.prepare("SELECT COUNT(*) as count FROM users WHERE COALESCE(is_admin, 0) = 0 AND created_at >= datetime('now', '-1 day')").get().count;
  const usersThisWeek = db.prepare("SELECT COUNT(*) as count FROM users WHERE COALESCE(is_admin, 0) = 0 AND created_at >= datetime('now', '-7 days')").get().count;
  const activeToday = db.prepare("SELECT COUNT(DISTINCT user_id) as count FROM messages WHERE created_at >= datetime('now', '-1 day')").get().count;
  const activeThisWeek = db.prepare("SELECT COUNT(DISTINCT user_id) as count FROM messages WHERE created_at >= datetime('now', '-7 days')").get().count;

  // Registrations per day
  const registrationChart = db.prepare(`
    SELECT strftime('%Y-%m-%d', created_at) as label, COUNT(*) as count
    FROM users
    WHERE COALESCE(is_admin, 0) = 0
      AND created_at >= datetime('now', '-' || ? || ' days')
    GROUP BY label
    ORDER BY label ASC
  `).all(days);

  // Activity: messages per day
  const activityChart = db.prepare(`
    SELECT strftime('%Y-%m-%d', created_at) as label, COUNT(*) as count
    FROM messages
    WHERE role = 'user'
      AND created_at >= datetime('now', '-' || ? || ' days')
    GROUP BY label
    ORDER BY label ASC
  `).all(days);

  // Active users per day
  const activeUsersChart = db.prepare(`
    SELECT strftime('%Y-%m-%d', created_at) as label, COUNT(DISTINCT user_id) as count
    FROM messages
    WHERE role = 'user'
      AND created_at >= datetime('now', '-' || ? || ' days')
    GROUP BY label
    ORDER BY label ASC
  `).all(days);

  // User signups by hour (last 24h)
  const hourlySignups = db.prepare(`
    SELECT strftime('%H:00', created_at) as label, COUNT(*) as count
    FROM users
    WHERE COALESCE(is_admin, 0) = 0
      AND created_at >= datetime('now', '-24 hours')
    GROUP BY label
    ORDER BY label ASC
  `).all();

  // Agent activity per day (from agent_messages)
  const agentChart = db.prepare(`
    SELECT strftime('%Y-%m-%d', created_at) as label, COUNT(*) as count
    FROM agent_messages
    WHERE created_at >= datetime('now', '-' || ? || ' days')
    GROUP BY label
    ORDER BY label ASC
  `).all(days);

  res.json({
    totals: {
      total_users: totalUsers,
      users_today: usersToday,
      users_this_week: usersThisWeek,
      active_today: activeToday,
      active_this_week: activeThisWeek,
    },
    registration_chart: registrationChart,
    activity_chart: activityChart,
    active_users_chart: activeUsersChart,
    hourly_signups: hourlySignups,
    agent_chart: agentChart,
    days,
  });
});

app.get('/api/admin/users/:id', adminMiddleware, (req, res) => {
  const user = db.prepare(`
    SELECT id, email, name, balance, bonus_balance, created_at, referral_code, referred_by_user_id, banned, corporate
    FROM users WHERE id = ?
  `).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  const msgCount = db.prepare('SELECT COUNT(*) as count FROM messages WHERE user_id = ?').get(user.id).count;
  const userRequests = db.prepare("SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND role = 'user'").get(user.id).count;
  const freeRequests = db.prepare("SELECT COUNT(*) as count FROM messages WHERE user_id = ? AND role = 'user' AND is_free = 1").get(user.id).count;
  const paidTotal = db.prepare("SELECT COALESCE(SUM(ABS(amount)), 0) as t FROM transactions WHERE user_id = ? AND amount < 0").get(user.id).t;
  // OpenRouter реальная себестоимость = charged / PRICE_MULTIPLIER (costRubFromOpenRouterUsage × markup)
  const openrouterCost = paidTotal > 0 ? Math.max(0.01, paidTotal / PRICE_MULTIPLIER) : 0;
  const justrouterRevenue = Math.max(0, paidTotal - openrouterCost);
  const marginPercent = paidTotal > 0 ? (justrouterRevenue / paidTotal) * 100 : null;
  const topModels = db.prepare(`
    SELECT model_id, COUNT(*) as count
    FROM messages
    WHERE user_id = ? AND role = 'user'
    GROUP BY model_id
    ORDER BY count DESC
    LIMIT 5
  `).all(user.id);
  const referral = getAdminUserReferralInfo(db, user.id);
  res.json({
    ...user,
    message_count: msgCount,
    user_requests: userRequests,
    free_requests: freeRequests,
    total_paid: paidTotal,
    openrouter_cost: openrouterCost,
    justrouter_revenue: justrouterRevenue,
    margin_percent: marginPercent,
    top_models: topModels,
    referral,
  });
});

app.get('/api/admin/referrals', adminMiddleware, (req, res) => {
  try {
    res.json(getAdminReferralOverview(db));
  } catch (e) {
    console.error('[admin/referrals]', e);
    res.status(500).json({ error: 'Не удалось загрузить статистику рефералов' });
  }
});

app.get('/api/admin/users/:id/transactions', adminMiddleware, (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  const { page = 1, limit = 30 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const total = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE user_id = ?').get(user.id).count;
  const transactions = db.prepare(`
    SELECT id, type, amount, description, created_at
    FROM transactions
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(user.id, parseInt(limit), offset);
  res.json({ transactions, total, page: parseInt(page), limit: parseInt(limit) });
});

app.get('/api/admin/users/:id/messages', adminMiddleware, (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  const { page = 1, limit = 30, model_id } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = 'WHERE user_id = ?';
  const params = [user.id];
  if (model_id) {
    where += ' AND model_id = ?';
    params.push(model_id);
  }
  const total = db.prepare(`SELECT COUNT(*) as count FROM messages ${where}`).get(...params).count;
  const messages = db.prepare(`
    SELECT id, model_id, role, is_free,
           CASE WHEN LENGTH(content) > 200 THEN SUBSTR(content, 1, 200) || '…' ELSE content END as content,
           created_at
    FROM messages
    ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);
  res.json({ messages, total, page: parseInt(page), limit: parseInt(limit) });
});

app.patch('/api/admin/users/:id/balance', adminMiddleware, (req, res) => {
  const amt = parseFloat(req.body.amount);
  if (!Number.isFinite(amt)) return res.status(400).json({ error: 'amount обязателен и должен быть числом' });
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  db.prepare('UPDATE users SET balance = MAX(0, balance + ?) WHERE id = ?').run(amt, req.params.id);
  db.prepare("INSERT INTO transactions (type, user_id, amount, description) VALUES ('admin_adjustment', ?, ?, ?)").run(req.params.id, amt, req.body.reason || 'Корректировка администратором');
  const balance = db.prepare('SELECT balance FROM users WHERE id = ?').get(req.params.id).balance;
  res.json({ balance });
});

app.patch('/api/admin/users/:id/ban', adminMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, banned FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  const newStatus = user.banned ? 0 : 1;
  db.prepare('UPDATE users SET banned = ? WHERE id = ?').run(newStatus, req.params.id);
  res.json({ banned: !!newStatus, message: newStatus ? 'Пользователь заблокирован' : 'Пользователь разблокирован' });
});

app.patch('/api/admin/users/:id/corporate', adminMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, corporate FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  const newStatus = user.corporate ? 0 : 1;
  db.prepare('UPDATE users SET corporate = ? WHERE id = ?').run(newStatus, req.params.id);
  res.json({ corporate: !!newStatus, message: newStatus ? 'Пользователь добавлен в корпоративные' : 'Пользователь удалён из корпоративных' });
});

app.delete('/api/admin/users/:id', adminMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, email, name, is_admin FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  if (user.is_admin) {
    return res.status(403).json({ error: 'Нельзя удалить администратора' });
  }

  try {
    const tx = db.transaction(function() {
      deleteAllUserData(db, user.id);
    });
    tx();

    console.log('[admin] user deleted', { user_id: user.id, email: user.email });
    res.json({ message: 'Пользователь удалён' });
  } catch (err) {
    console.error('[admin] user delete error', err);
    res.status(500).json({ error: 'Ошибка при удалении пользователя: ' + err.message });
  }
});

/**
 * Delete all data for a single user (used by single and bulk delete).
 * Must be called inside a transaction.
 */
function deleteAllUserData(dbConn, userId) {
  dbConn.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  dbConn.prepare('DELETE FROM messages WHERE user_id = ?').run(userId);
  dbConn.prepare('DELETE FROM transactions WHERE user_id = ?').run(userId);
  dbConn.prepare('DELETE FROM telegram_payments WHERE user_id = ?').run(userId);
  dbConn.prepare('DELETE FROM telegram_link_codes WHERE user_id = ?').run(userId);
  dbConn.prepare('DELETE FROM telegram_links WHERE user_id = ?').run(userId);
  const agentIds = dbConn.prepare('SELECT id FROM agents WHERE owner_user_id = ?').all(userId).map(r => r.id);
  for (const aid of agentIds) {
    dbConn.prepare('DELETE FROM agent_sessions WHERE agent_id = ?').run(aid);
    dbConn.prepare('DELETE FROM agent_messages WHERE agent_id = ?').run(aid);
  }
  dbConn.prepare('DELETE FROM agents WHERE owner_user_id = ?').run(userId);
  const convIds = dbConn.prepare('SELECT id FROM support_conversations WHERE user_id = ?').all(userId).map(r => r.id);
  for (const cid of convIds) {
    dbConn.prepare('DELETE FROM support_messages WHERE conversation_id = ?').run(cid);
  }
  dbConn.prepare('DELETE FROM support_conversations WHERE user_id = ?').run(userId);
  dbConn.prepare('DELETE FROM api_keys WHERE user_id = ?').run(userId);
  dbConn.prepare('DELETE FROM analytics_events WHERE user_id = ?').run(userId);
  dbConn.prepare('DELETE FROM site_purchases WHERE user_id = ?').run(userId);
  dbConn.prepare('DELETE FROM video_jobs WHERE user_id = ?').run(userId);
  dbConn.prepare('DELETE FROM yookassa_payments WHERE user_id = ?').run(userId);
  dbConn.prepare('DELETE FROM subscriptions WHERE user_id = ?').run(userId);
  dbConn.prepare('DELETE FROM referrals WHERE referrer_user_id = ? OR referred_user_id = ?').run(userId, userId);
  dbConn.prepare('UPDATE users SET referred_by_user_id = NULL WHERE referred_by_user_id = ?').run(userId);
  dbConn.prepare('DELETE FROM users WHERE id = ?').run(userId);
}

app.post('/api/admin/users/bulk-delete', adminMiddleware, (req, res) => {
  const { user_ids } = req.body;
  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    return res.status(400).json({ error: 'user_ids должен быть непустым массивом' });
  }

  // Filter out admins
  const adminIds = db.prepare(
    `SELECT id FROM users WHERE id IN (${user_ids.map(() => '?').join(',')}) AND is_admin = 1`
  ).all(...user_ids).map(r => r.id);

  const validIds = user_ids.filter(function(id) { return !adminIds.includes(id); });
  if (validIds.length === 0) {
    return res.status(403).json({ error: 'Нельзя удалить администраторов' });
  }

  let deletedCount = 0;
  try {
    const tx = db.transaction(function() {
      for (const id of validIds) {
        deleteAllUserData(db, id);
        deletedCount++;
      }
    });
    tx();
    console.log('[admin] bulk delete', { deleted: deletedCount, skipped_admins: adminIds.length });
    res.json({ deleted: deletedCount, skipped_admins: adminIds.length });
  } catch (err) {
    console.error('[admin] bulk delete error', err);
    res.status(500).json({ error: 'Ошибка при массовом удалении: ' + err.message });
  }
});

// ── Admin: Create user ──
app.post('/api/admin/users', adminMiddleware, requireJsonFields(['email', 'password', 'name']), async (req, res) => {
  const { email, password, name, balance = 0, marketing_enabled = true } = req.body;
  if (password.length < 6) return res.status(400).json({ error: 'Пароль должен быть минимум 6 символов' });
  try {
    const normalizedEmail = normalizeEmail(email);
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const userApiKey = 'jr_' + crypto.randomBytes(24).toString('hex');
    const result = db.prepare(`
      INSERT INTO users (email, password, name, balance, api_key, marketing_enabled)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(normalizedEmail, hashedPassword, name.trim(), parseFloat(balance) || 0, userApiKey, marketing_enabled ? 1 : 0);
    const userId = result.lastInsertRowid;
    const user = db.prepare('SELECT id, email, name, balance, api_key, created_at, marketing_enabled FROM users WHERE id = ?').get(userId);
    console.log('[admin] created user', { id: userId, email: normalizedEmail });
    res.json({ success: true, user });
  } catch (e) {
    console.error('[admin] create user error', e);
    res.status(500).json({ error: e.message || 'Ошибка при создании пользователя' });
  }
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

// ── Analytics ingest for click heatmaps, scroll depth, rage clicks ──
app.post('/api/analytics/events', publicWriteRateLimit, (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const events = Array.isArray(req.body) ? req.body : [req.body];
  let inserted = 0;
  for (const event of events) {
    try { recordAnalyticsEvent(db, event); inserted++; } catch {}
  }
  if (inserted > 0) res.json({ ok: true, inserted });
  else res.status(400).json({ error: 'Невалидные события' });
});

// ── Admin: Analytics backend routes ──
app.get('/api/admin/analytics/summary', adminMiddleware, (req, res) => {
  const hours = Number(req.query.hours || 12);
  const path = String(req.query.path || '');
  res.json(getAnalyticsSummary(db, { hours, path }));
});

app.get('/api/admin/analytics/heatmap-click', adminMiddleware, (req, res) => {
  const hours = Number(req.query.hours || 24);
  const path = String(req.query.path || '/');
  const gridSize = Number(req.query.grid_size || 24);
  const viewport = String(req.query.viewport || '');
  res.json({ points: getHeatmapClickData(db, { hours, path, gridSize, viewport }) });
});

app.get('/api/admin/analytics/heatmap-mouse', adminMiddleware, (req, res) => {
  const hours = Number(req.query.hours || 24);
  const path = String(req.query.path || '/');
  const gridSize = Number(req.query.grid_size || 32);
  const viewport = String(req.query.viewport || '');
  res.json({ points: getHeatmapMouseData(db, { hours, path, gridSize, viewport }) });
});

app.get('/api/admin/analytics/scroll-depth', adminMiddleware, (req, res) => {
  const hours = Number(req.query.hours || 24);
  const path = String(req.query.path || '');
  res.json({ buckets: getScrollDepthData(db, { hours, path }) });
});

app.get('/api/admin/analytics/rage-clicks', adminMiddleware, (req, res) => {
  const hours = Number(req.query.hours || 24);
  const path = String(req.query.path || '');
  res.json({ items: getRageClickData(db, { hours, path }) });
});

app.get('/api/admin/analytics/sessions', adminMiddleware, (req, res) => {
  const hours = Number(req.query.hours || 24);
  res.json(getSessionAnalytics(db, { hours }));
});

// ── Admin: Promo codes ──
app.get('/api/admin/promo-codes', adminMiddleware, (req, res) => {
  const codes = db.prepare('SELECT * FROM promo_codes ORDER BY created_at DESC').all();
  res.json(codes);
});

app.post('/api/admin/promo-codes', adminMiddleware, (req, res) => {
  const { code, amount_type, amount_value, max_uses, expires_at, description } = req.body;
  if (!code || !amount_value || amount_value <= 0) {
    return res.status(400).json({ error: 'code и amount_value > 0 обязательны' });
  }
  const codeUpper = code.toUpperCase().trim();
  if (codeUpper.length < 3) {
    return res.status(400).json({ error: 'Код должен быть минимум 3 символа' });
  }
  const type = amount_type === 'percent' ? 'percent' : 'fixed';
  const uses = Math.max(1, parseInt(max_uses) || 1);
  try {
    db.prepare('INSERT INTO promo_codes (code, amount_type, amount_value, max_uses, expires_at, description) VALUES (?, ?, ?, ?, ?, ?)').run(
      codeUpper, type, parseFloat(amount_value), uses, expires_at || null, description || null
    );
    res.json({ success: true, message: 'Промокод создан' });
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Такой код уже существует' });
    }
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/admin/promo-codes/:id', adminMiddleware, (req, res) => {
  const promo = db.prepare('SELECT id, is_active FROM promo_codes WHERE id = ?').get(req.params.id);
  if (!promo) return res.status(404).json({ error: 'Промокод не найден' });
  const newStatus = promo.is_active ? 0 : 1;
  db.prepare('UPDATE promo_codes SET is_active = ? WHERE id = ?').run(newStatus, req.params.id);
  res.json({ is_active: !!newStatus, message: newStatus ? 'Промокод активирован' : 'Промокод деактивирован' });
});

app.delete('/api/admin/promo-codes/:id', adminMiddleware, (req, res) => {
  const promo = db.prepare('SELECT id FROM promo_codes WHERE id = ?').get(req.params.id);
  if (!promo) return res.status(404).json({ error: 'Промокод не найден' });
  db.prepare('DELETE FROM promo_redemptions WHERE promo_code_id = ?').run(req.params.id);
  db.prepare('DELETE FROM promo_codes WHERE id = ?').run(req.params.id);
  res.json({ message: 'Промокод удалён' });
});

// ── Public: Apply a promo code ──
app.post('/api/promo/apply', authMiddleware, (req, res) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string' || code.trim().length < 3) {
    return res.status(400).json({ error: 'Введите код' });
  }
  const codeUpper = code.toUpperCase().trim();
  const promo = db.prepare('SELECT * FROM promo_codes WHERE code = ?').get(codeUpper);
  if (!promo) return res.status(404).json({ error: 'Промокод не найден' });
  if (!promo.is_active) return res.status(400).json({ error: 'Промокод не активен' });
  if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) {
    return res.status(400).json({ error: 'Срок действия промокода истёк' });
  }
  if (promo.used_count >= promo.max_uses) {
    return res.status(400).json({ error: 'Промокод больше не действует (исчерпан лимит)' });
  }
  // Check if user already used this code
  const alreadyUsed = db.prepare('SELECT id FROM promo_redemptions WHERE promo_code_id = ? AND user_id = ?').get(promo.id, req.user.id);
  if (alreadyUsed) {
    return res.status(400).json({ error: 'Вы уже использовали этот промокод' });
  }
  // Calculate bonus
  var bonusAmount = promo.amount_type === 'percent'
    ? Math.round(promo.amount_value * 100) / 100 // just the percentage value (e.g. 10%)
    : promo.amount_value;
  // For percent, it's a flat bonus equal to the percent value in rubles for simplicity
  // Actually: percent means % of what? Let's make it simple — percent means percent of the amount_value as rubles
  // Or better: percent = percentage of 100 rubles baseline. Actually, let's keep it dead simple:
  // fixed = add N rubles, percent = add N rubles (same behavior for MVP, just tracked differently)
  // Actually no, let's make percent meaningful: percent = N% bonus on the amount_value = N rubles added as bonus

  const tx = db.transaction(function() {
    // Add to bonus balance
    db.prepare('UPDATE users SET bonus_balance = COALESCE(bonus_balance, 0) + ? WHERE id = ?').run(bonusAmount, req.user.id);
    // Record transaction
    db.prepare("INSERT INTO transactions (type, user_id, amount, description) VALUES ('promo_bonus', ?, ?, ?)").run(
      req.user.id, bonusAmount, 'Промокод: ' + codeUpper + (promo.description ? ' (' + promo.description + ')' : '')
    );
    // Record redemption
    db.prepare('INSERT INTO promo_redemptions (promo_code_id, user_id, bonus_amount) VALUES (?, ?, ?)').run(promo.id, req.user.id, bonusAmount);
    // Increment usage
    db.prepare('UPDATE promo_codes SET used_count = used_count + 1 WHERE id = ?').run(promo.id);
  });
  tx();

  res.json({ success: true, amount: bonusAmount, message: 'Промокод активирован! +' + bonusAmount + ' ₽' });
});

registerContentRoutes(app, { db, adminMiddleware });

// ── Admin: Subscriptions list ──
app.get('/api/admin/subscriptions', adminMiddleware, (req, res) => {
  const subs = db.prepare(`
    SELECT s.id, s.user_id, s.plan_type, s.period, s.status, s.tier, s.start_date, s.end_date, s.created_at,
           u.name as user_name, u.email as user_email, u.balance
    FROM subscriptions s
    JOIN users u ON u.id = s.user_id
    ORDER BY s.created_at DESC
  `).all();
  res.json(subs);
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
    return res.status(400).json({ error: 'Ключ провайдера моделей не настроен' });
  }

  try {
    const count = await syncOpenRouterModels({
      db,
      apiKey: OPENROUTER_API_KEY,
      proxyUrl: OPENROUTER_PROXY_URL,
      forceRetranslate: Boolean(req.body?.force),
    });
    res.json({ success: true, count });
  } catch (e) {
    console.error('[openrouter] manual sync failed', e);
    res.status(500).json({ error: e.message || 'Не удалось синхронизировать каталог моделей' });
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

// ── Admin: Model logs ──
app.get('/api/admin/model-logs', adminMiddleware, (req, res) => {
  const { page = 1, limit = 50, model_id, user_id, role, source = 'all', search } = req.query;
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 50));
  const offset = (pageNum - 1) * limitNum;

  const userFilters = [];
  const userParams = [];
  const agentFilters = [];
  const agentParams = [];

  if (model_id) {
    userFilters.push('m.model_id = ?');
    userParams.push(model_id);
    agentFilters.push('am.model_id = ?');
    agentParams.push(model_id);
  }
  if (user_id) {
    userFilters.push('m.user_id = ?');
    userParams.push(parseInt(user_id));
  }
  if (role) {
    userFilters.push('m.role = ?');
    userParams.push(role);
    agentFilters.push('am.role = ?');
    agentParams.push(role);
  }
  if (search) {
    const q = `%${search}%`;
    userFilters.push('(m.content LIKE ? OR m.model_id LIKE ? OR u.email LIKE ?)');
    userParams.push(q, q, q);
    agentFilters.push('(am.content LIKE ? OR am.model_id LIKE ? OR a.name LIKE ?)');
    agentParams.push(q, q, q);
  }

  const userWhere = userFilters.length ? `WHERE ${userFilters.join(' AND ')}` : '';
  const agentWhere = agentFilters.length ? `WHERE ${agentFilters.join(' AND ')}` : '';

  const userSql = `
    SELECT
      'user' as source, m.id, m.user_id, u.email as user_email, u.name as user_name,
      NULL as agent_id, NULL as agent_name, m.model_id, mod.name as model_name,
      mod.provider, mod.category, m.role, m.is_free, m.created_at,
      CASE WHEN LENGTH(m.content) > 160 THEN SUBSTR(m.content, 1, 160) || '…' ELSE m.content END as preview,
      LENGTH(m.content) as content_length
    FROM messages m
    JOIN users u ON u.id = m.user_id
    LEFT JOIN models mod ON mod.id = m.model_id
    ${userWhere}
  `;

  const agentSql = `
    SELECT
      'agent' as source, am.id, NULL as user_id, NULL as user_email, NULL as user_name,
      am.agent_id, a.name as agent_name, am.model_id, mod.name as model_name,
      mod.provider, mod.category, am.role, 0 as is_free, am.created_at,
      CASE WHEN LENGTH(am.content) > 160 THEN SUBSTR(am.content, 1, 160) || '…' ELSE am.content END as preview,
      LENGTH(am.content) as content_length
    FROM agent_messages am
    JOIN agents a ON a.id = am.agent_id
    LEFT JOIN models mod ON mod.id = am.model_id
    ${agentWhere}
  `;

  let total = 0;
  let logs = [];

  if (source === 'user' || user_id) {
    total = db.prepare(`SELECT COUNT(*) as count FROM messages m JOIN users u ON u.id = m.user_id ${userWhere}`).get(...userParams).count;
    logs = db.prepare(`${userSql} ORDER BY m.created_at DESC LIMIT ? OFFSET ?`).all(...userParams, limitNum, offset);
  } else if (source === 'agent') {
    total = db.prepare(`SELECT COUNT(*) as count FROM agent_messages am JOIN agents a ON a.id = am.agent_id ${agentWhere}`).get(...agentParams).count;
    logs = db.prepare(`${agentSql} ORDER BY am.created_at DESC LIMIT ? OFFSET ?`).all(...agentParams, limitNum, offset);
  } else {
    const userCount = db.prepare(`SELECT COUNT(*) as count FROM messages m JOIN users u ON u.id = m.user_id ${userWhere}`).get(...userParams).count;
    const agentCount = db.prepare(`SELECT COUNT(*) as count FROM agent_messages am JOIN agents a ON a.id = am.agent_id ${agentWhere}`).get(...agentParams).count;
    total = userCount + agentCount;
    logs = db.prepare(`
      SELECT * FROM (
        ${userSql}
        UNION ALL
        ${agentSql}
      )
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).all(...userParams, ...agentParams, limitNum, offset);
  }

  const models = db.prepare('SELECT id, name FROM models ORDER BY name ASC').all();
  res.json({ logs, total, page: pageNum, limit: limitNum, models });
});

// ── Admin: Model dashboard ──
app.get('/api/admin/models/dashboard', adminMiddleware, (req, res) => {
  const { days = 14 } = req.query;
  const dayCount = Math.min(90, Math.max(7, parseInt(days) || 14));

  const userStats = db.prepare(`
    SELECT
      m.model_id,
      COUNT(*) as total_messages,
      SUM(CASE WHEN m.role = 'user' THEN 1 ELSE 0 END) as user_requests,
      COUNT(DISTINCT m.user_id) as unique_users,
      SUM(CASE WHEN m.role = 'user' AND m.is_free = 1 THEN 1 ELSE 0 END) as free_requests,
      SUM(CASE WHEN m.role = 'user' AND m.is_free = 0 THEN 1 ELSE 0 END) as paid_requests,
      SUM(CASE WHEN m.created_at >= datetime('now', '-1 day') THEN 1 ELSE 0 END) as today_count
    FROM messages m
    GROUP BY m.model_id
  `).all();

  const agentStats = db.prepare(`
    SELECT model_id, COUNT(*) as agent_messages
    FROM agent_messages
    GROUP BY model_id
  `).all();

  const agentMap = Object.fromEntries(agentStats.map((row) => [row.model_id, row.agent_messages]));
  const allModels = db.prepare('SELECT * FROM models ORDER BY provider, name ASC').all();
  const modelMap = Object.fromEntries(allModels.map((m) => [m.id, m]));
  const statsMap = Object.fromEntries(userStats.map((s) => [s.model_id, s]));

  const allModelIds = new Set([...Object.keys(statsMap), ...Object.keys(agentMap)]);
  const totalUserRequests = userStats.reduce((sum, s) => sum + s.user_requests, 0);

  const models = [...allModelIds].map((modelId) => {
    const stat = statsMap[modelId] || {};
    const meta = modelMap[modelId] || { id: modelId, name: modelId, provider: '—', category: '—', price: 0, color: '#10B981' };
    const userRequests = stat.user_requests || 0;
    const agentMessages = agentMap[modelId] || 0;
    return {
      model_id: modelId,
      name: meta.name,
      provider: meta.provider,
      category: meta.category,
      price: meta.price,
      color: meta.color,
      is_active: meta.is_active ?? 1,
      total_messages: (stat.total_messages || 0) + agentMessages,
      user_requests: userRequests,
      agent_messages: agentMessages,
      unique_users: stat.unique_users || 0,
      free_requests: stat.free_requests || 0,
      paid_requests: stat.paid_requests || 0,
      today_count: stat.today_count || 0,
      share_pct: totalUserRequests > 0 ? Math.round((userRequests / totalUserRequests) * 1000) / 10 : 0,
    };
  }).sort((a, b) => b.user_requests - a.user_requests);

  const activityChart = db.prepare(`
    SELECT strftime('%Y-%m-%d', created_at) as label, COUNT(*) as count
    FROM messages
    WHERE role = 'user' AND created_at >= datetime('now', '-' || ? || ' days')
    GROUP BY label
    ORDER BY label ASC
  `).all(dayCount);

  const categoryBreakdown = db.prepare(`
    SELECT mod.category, COUNT(*) as count
    FROM messages m
    JOIN models mod ON mod.id = m.model_id
    WHERE m.role = 'user'
    GROUP BY mod.category
    ORDER BY count DESC
  `).all();

  const categoryTotal = categoryBreakdown.reduce((sum, row) => sum + row.count, 0);
  const categories = categoryBreakdown.map((row) => ({
    category: row.category,
    count: row.count,
    pct: categoryTotal > 0 ? Math.round((row.count / categoryTotal) * 1000) / 10 : 0,
  }));

  const summary = {
    total_user_requests: totalUserRequests,
    total_today: models.reduce((sum, m) => sum + m.today_count, 0),
    total_free: models.reduce((sum, m) => sum + m.free_requests, 0),
    total_paid: models.reduce((sum, m) => sum + m.paid_requests, 0),
    models_used: models.filter((m) => m.user_requests > 0).length,
    total_models: allModels.length,
    unique_users: db.prepare('SELECT COUNT(DISTINCT user_id) as count FROM messages WHERE role = ?').get('user').count,
  };

  res.json({ summary, models, activity_chart: activityChart, categories, days: dayCount });
});

// ── Admin: Support chat ──

app.get('/api/admin/support/conversations', adminMiddleware, (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const search = String(req.query.search || '').trim();

  let where = 'WHERE 1=1';
  const params = [];
  if (search) {
    where += ' AND (u.email LIKE ? OR u.name LIKE ? OR sc.guest_token LIKE ? OR EXISTS (SELECT 1 FROM support_messages sm WHERE sm.conversation_id = sc.id AND sm.content LIKE ?))';
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  const total = db.prepare(`
    SELECT COUNT(*) as count
    FROM support_conversations sc
    LEFT JOIN users u ON u.id = sc.user_id
    ${where}
  `).get(...params).count;

  const rows = db.prepare(`
    SELECT
      sc.*,
      u.email as user_email,
      u.name as user_name,
      (
        SELECT content FROM support_messages
        WHERE conversation_id = sc.id
        ORDER BY id DESC LIMIT 1
      ) as last_message,
      (
        SELECT created_at FROM support_messages
        WHERE conversation_id = sc.id
        ORDER BY id DESC LIMIT 1
      ) as last_message_at,
      (SELECT COUNT(*) FROM support_messages WHERE conversation_id = sc.id) as message_count
    FROM support_conversations sc
    LEFT JOIN users u ON u.id = sc.user_id
    ${where}
    ORDER BY sc.updated_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({
    conversations: rows.map(formatConversationRow),
    total,
    page,
    limit,
  });
});

app.get('/api/admin/support/conversations/:id', adminMiddleware, (req, res) => {
  const conversation = db.prepare(`
    SELECT sc.*, u.email as user_email, u.name as user_name
    FROM support_conversations sc
    LEFT JOIN users u ON u.id = sc.user_id
    WHERE sc.id = ?
  `).get(req.params.id);

  if (!conversation) return res.status(404).json({ error: 'Диалог не найден' });

  res.json({
    conversation: formatConversationRow({
      ...conversation,
      message_count: db.prepare('SELECT COUNT(*) as count FROM support_messages WHERE conversation_id = ?').get(conversation.id).count,
    }),
    messages: getConversationMessages(db, conversation.id),
  });
});

app.post('/api/admin/support/conversations/:id/messages', adminMiddleware, async (req, res) => {
  const content = String(req.body?.content || '').trim();
  if (!content) return res.status(400).json({ error: 'Введите сообщение' });
  if (content.length > 4000) return res.status(400).json({ error: 'Сообщение слишком длинное' });

  const conversation = db.prepare('SELECT * FROM support_conversations WHERE id = ?').get(req.params.id);
  if (!conversation) return res.status(404).json({ error: 'Диалог не найден' });

  db.prepare(`
    INSERT INTO support_messages (conversation_id, role, content, admin_user_id)
    VALUES (?, 'admin', ?, ?)
  `).run(conversation.id, content, req.adminUserId);

  db.prepare(`
    UPDATE support_conversations
    SET handoff_to_human = 1, updated_at = datetime('now')
    WHERE id = ?
  `).run(conversation.id);

  res.json({
    messages: getConversationMessages(db, conversation.id),
    handoff_to_human: true,
  });
});

app.post('/api/admin/support/conversations/:id/resume-ai', adminMiddleware, (req, res) => {
  const conversation = db.prepare('SELECT * FROM support_conversations WHERE id = ?').get(req.params.id);
  if (!conversation) return res.status(404).json({ error: 'Диалог не найден' });

  db.prepare(`
    UPDATE support_conversations
    SET handoff_to_human = 0, updated_at = datetime('now')
    WHERE id = ?
  `).run(conversation.id);

  res.json({ ok: true, handoff_to_human: false });
});

// ── SPA fallback ────────────────────────────────────────

const distPath = join(__dirname, '..', 'dist');
registerSpaRoutes(app, { distPath, renderSeoHtml });

// Sync blog posts from DB into static cache (for SEO)
try {
  syncBlogPostsFromDb(db);
  logger.info('blog posts synced from database');
} catch (e) {
  logger.warn('blog sync failed', { error: e.message });
}

// POST /api/v1/chat/demo — демо-чат без регистрации (3 запроса с IP)
const demoIpCounts = new Map();

app.post('/api/v1/chat/demo', async (req, res) => {
  const { content, model_id } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Введите сообщение' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
  const count = (demoIpCounts.get(ip) || 0) + 1;
  if (count > 3) return res.status(429).json({ error: 'Лимит бесплатных запросов исчерпан. Зарегистрируйтесь, чтобы продолжить.' });
  demoIpCounts.set(ip, count);

  const model = db.prepare('SELECT * FROM models WHERE id = ? AND is_active = 1').get(model_id || 'google/gemini-2.5-flash-lite');
  if (!model) return res.status(404).json({ error: 'Модель не найдена' });

  try {
    const result = await generateModelResponse(model, content, 'Demo User');
    res.json({ response: result.response, remaining: 3 - count });
  } catch (e) {
    console.error('[v1/chat/demo] error:', e.message);
    res.status(502).json({ error: e.message || 'Ошибка генерации ответа' });
  }
});

// Cleanup old IPs every hour
setInterval(() => { demoIpCounts.clear(); }, 3600_000);

app.listen(PORT, async () => {
  logger.info('server started', { url: `http://localhost:${PORT}`, api: `http://localhost:${PORT}/api` });

  try {
    await ensureTelegramWebhook();
  } catch (e) {
    console.error('[telegram] ensureTelegramWebhook failed', e);
  }

  try {
    await ensureAdminAccount();
  } catch (e) {
    console.error('[admin] ensureAdminAccount failed', e);
  }

  try {
    backfillReferralCodes(db);
  } catch (e) {
    console.error('[referrals] backfill failed', e.message);
  }

  if (OPENROUTER_API_KEY) {
    const untranslated = countModelsNeedingRussianTranslation(db);
    const modelCount = db.prepare('SELECT COUNT(*) as count FROM models WHERE is_active = 1').get().count;
    if (untranslated > 0) {
      console.log(`[openrouter] ${untranslated} models need Russian descriptions`);
    }
    if (modelCount >= 50 && untranslated === 0) {
      console.log(`[openrouter] skip startup sync (${modelCount} active models)`);
      fetchOpenRouterVideoMeta({ apiKey: OPENROUTER_API_KEY, proxyUrl: OPENROUTER_PROXY_URL })
        .then((meta) => console.log(`[openrouter] cached video meta for ${Object.keys(meta).length} models`))
        .catch((e) => console.error('[openrouter] video meta cache failed', e.message));
    } else {
      const delayMs = modelCount === 0 ? 0 : 15000;
      if (modelCount === 0) {
        console.log('[openrouter] catalog empty, syncing models immediately');
      }
      setTimeout(() => {
    syncOpenRouterModels({
      db,
      apiKey: OPENROUTER_API_KEY,
      proxyUrl: OPENROUTER_PROXY_URL,
          forceRetranslate: untranslated > 0,
    })
      .then((count) => console.log(`[openrouter] synced ${count} models`))
      .catch((e) => console.error('[openrouter] model sync failed', e));
      }, delayMs);
    }
  }

});

// ── Periodic cleanup of expired verification codes ──
function cleanExpiredVerificationCodes() {
  try {
    const result = db.prepare("DELETE FROM email_verification_codes WHERE expires_at < datetime('now')").run();
    if (result.changes > 0) {
      console.log(`[cleanup] deleted ${result.changes} expired verification codes`);
    }
  } catch (e) {
    console.error('[cleanup] verification codes error', e.message);
  }
}
// Run every hour
setInterval(cleanExpiredVerificationCodes, 60 * 60 * 1000);
// Run once at startup
setTimeout(cleanExpiredVerificationCodes, 10_000);

function shutdown(signal) {
  console.log(`[server] ${signal} received, shutting down`);
  checkpointDatabase('TRUNCATE');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('[server] UNHANDLED REJECTION:', reason instanceof Error ? reason.message : reason);
});
process.on('uncaughtException', (err) => {
  console.error('[server] UNCAUGHT EXCEPTION:', err.message);
  console.error(err.stack);
  checkpointDatabase('TRUNCATE');
  process.exit(1);
});
