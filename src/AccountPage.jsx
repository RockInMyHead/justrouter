import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Calendar, Key, Coins, ArrowLeft, Copy, Check } from 'lucide-react';
import { api } from './api.js';
import AppSidebar from './AppSidebar.jsx';

const pageBg = 'var(--page-bg)';
const panelBg = 'var(--panel-bg)';
const softPanelBg = 'var(--soft-panel-bg)';

export default function AccountPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [copied, setCopied] = useState(false);
  const [telegramCode, setTelegramCode] = useState(null);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramError, setTelegramError] = useState('');
  const [topupAmount, setTopupAmount] = useState(500);
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupError, setTopupError] = useState('');

  const telegramQrUrl = telegramCode?.telegram_url
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=12&data=${encodeURIComponent(telegramCode.telegram_url)}`
    : '';

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('velorix_session') || 'null');
    if (session) {
      setUser(session);
      api.me().then((u) => {
        setUser(u);
        setBalance(u.balance);
        localStorage.setItem('velorix_session', JSON.stringify(u));
      }).catch(() => {});
    }
  }, []);

  const copyKey = () => {
    if (user?.api_key) {
      navigator.clipboard.writeText(user.api_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
    setTopupLoading(true);
    setTopupError('');
    try {
      const payment = await api.createYookassaPayment(topupAmount);
      if (!payment.confirmation_url) throw new Error('ЮKassa не вернула ссылку на оплату');
      window.location.href = payment.confirmation_url;
    } catch (e) {
      setTopupError(e.message || 'Не удалось создать платеж');
    } finally {
      setTopupLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: pageBg }}>
        <div className="text-white/40 text-sm">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex overflow-x-hidden" style={{ backgroundColor: pageBg }}>
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
              onClick={() => navigate('/models')}
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
                      className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50"
                      style={{ backgroundColor: 'rgba(59,130,246,0.14)', color: '#BFDBFE' }}
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
                          className="mt-3 inline-flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:opacity-85"
                          style={{ backgroundColor: 'rgba(59,130,246,0.14)', color: '#BFDBFE' }}
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
                </div>
              </div>
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
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
                  className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 disabled:opacity-50"
                  style={{ backgroundColor: 'rgba(245,158,11,0.14)', color: '#FDE68A' }}
                >
                  {topupLoading ? 'Создаём...' : 'Пополнить через ЮKassa'}
                </button>
              </div>
              {topupError && <div className="mt-2 text-red-300 text-xs">{topupError}</div>}
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
                  onClick={() => navigate('/models')}
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
    </div>
  );
}
