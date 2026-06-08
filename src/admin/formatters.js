export function formatCurrency(n) {
  return Number(n || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPercent(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
}

export function profitClass(value) {
  if (value > 0) return 'text-emerald-400';
  if (value < 0) return 'text-amber-400';
  return 'text-white/50';
}

export function formatNumber(n) {
  return Number(n || 0).toLocaleString('ru-RU');
}

export function formatDuration(secs) {
  if (!secs) return '0с';
  const s = Number(secs);
  if (s < 60) return Math.round(s) + 'с';
  if (s < 3600) return Math.floor(s / 60) + 'м ' + Math.round(s % 60) + 'с';
  return Math.floor(s / 3600) + 'ч ' + Math.floor((s % 3600) / 60) + 'м';
}
