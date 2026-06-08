export const FREE_REQUESTS_PER_MODEL = 0;
export const USD_TO_RUB = Number(process.env.USD_TO_RUB || 80);
export const PRICE_MULTIPLIER = Number(process.env.PRICE_MULTIPLIER || 3);
export const REGISTRATION_BONUS_RUB = Number(process.env.REGISTRATION_BONUS_RUB || 0);
export const REGISTRATION_BONUS_DAYS = Number(process.env.REGISTRATION_BONUS_DAYS || 7);

export function getRegistrationBonusExpiry() {
  return new Date(Date.now() + REGISTRATION_BONUS_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

export function expireBonusIfNeeded(db, userId) {
  // Bonus rubles never expire
}

export function getWallet(db, userId) {
  expireBonusIfNeeded(db, userId);
  return db.prepare('SELECT id, balance, bonus_balance, bonus_expires_at FROM users WHERE id = ?').get(userId);
}

export function getTotalBalance(wallet) {
  if (!wallet) return 0;
  return Number(wallet.balance || 0) + Number(wallet.bonus_balance || 0);
}

export function getPublicBalance(db, userId) {
  const wallet = getWallet(db, userId);
  return {
    balance: getTotalBalance(wallet),
    bonus_balance: Number(wallet?.bonus_balance || 0),
  };
}

export function toPublicUser(db, user) {
  const financials = getPublicBalance(db, user.id);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    api_key: user.api_key,
    marketing_enabled: user.marketing_enabled ?? true,
    ...financials,
  };
}

export function countFreeUserRequests(db, userId, modelId) {
  return db.prepare(`
    SELECT COUNT(*) as count
    FROM messages
    WHERE user_id = ? AND model_id = ? AND role = 'user' AND is_free = 1
  `).get(userId, modelId).count;
}

export function getFreeRemaining(db, userId, modelId) {
  return Math.max(0, FREE_REQUESTS_PER_MODEL - countFreeUserRequests(db, userId, modelId));
}

export function isFreeRequest(db, userId, modelId) {
  return countFreeUserRequests(db, userId, modelId) < FREE_REQUESTS_PER_MODEL;
}

export function usdToRub(usd) {
  const value = Number(usd);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.max(0.01, value * USD_TO_RUB);
}

export function applyPriceMultiplier(usd) {
  const value = Number(usd);
  if (!Number.isFinite(value) || value <= 0) return value;
  return value * PRICE_MULTIPLIER;
}

export function estimateTextMessageCostRub(model) {
  const price = Number(model.price);
  if (price < 0) return 0.01;
  if (price === 0) return 0;
  // price = USD за 1M токенов; ~1K токенов на сообщение → price * 0.001 USD → в рублях
  return Math.max(0.01, price * USD_TO_RUB * 0.001);
}

// ── Unlimited tier subscription definitions — shared with server/index.js ──
export const TIER_DEFINITIONS = {
  starter: {
    label: 'Базовый',
    price: 4000,
    categories: {
      text: { maxPrice: 1, label: 'Текст', desc: 'до 1 ₽ за сообщение' },
    },
  },
  standard: {
    label: 'Стандартный',
    price: 9000,
    categories: {
      text: { maxPrice: 2, minPrice: 1, label: 'Текст', desc: 'от 1 до 2 ₽ за сообщение' },
      image: { maxPrice: 10, label: 'Фото', desc: 'самые дешёвые модели' },
    },
  },
  premium: {
    label: 'Премиум',
    price: 18000,
    categories: {
      text: { maxPrice: 2, minPrice: 1, label: 'Текст', desc: 'от 1 до 2 ₽ за сообщение' },
      image: { maxPrice: 30, label: 'Фото', desc: 'до 30 ₽ за изображение' },
      video: { maxPrice: 5, label: 'Видео', desc: '1 дешёвая модель' },
    },
  },
};

export function getActiveTierSubscription(dbConn, userId) {
  return dbConn.prepare(`
    SELECT id, plan_type, tier, end_date
    FROM subscriptions
    WHERE user_id = ? AND plan_type = 'tier' AND status = 'active' AND end_date > datetime('now')
    ORDER BY end_date DESC LIMIT 1
  `).get(userId);
}

export function hasTierCoverage(dbConn, userId, modelPrice, modelCategory) {
  const sub = getActiveTierSubscription(dbConn, userId);
  if (!sub || !sub.tier) return false;
  const tierDef = TIER_DEFINITIONS[sub.tier];
  if (!tierDef) return false;
  // Check if this model's category is covered by the tier
  const catDef = tierDef.categories?.[modelCategory];
  if (!catDef) return false;
  // Check if model price is within the category's price range
  if (Number(modelPrice) <= 0) return true;
  if (catDef.minPrice !== undefined && Number(modelPrice) < catDef.minPrice) return false;
  return Number(modelPrice) <= catDef.maxPrice;
}

export function costRubFromOpenRouterUsage(model, usage) {
  const directUsd = Number(usage?.cost ?? usage?.total_cost);
  if (Number.isFinite(directUsd) && directUsd > 0) {
    return usdToRub(applyPriceMultiplier(directUsd));
  }

  const promptTokens = Number(usage?.prompt_tokens || 0);
  const completionTokens = Number(usage?.completion_tokens || 0);
  const totalTokens = promptTokens + completionTokens;
  if (totalTokens > 0 && Number(model.price) > 0) {
    return usdToRub(Number(model.price) * (totalTokens / 1_000_000));
  }

  return estimateTextMessageCostRub(model);
}

export function chargeUserBalance(db, userId, amountRub, description, modelPrice, modelCategory) {
  const cost = Number(amountRub);
  if (!Number.isFinite(cost) || cost <= 0) return 0;

  // If user has an active tier subscription covering this model, skip charging
  if (modelPrice !== undefined && Number.isFinite(modelPrice) && Number(modelPrice) > 0 && modelCategory) {
    if (hasTierCoverage(db, userId, modelPrice, modelCategory)) {
      return 0;
    }
  }

  const tx = db.transaction(() => {
    expireBonusIfNeeded(db, userId);
    const wallet = db.prepare('SELECT balance, bonus_balance FROM users WHERE id = ?').get(userId);
    const total = getTotalBalance(wallet);

    if (total < cost) {
      const err = new Error(`Недостаточно средств. Нужно ≈ ${cost.toFixed(2)} ₽, на балансе ${total.toFixed(2)} ₽`);
      err.statusCode = 402;
      throw err;
    }

    let remaining = cost;

    // Spend real balance FIRST, bonus second
    const realUsed = Math.min(Number(wallet?.balance || 0), remaining);
    if (realUsed > 0) {
      db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(realUsed, userId);
      remaining -= realUsed;
    }

    let bonusUsed = 0;
    if (remaining > 0) {
      bonusUsed = Math.min(Number(wallet?.bonus_balance || 0), remaining);
      if (bonusUsed > 0) {
        db.prepare('UPDATE users SET bonus_balance = bonus_balance - ? WHERE id = ?').run(bonusUsed, userId);
        remaining -= bonusUsed;
      }
    }

    db.prepare(`
      INSERT INTO transactions (type, user_id, amount, bonus_amount, description)
      VALUES ('user_payment', ?, ?, ?, ?)
    `).run(userId, -cost, bonusUsed, description);
  });

  tx();
  return cost;
}

export function getUserFinanceStats(row) {
  const realTopups = Number(row?.real_topups || 0);
  const totalSpent = Number(row?.total_spent || 0);
  const bonusesIssued = Number(row?.bonuses_issued || 0);
  const bonusBalance = Number(row?.bonus_balance || 0);

  let bonusSpent = Math.min(totalSpent, Number(row?.bonus_spent || 0));
  if (bonusSpent <= 0 && bonusesIssued > 0 && totalSpent > 0) {
    bonusSpent = Math.min(totalSpent, Math.max(0, bonusesIssued - bonusBalance));
  }

  const realSpent = Math.max(0, totalSpent - bonusSpent);
  const cashMargin = realTopups - realSpent;
  const marginPercent = realTopups > 0 ? (cashMargin / realTopups) * 100 : null;
  const profit = cashMargin - bonusSpent - bonusBalance;

  return {
    bonus_balance: bonusBalance,
    bonuses_issued: bonusesIssued,
    bonus_spent: bonusSpent,
    real_topups: realTopups,
    real_spent: realSpent,
    cash_margin: cashMargin,
    margin_percent: marginPercent,
    profit,
  };
}

export function sumUserFinanceStats(rows) {
  const totals = rows.reduce((acc, row) => {
    const finance = typeof row.profit === 'number'
      ? row
      : getUserFinanceStats(row);
    return {
      balance: acc.balance + Number(row.balance || 0),
      bonus_balance: acc.bonus_balance + finance.bonus_balance,
      bonus_spent: acc.bonus_spent + finance.bonus_spent,
      real_topups: acc.real_topups + finance.real_topups,
      real_spent: acc.real_spent + finance.real_spent,
      cash_margin: acc.cash_margin + finance.cash_margin,
      profit: acc.profit + finance.profit,
    };
  }, {
    balance: 0,
    bonus_balance: 0,
    bonus_spent: 0,
    real_topups: 0,
    real_spent: 0,
    cash_margin: 0,
    profit: 0,
  });

  totals.margin_percent = totals.real_topups > 0
    ? (totals.cash_margin / totals.real_topups) * 100
    : null;

  return totals;
}

export function getAdminFinanceStats(db) {
  const realTopups = Number(db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as t
    FROM transactions
    WHERE type = 'topup' AND amount > 0
  `).get().t);

  const bonusesIssued = Number(db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as t
    FROM transactions
    WHERE type = 'referral_bonus' AND amount > 0
  `).get().t);

  const totalSpent = Number(db.prepare(`
    SELECT COALESCE(SUM(ABS(amount)), 0) as t
    FROM transactions
    WHERE type IN ('user_payment', 'agent_payment') AND amount < 0
  `).get().t);

  const bonusSpentRecorded = Number(db.prepare(`
    SELECT COALESCE(SUM(bonus_amount), 0) as t
    FROM transactions
    WHERE type IN ('user_payment', 'agent_payment') AND amount < 0
  `).get().t);

  const bonusLiability = Number(db.prepare(`
    SELECT COALESCE(SUM(bonus_balance), 0) as t
    FROM users
    WHERE COALESCE(is_admin, 0) = 0
  `).get().t);

  const realBalanceLiability = Number(db.prepare(`
    SELECT COALESCE(SUM(balance), 0) as t
    FROM users
    WHERE COALESCE(is_admin, 0) = 0
  `).get().t);

  let bonusSpent = Math.min(totalSpent, bonusSpentRecorded);
  if (bonusSpentRecorded <= 0 && bonusesIssued > 0) {
    bonusSpent = Math.min(totalSpent, Math.max(0, bonusesIssued - bonusLiability));
  }

  const realSpent = Math.max(0, totalSpent - bonusSpent);

  return {
    real_topups: realTopups,
    bonuses_issued: bonusesIssued,
    total_spent: totalSpent,
    bonus_spent: bonusSpent,
    real_spent: realSpent,
    bonus_liability: bonusLiability,
    real_balance_liability: realBalanceLiability,
    cash_margin: realTopups - realSpent,
  };
}

export function assertSufficientBalance(user, costRub) {
  const cost = Number(costRub);
  if (cost <= 0) return;
  if (Number(user.balance) < cost) {
    const err = new Error(`Недостаточно средств. Нужно ≈ ${cost.toFixed(2)} ₽, на балансе ${Number(user.balance).toFixed(2)} ₽`);
    err.statusCode = 402;
    throw err;
  }
}
