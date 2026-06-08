import crypto from 'crypto';
import db from './db.js';
import {
  getWallet,
} from './billing.js';

export const REFERRAL_BONUS_RUB = Number(process.env.REFERRAL_BONUS_RUB || 200);
export const REFERRAL_PROMO_UNTIL = process.env.REFERRAL_PROMO_UNTIL || '2026-05-31T23:59:59+03:00';
export const SITE_URL = process.env.SITE_URL || 'https://justrouter.ru';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizeReferralCode(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isReferralPromoActive(now = new Date()) {
  const until = new Date(REFERRAL_PROMO_UNTIL);
  return Number.isFinite(until.getTime()) && now.getTime() <= until.getTime();
}

export function generateReferralCode() {
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    code += CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];
  }
  return code;
}

export function ensureUserReferralCode(dbConn, userId) {
  const user = dbConn.prepare('SELECT referral_code FROM users WHERE id = ?').get(userId);
  if (user?.referral_code) return user.referral_code;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = generateReferralCode();
    try {
      dbConn.prepare('UPDATE users SET referral_code = ? WHERE id = ? AND referral_code IS NULL').run(code, userId);
      const updated = dbConn.prepare('SELECT referral_code FROM users WHERE id = ?').get(userId);
      if (updated?.referral_code) return updated.referral_code;
    } catch {
      // unique collision
    }
  }
  throw new Error('Не удалось создать реферальный код');
}

export function findReferrerByCode(dbConn, code) {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return null;
  return dbConn.prepare('SELECT id, email, referral_code FROM users WHERE referral_code = ?').get(normalized);
}

function creditReferralBonus(dbConn, userId, amountRub, description) {
  const amount = Number(amountRub);
  if (!Number.isFinite(amount) || amount <= 0) return;

  const wallet = getWallet(dbConn, userId);
  const newBonus = Number(wallet.bonus_balance || 0) + amount;

  dbConn.prepare('UPDATE users SET bonus_balance = ? WHERE id = ?')
    .run(newBonus, userId);
  dbConn.prepare(`
    INSERT INTO transactions (type, user_id, amount, bonus_amount, description)
    VALUES ('referral_bonus', ?, ?, ?, ?)
  `).run(userId, amount, amount, description);
}

export function applyReferralOnSignup(dbConn, { referredUserId, referralCode, referredEmail }) {
  const referrer = findReferrerByCode(dbConn, referralCode);
  if (!referrer) return { applied: false, reason: 'invalid_code' };
  if (normalizeEmail(referrer.email) === normalizeEmail(referredEmail)) {
    return { applied: false, reason: 'self_referral' };
  }

  const existing = dbConn.prepare('SELECT id FROM referrals WHERE referred_user_id = ?').get(referredUserId);
  if (existing) return { applied: false, reason: 'already_referred' };

  dbConn.prepare('UPDATE users SET referred_by_user_id = ? WHERE id = ?').run(referrer.id, referredUserId);

  // Record referral but DON'T pay bonus yet — only after first successful topup
  dbConn.prepare(`
    INSERT INTO referrals (referrer_user_id, referred_user_id, referrer_bonus_rub, referred_bonus_rub)
    VALUES (?, ?, ?, ?)
  `).run(referrer.id, referredUserId, 0, REFERRAL_BONUS_RUB);

  return { applied: true, referrer_id: referrer.id };
}

/**
 * Credit referral bonus when the referred user makes their first successful topup.
 * Safe to call on every topup — it only pays once.
 */
export function creditReferralForTopup(dbConn, userId) {
  // Check if this user was referred by someone
  const user = dbConn.prepare('SELECT id, referred_by_user_id FROM users WHERE id = ?').get(userId);
  if (!user?.referred_by_user_id) return false;

  // Find the referral record where bonus hasn't been paid yet
  const referral = dbConn.prepare(`
    SELECT id, referrer_bonus_rub FROM referrals
    WHERE referred_user_id = ? AND referrer_bonus_rub = 0
  `).get(userId);
  if (!referral) return false;

  // Pay the referrer
  creditReferralBonus(
    dbConn,
    user.referred_by_user_id,
    REFERRAL_BONUS_RUB,
    `Бонус за приглашение пользователя #${userId} (после первого пополнения)`,
  );

  // Mark as paid
  dbConn.prepare('UPDATE referrals SET referrer_bonus_rub = ? WHERE id = ?')
    .run(REFERRAL_BONUS_RUB, referral.id);

  console.log('[referral] bonus paid', {
    referrer_id: user.referred_by_user_id,
    referred_id: userId,
    amount: REFERRAL_BONUS_RUB,
  });

  return true;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase().replace(/[.,;]+$/g, '');
}

export function getReferralStats(dbConn, userId) {
  const code = ensureUserReferralCode(dbConn, userId);
  const row = dbConn.prepare(`
    SELECT
      COUNT(*) as invited_count,
      COALESCE(SUM(referrer_bonus_rub), 0) as earned_rub
    FROM referrals
    WHERE referrer_user_id = ?
  `).get(userId);

  return {
    referral_code: code,
    referral_url: `${SITE_URL}/?ref=${code}`,
    invited_count: Number(row?.invited_count || 0),
    earned_rub: Number(row?.earned_rub || 0),
    bonus_rub: REFERRAL_BONUS_RUB,
    promo_active: isReferralPromoActive(),
    promo_until: REFERRAL_PROMO_UNTIL,
  };
}

export function backfillReferralCodes(dbConn = db) {
  const users = dbConn.prepare('SELECT id FROM users WHERE referral_code IS NULL').all();
  for (const user of users) {
    ensureUserReferralCode(dbConn, user.id);
  }
}

export function getAdminReferralOverview(dbConn) {
  const totals = dbConn.prepare(`
    SELECT
      COUNT(*) as total_referrals,
      COALESCE(SUM(referrer_bonus_rub), 0) as total_referrer_bonus,
      COALESCE(SUM(referred_bonus_rub), 0) as total_referred_bonus
    FROM referrals
  `).get();

  const usersWithCode = dbConn.prepare(`
    SELECT COUNT(*) as count
    FROM users
    WHERE referral_code IS NOT NULL AND COALESCE(is_admin, 0) = 0
  `).get().count;

  const referredUsers = dbConn.prepare(`
    SELECT COUNT(*) as count
    FROM users
    WHERE referred_by_user_id IS NOT NULL AND COALESCE(is_admin, 0) = 0
  `).get().count;

  const referralsToday = dbConn.prepare(`
    SELECT COUNT(*) as count FROM referrals WHERE created_at >= datetime('now', '-1 day')
  `).get().count;

  const chart = dbConn.prepare(`
    SELECT strftime('%Y-%m-%d', created_at) as label, COUNT(*) as count
    FROM referrals
    WHERE created_at >= datetime('now', '-14 days')
    GROUP BY label
    ORDER BY label ASC
  `).all();

  const recentReferrals = dbConn.prepare(`
    SELECT
      r.id,
      r.created_at,
      r.referrer_bonus_rub,
      r.referred_bonus_rub,
      ref_user.id as referrer_id,
      ref_user.email as referrer_email,
      ref_user.name as referrer_name,
      ref_user.referral_code as referrer_code,
      new_user.id as referred_id,
      new_user.email as referred_email,
      new_user.name as referred_name
    FROM referrals r
    JOIN users ref_user ON ref_user.id = r.referrer_user_id
    JOIN users new_user ON new_user.id = r.referred_user_id
    ORDER BY r.created_at DESC
    LIMIT 100
  `).all();

  const topReferrers = dbConn.prepare(`
    SELECT
      u.id,
      u.email,
      u.name,
      u.referral_code,
      COUNT(r.id) as invited_count,
      COALESCE(SUM(r.referrer_bonus_rub), 0) as earned_rub
    FROM users u
    JOIN referrals r ON r.referrer_user_id = u.id
    WHERE COALESCE(u.is_admin, 0) = 0
    GROUP BY u.id
    ORDER BY invited_count DESC, earned_rub DESC
    LIMIT 25
  `).all();

  return {
    bonus_rub: REFERRAL_BONUS_RUB,
    promo_active: isReferralPromoActive(),
    promo_until: REFERRAL_PROMO_UNTIL,
    site_url: SITE_URL,
    link_format: `${SITE_URL}/?ref={CODE}`,
    totals: {
      total_referrals: Number(totals.total_referrals || 0),
      total_referrer_bonus: Number(totals.total_referrer_bonus || 0),
      total_referred_bonus: Number(totals.total_referred_bonus || 0),
      users_with_code: Number(usersWithCode || 0),
      referred_users: Number(referredUsers || 0),
      referrals_today: Number(referralsToday || 0),
    },
    chart,
    recent_referrals: recentReferrals,
    top_referrers: topReferrers.map((row) => ({
      ...row,
      invited_count: Number(row.invited_count || 0),
      earned_rub: Number(row.earned_rub || 0),
      referral_url: row.referral_code ? `${SITE_URL}/?ref=${row.referral_code}` : null,
    })),
  };
}

export function getAdminUserReferralInfo(dbConn, userId) {
  const user = dbConn.prepare(`
    SELECT id, email, name, referral_code, referred_by_user_id, created_at
    FROM users WHERE id = ?
  `).get(userId);
  if (!user) return null;

  const referrer = user.referred_by_user_id
    ? dbConn.prepare('SELECT id, email, name, referral_code FROM users WHERE id = ?').get(user.referred_by_user_id)
    : null;

  const asReferrer = dbConn.prepare(`
    SELECT COUNT(*) as invited_count, COALESCE(SUM(referrer_bonus_rub), 0) as earned_rub
    FROM referrals WHERE referrer_user_id = ?
  `).get(userId);

  const invitedUsers = dbConn.prepare(`
    SELECT
      r.created_at,
      r.referrer_bonus_rub,
      u.id as referred_id,
      u.email as referred_email,
      u.name as referred_name
    FROM referrals r
    JOIN users u ON u.id = r.referred_user_id
    WHERE r.referrer_user_id = ?
    ORDER BY r.created_at DESC
    LIMIT 20
  `).all(userId);

  return {
    referral_code: user.referral_code,
    referral_url: user.referral_code ? `${SITE_URL}/?ref=${user.referral_code}` : null,
    referred_by: referrer,
    invited_count: Number(asReferrer?.invited_count || 0),
    earned_rub: Number(asReferrer?.earned_rub || 0),
    invited_users: invitedUsers,
  };
}
