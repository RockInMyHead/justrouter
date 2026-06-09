import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Mail, Calendar, Key, Coins, ArrowLeft, Copy, Check, Bot, Cpu, LogOut, SlidersHorizontal, Gift, Users, Zap } from 'lucide-react';
import { api, isAuthError, fetchCurrentUser } from './api.js';
import { getToken, clearAuth, getSession } from './auth.js';
import AppSidebar from './AppSidebar.jsx';
import AppMobileNav from './AppMobileNav.jsx';
import { reachGoal } from './metrica.js';

const pageBg = 'var(--page-bg)';
const panelBg = 'var(--panel-bg)';
const softPanelBg = 'var(--soft-panel-bg)';

export default function AccountPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const balanceRef = useRef(null);
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [copied, setCopied] = useState(false);
  const [telegramCode, setTelegramCode] = useState(null);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramError, setTelegramError] = useState('');
  const [topupAmount, setTopupAmount] = useState('500');
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupError, setTopupError] = useState('');
  const [loading, setLoading] = useState(() => !getSession());
  const [loadError, setLoadError] = useState('');
  const [referralStats, setReferralStats] = useState(null);
  const [referralCopied, setReferralCopied] = useState(false);
  const [referralError, setReferralError] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoResult, setPromoResult] = useState('');
  const [promoError, setPromoError] = useState('');

  const telegramQrUrl = telegramCode?.telegram_url
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=12&data=${encodeURIComponent(telegramCode.telegram_url)}`
    : '';

  useEffect(() => {
    if (!getToken()) {
      navigate('/', { state: { auth: 'login' } });
      return;
    }

    const cached = getSession();
    if (cached) {
      setUser(cached);
      setBalance(Number(cached.balance ?? 0));
      setBonusBalance(Number(cached.bonus_balance ?? 0));
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
        setBonusBalance(Number(u.bonus_balance ?? 0));
        api.getReferralStats().then(setReferralStats).catch((e) => {
          setReferralError(e.message || 'Не удалось загрузить реферальную программу');
        });
      })
      .catch((e) => {
        if (isAuthError(e)) {
          clearAuth();
          navigate('/', { state: { auth: 'login' } });
          return;
        }
        if (!cached) {
          setLoadError(e.message || 'Не удалось загрузить профиль');
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const copyKey = () => {
    if (user?.api_key) {
      navigator.clipboard.writeText(user.api_key);
      reachGoal('api_key_copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyReferralLink = () => {
    if (!referralStats?.referral_url) return;
    navigator.clipboard.writeText(referralStats.referral_url);
    setReferralCopied(true);
    setTimeout(() => setReferralCopied(false), 2000);
  };

  const createTelegramCode = async () => {
    setTelegramLoading(true);
    setTelegramError('');
    try {
      const data = await api.getTelegramLinkCode();
      setTelegramCode(data);
    } catch (e) {
      setTelegramError(e.message || 'Не удалось получить код');
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleTopup = async () => {
    const amount = Number(topupAmount);
    if (!Number.isFinite(amount) || amount < 10) {
      setTopupError('Минимальная сумма пополнения 10 ₽');
      return;
    }

    setTopupLoading(true);
    setTopupError('');
    try {
      const payment = await api.createYookassaPayment(amount);
      if (!payment.confirmation_url) throw new Error('ЮKassa не вернула ссылку на оплату');
      reachGoal('topup', { amount });
      window.location.href = payment.confirmation_url;
    } catch (e) {
      setTopupError(e.message || 'Не удалось создать платеж');
    } finally {
      setTopupLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.logout().catch(() => {});
    clearAuth();
    navigate('/');
  };

  const handlePromoApply = async () => {
    const code = promoCode.trim();
    if (!code || code.length < 3) {
      setPromoError('Введите промокод');
      return;
    }
    setPromoLoading(true);
    setPromoError('');
    setPromoResult('');
    try {
      const res = await api.applyPromoCode(code);
      setPromoResult(res.message || 'Промокод активирован! +' + res.amount + ' ₽');
      setPromoCode('');
      // Refresh balance
      const u = await fetchCurrentUser({ force: true });
      if (u) {
        setBalance(Number(u.balance ?? 0));
        setBonusBalance(Number(u.bonus_balance ?? 0));
      }
    } catch (e) {
      setPromoError(e?.error || e?.message || 'Не удалось активировать промокод');
    } finally {
      setPromoLoading(false);
    }
  };

  // Scroll to topup section when ?tab=topup
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'topup' && balanceRef.current) {
      setTimeout(() => {
        balanceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [location.search, balanceRef.current]);

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
          onClick={() => {
            setLoading(true);
            setLoadError('');
            fetchCurrentUser({ force: true })
              .then((u) => {
                if (!u) {
                  navigate('/', { state: { auth: 'login' } });
                  return;
                }
                setUser(u);
                setBalance(Number(u.balance ?? 0));
                setBonusBalance(Number(u.bonus_balance ?? 0));
              })
              .catch((e) => setLoadError(e.message || 'Не удалось загрузить профиль'))
              .finally(() => setLoading(false));
          }}
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
      <AppSidebar activeItem="account" />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
        {/* Top bar */}
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
              onClick={() => navigate('/models/text', { state: { view: 'catalog' } })}
              className="text-white/30 hover:text-white/60 transition-colors p-1 cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <span className="text-white text-lg font-semibold tracking-tight truncate">Личный кабинет</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: softPanelBg, border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Coins size={13} style={{ color: '#F59E0B' }} />
              <span className="text-white/70 whitespace-nowrap">{balance.toFixed(2)} ₽</span>
            </div>
            <button
              onClick={() => navigate('/')}
              className="hidden xs:inline-flex text-xs font-medium px-3 py-1.5 rounded-full text-white/80 hover:text-white transition-all duration-200 cursor-pointer whitespace-nowrap"
            >
              На главную
            </button>
          </div>
        </div>

        {/* Account info */}
        <div className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full min-w-0 overflow-x-hidden">
          <div className="space-y-4">
            {/* Profile card */}
            <div
              className="rounded-2xl p-6"
              style={{
                backgroundColor: softPanelBg,
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <h2 className="text-white text-base font-semibold mb-5">Профиль</h2>

              <div className="space-y-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="size-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                  >
                    <User size={18} className="text-white/40" />
                  </div>
                  <div>
                    <div className="text-white/40 text-[10px] font-mono uppercase tracking-wider mb-0.5">Имя</div>
                    <div className="text-white text-sm font-medium">{user.name || '—'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className="size-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                  >
                    <Mail size={18} className="text-white/40" />
                  </div>
                  <div>
                    <div className="text-white/40 text-[10px] font-mono uppercase tracking-wider mb-0.5">Email</div>
                    <div className="text-white text-sm font-medium">{user.email || '—'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className="size-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                  >
                    <Calendar size={18} className="text-white/40" />
                  </div>
                  <div>
                    <div className="text-white/40 text-[10px] font-mono uppercase tracking-wider mb-0.5">Дата регистрации</div>
                    <div className="text-white text-sm font-medium">{user.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : '—'}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className="size-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                  >
                    <Key size={18} className="text-white/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white/40 text-[10px] font-mono uppercase tracking-wider mb-0.5">Единый API-ключ</div>
                    <div className="flex items-center gap-2 min-w-0">
                      <code
                        className="text-white text-xs font-mono px-3 py-1.5 rounded-lg flex-1 min-w-0 truncate block"
                        style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        {user.api_key || '—'}
                      </code>
                      {user.api_key && (
                        <button
                          onClick={copyKey}
                          className="size-8 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer"
                          style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                          title="Копировать ключ"
                        >
                          {copied ? (
                            <Check size={12} style={{ color: '#10B981' }} />
                          ) : (
                            <Copy size={12} className="text-white/40" />
                          )}
                        </button>
                      )}
                    </div>
                    <div className="text-white/20 text-[10px] font-mono mt-1">
                      Используйте этот ключ в заголовке <code className="text-white/40">X-Api-Key</code> для доступа к API
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="rounded-2xl p-6"
              style={{
                backgroundColor: softPanelBg,
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="size-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(16,185,129,0.12)' }}>
                  <Gift size={22} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-white text-base font-semibold">Пригласите друзей</h2>
                  <p className="text-white/45 text-sm">Вы и друг получите по {referralStats?.bonus_rub || 200} ₽</p>
                </div>
              </div>

              {referralStats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center gap-2 text-white/40 text-xs mb-1"><Users size={14} /> Приглашено</div>
                      <div className="text-white text-xl font-semibold">{referralStats.invited_count}</div>
                    </div>
                    <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center gap-2 text-white/40 text-xs mb-1"><Gift size={14} /> Заработано</div>
                      <div className="text-white text-xl font-semibold">{referralStats.earned_rub.toFixed(0)} ₽</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={referralStats.referral_url}
                      className="flex-1 min-w-0 rounded-xl px-3 py-2.5 text-sm text-white/80 outline-none"
                      style={{ backgroundColor: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.06)' }}
                    />
                    <button
                      type="button"
                      onClick={copyReferralLink}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-black bg-emerald-400 hover:bg-emerald-300 transition-colors"
                    >
                      {referralCopied ? <Check size={16} /> : <Copy size={16} />}
                      {referralCopied ? 'Скопировано' : 'Копировать'}
                    </button>
                  </div>
                  <p className="text-white/30 text-xs">Код: {referralStats.referral_code}</p>
                </div>
              ) : (
                <p className="text-white/45 text-sm">{referralError || 'Загрузка реферальной ссылки…'}</p>
              )}
            </div>

            {/* Telegram card */}
            <div
              className="rounded-2xl p-6"
              style={{
                backgroundColor: softPanelBg,
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <h2 className="text-white text-base font-semibold mb-5">Telegram бот</h2>
              <div className="flex flex-col sm:flex-row items-start gap-4 min-w-0">
                <div
                  className="size-12 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(59,130,246,0.1)' }}
                >
                  <Bot size={24} style={{ color: '#60A5FA' }} />
                </div>
                <div className="flex-1 min-w-0 w-full">
                  <div className="text-white/70 text-sm leading-6">
                    Подключите аккаунт к боту, чтобы смотреть баланс, получать API-ключ, пополнять счет и уведомления о низком балансе.
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      onClick={createTelegramCode}
                      disabled={telegramLoading}
                      className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 btn-accent"
                      style={{ backgroundColor: 'rgba(59,130,246,0.28)', border: '1px solid rgba(96,165,250,0.55)' }}
                    >
                      {telegramLoading ? 'Генерация...' : 'Получить код'}
                    </button>
                    {telegramError && <span className="text-red-300 text-xs">{telegramError}</span>}
                  </div>
                  {telegramCode && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-4">
                      <div
                        className="rounded-2xl p-3 flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(255,255,255,0.92)' }}
                      >
                        <img src={telegramQrUrl} alt="QR-код для подключения Telegram-бота" className="size-[180px]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-white/40 text-[10px] font-mono uppercase tracking-wider mb-1">Команда для бота</div>
                        <code
                          className="block text-white text-xs font-mono px-3 py-2 rounded-lg truncate"
                          style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                          {telegramCode.command}
                        </code>
                        <div className="text-white/25 text-[10px] font-mono mt-1">Код действует {telegramCode.expires_in_minutes} минут</div>
                        <a
                          href={telegramCode.telegram_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:opacity-85 btn-accent"
                          style={{ backgroundColor: 'rgba(59,130,246,0.28)', border: '1px solid rgba(96,165,250,0.55)' }}
                        >
                          Открыть Telegram
                        </a>
                        <p className="mt-2 text-white/35 text-xs leading-5">
                          Отсканируйте QR-код телефоном или откройте ссылку, чтобы бот получил код подключения автоматически.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Balance card */}
            <div
              ref={balanceRef}
              className="rounded-2xl p-6"
              style={{
                backgroundColor: softPanelBg,
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <h2 className="text-white text-base font-semibold mb-5">Баланс</h2>
              <div className="flex items-center gap-4">
                <div
                  className="size-14 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(245,158,11,0.1)' }}
                >
                  <Coins size={28} style={{ color: '#F59E0B' }} />
                </div>
                <div>
                  <div className="text-3xl font-bold text-white">{balance.toFixed(2)} ₽</div>
                  <div className="text-white/30 text-xs font-mono mt-0.5">RUB</div>
                  {bonusBalance > 0 && (
                    <div className="text-amber-300/80 text-xs font-mono mt-2">
                      из них {bonusBalance.toFixed(0)} ₽ бонус
                    </div>
                  )}
                  <div className="text-emerald-400/70 text-xs font-mono mt-1.5 flex items-center gap-1">
                    <Zap size={10} />
                    +20% бонуса при пополнении
                  </div>
                </div>
              </div>
              <div className="mt-5 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                  <input
                    type="number"
                    min="10"
                    step="50"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                    placeholder="Сумма пополнения"
                  />
                  <button
                    onClick={handleTopup}
                    disabled={topupLoading}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50 btn-accent"
                    style={{ backgroundColor: 'rgba(245,158,11,0.28)', border: '1px solid rgba(251,191,36,0.55)' }}
                  >
                    {topupLoading ? 'Создаём...' : 'Пополнить через ЮKassa'}
                  </button>
                </div>
                {Number(topupAmount) >= 10 && (
                  <div className="text-emerald-400/60 text-xs font-mono text-right">
                    +{Math.floor(Number(topupAmount) * 0.2)} ₽ бонуса · всего {Number(topupAmount) + Math.floor(Number(topupAmount) * 0.2)} ₽
                  </div>
                )}
              </div>
              {topupError && <div className="mt-2 text-red-300 text-xs">{topupError}</div>}

              {/* Promo code */}
              <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <h3 className="text-white/60 text-xs font-semibold mb-3">Промокод</h3>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); setPromoResult(''); }}
                    className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                    placeholder="Введите промокод"
                    onKeyDown={(e) => { if (e.key === 'Enter') handlePromoApply(); }}
                  />
                  <button
                    onClick={handlePromoApply}
                    disabled={promoLoading || !promoCode.trim()}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-40 btn-accent"
                    style={{ backgroundColor: 'rgba(139,92,246,0.28)', border: '1px solid rgba(167,139,250,0.55)' }}
                  >
                    {promoLoading ? 'Проверка...' : 'Активировать'}
                  </button>
                </div>
                {promoResult && <div className="mt-2 text-emerald-400 text-xs">{promoResult}</div>}
                {promoError && <div className="mt-2 text-red-300 text-xs">{promoError}</div>}
              </div>
            </div>

            {/* Quick actions */}
            <div
              className="rounded-2xl p-6"
              style={{
                backgroundColor: softPanelBg,
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <h2 className="text-white text-base font-semibold mb-4">Быстрые действия</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => navigate('/account/settings')}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 "
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  <SlidersHorizontal size={14} className="inline mr-1.5" />
                  Настройки
                </button>
                <button
                  onClick={() => navigate('/models/text', { state: { view: 'catalog' } })}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 "
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  <Cpu size={14} className="inline mr-1.5" />
                  Модели
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 "
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  На главную
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 "
                  style={{ color: 'rgba(239,68,68,0.6)' }}
                >
                  <LogOut size={14} className="inline mr-1.5" />
                  Выйти
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <AppMobileNav />
    </div>
  );
}
