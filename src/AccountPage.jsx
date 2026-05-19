import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Calendar, Key, Coins, ArrowLeft, LogOut, Cpu, SlidersHorizontal, Bot, Copy, Check } from 'lucide-react';
import { api } from './api.js';

const sidebarItems = [
  { id: 'models', label: 'Модели', icon: Cpu },
  { id: 'agents', label: 'Агенты', icon: Bot },
  { id: 'account', label: 'Аккаунт', icon: User },
  { id: 'settings', label: 'Настройки', icon: SlidersHorizontal },
];

export default function AccountPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [sidebarActive] = useState('account');
  const [copied, setCopied] = useState(false);

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

  const handleLogout = async () => {
    await api.logout().catch(() => {});
    localStorage.removeItem('velorix_token');
    localStorage.removeItem('velorix_session');
    navigate('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="text-white/40 text-sm">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0a0a0a' }}>
      {/* Sidebar */}
      <div
        className="w-[200px] shrink-0 hidden md:flex flex-col pt-6 pb-4 px-3"
        style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        <button
          onClick={() => navigate('/')}
          className="text-white text-lg font-semibold tracking-tight mb-8 px-3 text-left hover:opacity-80 transition-opacity cursor-pointer"
        >
          JustRouter
        </button>

        <nav className="flex flex-col gap-1 flex-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'models') navigate('/models');
                if (item.id === 'agents') navigate('/agents');
              }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer text-left "
              style={{
                backgroundColor: sidebarActive === item.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: sidebarActive === item.id ? '#fff' : 'rgba(255,255,255,0.4)',
              }}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full text-left "
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            <LogOut size={16} />
            Выйти
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top bar */}
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-3"
          style={{
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/models')}
              className="text-white/30 hover:text-white/60 transition-colors p-1 cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <span className="text-white text-lg font-semibold tracking-tight">Личный кабинет</span>
          </div>

          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Coins size={13} style={{ color: '#F59E0B' }} />
              <span className="text-white/70">{balance.toFixed(2)} ₽</span>
            </div>
            <button
              onClick={() => navigate('/')}
              className="text-xs font-medium px-3 py-1.5 rounded-full text-white/80 hover:text-white transition-all duration-200 cursor-pointer "
            >
              На главную
            </button>
          </div>
        </div>

        {/* Account info */}
        <div className="flex-1 p-4 sm:p-6 max-w-2xl mx-auto w-full">
          <div className="space-y-4">
            {/* Profile card */}
            <div
              className="rounded-2xl p-6"
              style={{
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <h2 className="text-white text-base font-semibold mb-5">Профиль</h2>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
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
                  <div className="flex-1">
                    <div className="text-white/40 text-[10px] font-mono uppercase tracking-wider mb-0.5">Единый API-ключ</div>
                    <div className="flex items-center gap-2">
                      <code
                        className="text-white text-xs font-mono px-3 py-1.5 rounded-lg flex-1 truncate"
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

            {/* Balance card */}
            <div
              className="rounded-2xl p-6"
              style={{
                backgroundColor: 'rgba(255,255,255,0.02)',
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
            </div>

            {/* Quick actions */}
            <div
              className="rounded-2xl p-6"
              style={{
                backgroundColor: 'rgba(255,255,255,0.02)',
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
