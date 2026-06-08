import { useState } from 'react';
import { Bell, Menu, Settings, X } from 'lucide-react';

const NAV_ITEMS = [
  'Dashboard',
  'People',
  'Hiring',
  'Devices',
  'Apps',
  'Salary',
  'Calendar',
  'Reviews',
];

const AVATAR_URL =
  'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=80';

function NavButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm transition-all duration-200 ${
        active ? 'bg-[#303030] text-white' : 'text-[#898989] hover:text-[#303030]'
      }`}
    >
      {label}
    </button>
  );
}

export default function Navbar() {
  const [active, setActive] = useState('Dashboard');
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="w-full mb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="border border-[#898989]/30 rounded-full px-5 py-2 text-[#303030] text-base select-none shrink-0">
          Talvex
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center bg-white/60 border border-[#898989]/20 rounded-full px-1 py-1 shadow-sm">
            {NAV_ITEMS.map((item) => (
              <NavButton key={item} label={item} active={active === item} onClick={() => setActive(item)} />
            ))}
          </div>

          <button
            type="button"
            className="hidden sm:flex items-center gap-2 bg-white/60 border border-[#898989]/20 rounded-full px-4 py-2.5 text-sm text-[#303030] shadow-sm hover:bg-white/80 transition-colors"
          >
            <Settings size={14} />
            Configs
          </button>

          <button
            type="button"
            className="relative bg-white/60 border border-[#898989]/20 rounded-full px-3.5 py-2.5 shadow-sm hover:bg-white/80 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={15} className="text-[#303030]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#FFD85F] rounded-full" />
          </button>

          <button type="button" className="w-10 h-10 rounded-full overflow-hidden shrink-0" aria-label="Profile">
            <img src={AVATAR_URL} alt="" className="w-full h-full object-cover" />
          </button>

          <button
            type="button"
            className="lg:hidden w-10 h-10 flex items-center justify-center bg-white/60 border border-[#898989]/20 rounded-full shadow-sm"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden mt-2 bg-white/80 backdrop-blur-xl border border-[#898989]/20 rounded-2xl p-2 shadow-md flex flex-wrap gap-1">
          {NAV_ITEMS.map((item) => (
            <NavButton
              key={item}
              label={item}
              active={active === item}
              onClick={() => {
                setActive(item);
                setMenuOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </nav>
  );
}
