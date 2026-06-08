export function requireJsonFields(fields) {
  return function validateRequiredFields(req, res, next) {
    const missing = fields.filter((field) => {
      const value = req.body?.[field];
      return value == null || (typeof value === 'string' && value.trim() === '');
    });

    if (missing.length > 0) {
      return res.status(400).json({ error: `Обязательные поля: ${missing.join(', ')}` });
    }

    return next();
  };
}

export function requirePositiveAmount(field = 'amount') {
  return function validateAmount(req, res, next) {
    const amount = Number(req.body?.[field]);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: `${field} должен быть положительным числом` });
    }
    return next();
  };
}
