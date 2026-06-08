import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import db from '../server/db.js';
import {
  applyReferralOnSignup,
  backfillReferralCodes,
  ensureUserReferralCode,
  getReferralStats,
  REFERRAL_BONUS_RUB,
} from '../server/referrals.js';
import { getPublicBalance, REGISTRATION_BONUS_RUB } from '../server/billing.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createTestUser(email, name = 'Test User') {
  const passwordHash = bcrypt.hashSync('test123456', 10);
  const apiKey = `jr_${crypto.randomBytes(12).toString('hex')}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const result = db.prepare(`
    INSERT INTO users (email, password, name, balance, bonus_balance, bonus_expires_at, api_key, marketing_enabled)
    VALUES (?, ?, ?, 0, ?, ?, ?, 1)
  `).run(email, passwordHash, name, REGISTRATION_BONUS_RUB, expiresAt, apiKey);
  const userId = result.lastInsertRowid;
  ensureUserReferralCode(db, userId);
  return userId;
}

function cleanupTestUsers(prefix) {
  const users = db.prepare('SELECT id FROM users WHERE email LIKE ?').all(`${prefix}%`);
  for (const user of users) {
    db.prepare('DELETE FROM referrals WHERE referrer_user_id = ? OR referred_user_id = ?').run(user.id, user.id);
    db.prepare('DELETE FROM transactions WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
  }
}

const prefix = `ref-test-${Date.now()}-`;
cleanupTestUsers('ref-test-');

try {
  backfillReferralCodes(db);

  const referrerId = createTestUser(`${prefix}referrer@test.local`, 'Referrer');
  const referredId = createTestUser(`${prefix}referred@test.local`, 'Referred');

  const referrerStatsBefore = getReferralStats(db, referrerId);
  assert(referrerStatsBefore.referral_code, 'referrer should have referral code');
  assert(referrerStatsBefore.referral_url.includes(referrerStatsBefore.referral_code), 'referral url should include code');

  const beforeReferrer = getPublicBalance(db, referrerId);
  const beforeReferred = getPublicBalance(db, referredId);

  const result = applyReferralOnSignup(db, {
    referredUserId: referredId,
    referralCode: referrerStatsBefore.referral_code,
    referredEmail: `${prefix}referred@test.local`,
  });

  assert(result.applied, `referral should apply, got ${result.reason || 'ok'}`);

  const afterReferrer = getPublicBalance(db, referrerId);
  const afterReferred = getPublicBalance(db, referredId);

  assert(
    afterReferrer.balance >= beforeReferrer.balance + REFERRAL_BONUS_RUB,
    `referrer bonus expected +${REFERRAL_BONUS_RUB}, got ${afterReferrer.balance - beforeReferrer.balance}`,
  );
  assert(
    afterReferred.balance >= beforeReferred.balance,
    'referred user keeps welcome bonus balance',
  );

  const stats = getReferralStats(db, referrerId);
  assert(stats.invited_count === 1, 'invited count should be 1');
  assert(stats.earned_rub === REFERRAL_BONUS_RUB, 'earned rub should match bonus');

  const duplicate = applyReferralOnSignup(db, {
    referredUserId: referredId,
    referralCode: referrerStatsBefore.referral_code,
    referredEmail: `${prefix}referred@test.local`,
  });
  assert(!duplicate.applied && duplicate.reason === 'already_referred', 'duplicate referral should be blocked');

  console.log('OK referral tests passed');
  console.log(JSON.stringify({
    referral_code: stats.referral_code,
    referral_url: stats.referral_url,
    invited_count: stats.invited_count,
    earned_rub: stats.earned_rub,
    referrer_balance: afterReferrer.balance,
  }, null, 2));
} finally {
  cleanupTestUsers(prefix);
}
