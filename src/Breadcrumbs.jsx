import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { getBreadcrumbs } from '../shared/seo-config.js';

const pageBg = 'var(--page-bg)';

export default function Breadcrumbs({ pathname }) {
  const items = getBreadcrumbs(pathname);
  if (items.length <= 1) return null;

  return (
    <nav aria-label="Хлебные крошки" className="text-xs text-white/40 flex flex-wrap items-center gap-1">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const path = item.url.replace('https://justrouter.ru', '') || '/';
        return (
          <span key={item.url} className="inline-flex items-center gap-1">
            {i > 0 && <ChevronRight size={12} className="text-white/20 shrink-0" />}
            {isLast ? (
              <span className="text-white/60 truncate max-w-[200px] sm:max-w-none">{item.name}</span>
            ) : (
              <Link to={path} className="hover:text-white/70 transition-colors whitespace-nowrap">
                {item.name}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}

export function SeoPageShell({ children, pathname, className = '' }) {
  return (
    <div
      className={`min-h-screen text-white ${className}`}
      style={{ backgroundColor: pageBg, fontFamily: 'Inter, sans-serif' }}
    >
      <header className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="text-white font-semibold tracking-tight shrink-0">
            JustRouter
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/models/text" className="text-white/50 hover:text-white transition-colors hidden sm:inline">
              Модели
            </Link>
            <Link to="/blog" className="text-white/50 hover:text-white transition-colors hidden sm:inline">
              Блог
            </Link>
            <Link to="/faq" className="text-white/50 hover:text-white transition-colors hidden sm:inline">
              FAQ
            </Link>
            <Link to="/pricing" className="text-white/50 hover:text-white transition-colors hidden sm:inline">
              Тарифы
            </Link>
            <Link to="/docs" className="text-white/50 hover:text-white transition-colors">
              API
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-5 py-8 sm:py-12 space-y-8">
        <Breadcrumbs pathname={pathname} />
        {children}
      </main>
    </div>
  );
}
