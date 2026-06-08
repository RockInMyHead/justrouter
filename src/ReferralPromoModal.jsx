import { useCallback, useEffect, useState } from 'react';
import { Copy, Check, Gift, Users, X, Sparkles } from 'lucide-react';
import { api } from './api.js';
import { getToken } from './auth.js';

const panelBg = 'var(--panel-bg)';

export default function ReferralPromoModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const loadAndOpen = useCallback(async () => {
    if (!getToken()) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.getReferralStats();
      if (!data.promo_active) return;
      setStats(data);
      setOpen(true);
    } catch (e) {
      setError(e.message || 'Не удалось загрузить реферальную программу');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAndOpen();
    const onAuthSuccess = () => { loadAndOpen(); };
    window.addEventListener('velorix:auth-success', onAuthSuccess);
    return () => window.removeEventListener('velorix:auth-success', onAuthSuccess);
  }, [loadAndOpen]);

  const copyLink = async () => {
    if (!stats?.referral_url) return;
    try {
      await navigator.clipboard.writeText(stats.referral_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Не удалось скопировать ссылку');
    }
  };

  if (!open || !stats) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="referral-promo-title"
    >
      <div
        className="relative w-full max-w-lg rounded-3xl overflow-hidden"
        style={{ backgroundColor: panelBg, border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="absolute inset-x-0 top-0 h-32 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(16,185,129,0.18) 0%, transparent 100%)' }} />

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 z-10 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Закрыть"
        >
          <X size={18} />
        </button>

        <div className="relative p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="size-14 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <Gift size={28} className="text-emerald-400" />
            </div>
            <div className="space-y-2 pr-8">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium uppercase tracking-wide text-emerald-300" style={{ backgroundColor: 'rgba(16,185,129,0.12)' }}>
                <Sparkles size={12} />
                Акция 3 дня
              </div>
              <h2 id="referral-promo-title" className="text-white text-xl sm:text-2xl font-semibold leading-tight">
                Пригласите друга — получите {stats.bonus_rub} ₽
              </h2>
              <p className="text-white/55 text-sm leading-relaxed">
                Вы и ваш друг получите по <span className="text-white font-medium">{stats.bonus_rub} ₽</span> на баланс, когда друг зарегистрируется по вашей ссылке.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 text-white/45 text-xs mb-1">
                <Users size={14} />
                Приглашено
              </div>
              <p className="text-white text-2xl font-semibold">{stats.invited_count}</p>
            </div>
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2 text-white/45 text-xs mb-1">
                <Gift size={14} />
                Заработано
              </div>
              <p className="text-white text-2xl font-semibold">{stats.earned_rub.toFixed(0)} ₽</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-white/45 text-xs uppercase tracking-wide">Ваша ссылка</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={stats.referral_url}
                className="flex-1 min-w-0 rounded-xl px-3 py-2.5 text-sm text-white/80 outline-none"
                style={{ backgroundColor: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}
              />
              <button
                type="button"
                onClick={copyLink}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-black bg-emerald-400 hover:bg-emerald-300 transition-colors disabled:opacity-60"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Скопировано' : 'Копировать'}
              </button>
            </div>
            <p className="text-white/35 text-xs">Код: {stats.referral_code}</p>
          </div>

          {error && (
            <p className="text-amber-300 text-sm">{error}</p>
          )}

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full py-3 rounded-2xl text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            Понятно, закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
