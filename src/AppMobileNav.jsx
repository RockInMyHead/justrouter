import { useNavigate, useLocation } from 'react-router-dom';
import { Cpu, SlidersHorizontal, User } from 'lucide-react';
import { sidebarItems, resolveActiveItem } from './AppSidebar.jsx';

export default function AppMobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeItem = resolveActiveItem(location.pathname);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-around px-2 pt-2"
      style={{
        backgroundColor: 'var(--panel-bg)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
      }}
    >
      {sidebarItems.map((item) => {
        const active = activeItem === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate(
              item.path,
              item.id === 'models' ? { state: { view: 'catalog' } } : undefined,
            )}
            className="flex flex-1 flex-col items-center gap-1 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer"
            style={{ color: active ? '#fff' : 'rgba(255,255,255,0.45)' }}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
