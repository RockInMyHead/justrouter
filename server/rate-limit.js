function getClientKey(req) {
  return req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
}

export function createRateLimit({ windowMs, max, keyPrefix = 'global' }) {
  const buckets = new Map();

  return function rateLimit(req, res, next) {
    const now = Date.now();
    const key = `${keyPrefix}:${getClientKey(req)}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;
    if (current.count > max) {
      const retryAfter = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: 'Слишком много запросов. Попробуйте позже.' });
    }

    return next();
  };
}
