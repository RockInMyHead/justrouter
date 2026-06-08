import { useNavigate, useLocation } from 'react-router-dom';
import { Cpu, SlidersHorizontal, User, FileText, HelpCircle, LogOut } from 'lucide-react';
import { api } from './api.js';
import { getToken, clearAuth } from './auth.js';

export const sidebarItems = [
  { id: 'models', label: 'Модели', icon: Cpu, path: '/models/text' },
  { id: 'blog', label: 'Блог', icon: FileText, path: '/blog' },
  { id: 'faq', label: 'FAQ', icon: HelpCircle, path: '/faq' },
  { id: 'account', label: 'Аккаунт', icon: User, path: '/account' },
  { id: 'settings', label: 'Настройки', icon: SlidersHorizontal, path: '/account/settings' },
];

export function resolveActiveItem(pathname) {
  if (pathname.startsWith('/account/settings')) return 'settings';
  if (pathname.startsWith('/account')) return 'account';
  if (pathname.startsWith('/models')) return 'models';
  if (pathname.startsWith('/blog')) return 'blog';
  if (pathname.startsWith('/faq')) return 'faq';
  return '';
}

export default function AppSidebar({ activeItem: activeItemProp }) {
  const navigate = useNavigate();
  const location = useLocation();
  const activeItem = activeItemProp || resolveActiveItem(location.pathname);

  const handleLogout = async () => {
    await api.logout().catch(() => {});
    clearAuth();
    navigate('/');
  };

  return (
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
            onClick={() => navigate(
              item.path,
              item.id === 'models' ? { state: { view: 'catalog' } } : undefined,
            )}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer text-left "
            style={{
              backgroundColor: activeItem === item.id ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: activeItem === item.id ? '#fff' : 'rgba(255,255,255,0.4)',
            }}
          >
            <item.icon size={16} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {getToken() && (
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full text-left "
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            <LogOut size={16} />
            Выйти
          </button>
        )}
      </div>
    </div>
  );
}
