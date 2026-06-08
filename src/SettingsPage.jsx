import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Bell, BookOpen, FileText, Coins, SlidersHorizontal } from 'lucide-react';
import { api, isAuthError, fetchCurrentUser } from './api.js';
import { getToken, clearAuth, getSession } from './auth.js';
import AppSidebar from './AppSidebar.jsx';
import AppMobileNav from './AppMobileNav.jsx';

const pageBg = 'var(--page-bg)';
const panelBg = 'var(--panel-bg)';
const softPanelBg = 'var(--soft-panel-bg)';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [marketingEnabled, setMarketingEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(() => !getSession());
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!getToken()) {
      navigate('/', { state: { auth: 'login' } });
      return;
    }

    const cached = getSession();
    if (cached) {
      setUser(cached);
      setBalance(Number(cached.balance ?? 0));
      setMarketingEnabled(cached.marketing_enabled !== false);
      setLoading(false);
    }

    setLoadError('');
    fetchCurrentUser()
      .then((u) => {
        if (!u) {
          navigate('/', { state: { auth: 'login' } });
          return;
        }
        setUser(u);
        setBalance(Number(u.balance ?? 0));
        setMarketingEnabled(u.marketing_enabled !== false);
      })
      .catch((e) => {
        if (isAuthError(e)) {
          clearAuth();
          navigate('/', { state: { auth: 'login' } });
          return;
        }
        if (!cached) setLoadError(e.message || 'Не удалось загрузить настройки');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleMarketingToggle = async () => {
    const next = !marketingEnabled;
    setMarketingEnabled(next);
    setSaving(true);
    setSaveError('');
    setSaved(false);
    try {
      const data = await api.updateSettings({ marketing_enabled: next });
      setUser(data.user);
      localStorage.setItem('velorix_session', JSON.stringify(data.user));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setMarketingEnabled(!next);
      setSaveError(e.message || 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: pageBg }}>
        <div className="text-white/40 text-sm">Загрузка...</div>
      </div>
    );
  }

  if (loadError && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6" style={{ backgroundColor: pageBg }}>
        <p className="text-white/60 text-sm text-center">{loadError}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl bg-white text-black text-sm font-medium"
        >
          Повторить
        </button>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex overflow-x-hidden pb-20 md:pb-0" style={{ backgroundColor: pageBg }}>
      <AppSidebar activeItem="settings" />

      <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
        <div
          className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 min-w-0"
          style={{
            backgroundColor: panelBg,
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/account')}
              className="text-white/30 hover:text-white/60 transition-colors p-1 cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <span className="text-white text-lg font-semibold tracking-tight truncate">Настройки</span>
          </div>

          <div
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium shrink-0"
            style={{ backgroundColor: softPanelBg, border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Coins size={13} style={{ color: '#F59E0B' }} />
            <span className="text-white/70 whitespace-nowrap">{balance.toFixed(2)} ₽</span>
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full min-w-0 overflow-x-hidden">
          <div className="space-y-4">
            <div
              className="rounded-2xl p-6"
              style={{ backgroundColor: softPanelBg, border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-2 mb-5">
                <SlidersHorizontal size={18} className="text-white/50" />
                <h2 className="text-white text-base font-semibold">Уведомления</h2>
              </div>

              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-white text-sm font-medium">
                    <Bell size={15} className="text-white/40 shrink-0" />
                    Email и Telegram-рассылка
                  </div>
                  <p className="text-white/35 text-xs mt-1.5 leading-relaxed">
                    Новости сервиса, обновления моделей и полезные подсказки. Можно отключить в любой момент.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleMarketingToggle}
                  disabled={saving}
                  className="relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer disabled:opacity-50"
                  style={{
                    backgroundColor: marketingEnabled ? 'rgba(245,158,11,0.55)' : 'rgba(255,255,255,0.12)',
                  }}
                  aria-pressed={marketingEnabled}
                  aria-label="Переключить рассылку"
                >
                  <span
                    className="absolute top-0.5 size-5 rounded-full bg-white transition-transform duration-200"
                    style={{ left: marketingEnabled ? '22px' : '2px' }}
                  />
                </button>
              </div>

              {saveError && <div className="mt-3 text-red-300 text-xs">{saveError}</div>}
              {saved && <div className="mt-3 text-emerald-300 text-xs">Сохранено</div>}
            </div>

            <div
              className="rounded-2xl p-6"
              style={{ backgroundColor: softPanelBg, border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <h2 className="text-white text-base font-semibold mb-4">Документы</h2>
              <div className="space-y-2">
                <Link
                  to="/docs"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  <BookOpen size={16} className="text-white/35" />
                  API-документация
                </Link>
                <Link
                  to="/legal/offer"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  <FileText size={16} className="text-white/35" />
                  Публичная оферта
                </Link>
                <Link
                  to="/legal/privacy"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                  <FileText size={16} className="text-white/35" />
                  Политика конфиденциальности
                </Link>
              </div>
            </div>

            <div
              className="rounded-2xl p-6"
              style={{ backgroundColor: softPanelBg, border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <h2 className="text-white text-base font-semibold mb-2">Аккаунт</h2>
              <p className="text-white/35 text-xs mb-4">{user.email}</p>
              <button
                type="button"
                onClick={() => navigate('/account')}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
                style={{ color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Перейти в личный кабинет
              </button>
            </div>
          </div>
        </div>
      </div>
      <AppMobileNav />
    </div>
  );
}
