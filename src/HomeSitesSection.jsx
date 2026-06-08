import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Globe, Code2, Copy } from 'lucide-react';
import {
  HOME_SITE_ITEMS,
  SITE_PRICE_MIN,
  SITE_PRICE_MAX,
  siteUrl,
  siteLabel,
} from '../shared/home-sites.js';
import { api } from './api.js';
import { getToken } from './auth.js';
import SitePromptModal from './SitePromptModal.jsx';

const pageBg = 'var(--page-bg)';
const softPanelBg = 'var(--soft-panel-bg)';

function formatRub(amount) {
  return `${amount.toLocaleString('ru-RU')} ₽`;
}

function SiteCard({ item, isLoggedIn, owned, onAuthRequired, onOpenModal }) {
  const url = siteUrl(item.id);

  const handleCopyClick = useCallback(() => {
    if (!isLoggedIn) {
      onAuthRequired();
      return;
    }
    onOpenModal(item);
  }, [isLoggedIn, item, onAuthRequired, onOpenModal]);

  return (
    <article className="group relative rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02]">
      <div className="relative aspect-[4/3] overflow-hidden bg-black/40">
        {item.livePreview ? (
          <iframe
            src={url}
            title={item.titleRu}
            loading="lazy"
            tabIndex={-1}
            className="absolute top-0 left-0 w-[400%] h-[400%] origin-top-left scale-[0.25] border-0 pointer-events-none"
            style={{ backgroundColor: item.previewBg || '#FF4D00' }}
          />
        ) : (
          <img
            src={item.preview}
            alt={item.alt}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        )}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm text-[10px] font-mono text-white/60 z-10">
          <Globe size={10} />
          {siteLabel(item.id)}
        </div>
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold z-10"
          style={item.priceRub === 0 ? { backgroundColor: 'rgba(16,185,129,0.2)', color: '#6EE7B7', backdropFilter: 'blur(8px)' } : { backgroundColor: 'rgba(0,0,0,0.55)', color: '#fff', backdropFilter: 'blur(8px)' }}>
          {item.priceRub === 0 ? 'Бесплатно' : formatRub(item.priceRub)}
        </div>
        {owned && (
          <div className="absolute bottom-3 left-3 px-2 py-1 rounded-full bg-emerald-500/20 backdrop-blur-sm text-[10px] font-medium text-emerald-300 z-10 border border-emerald-400/20">
            Куплено
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="text-white font-semibold text-sm truncate">{item.titleRu}</h3>
            <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded ${
              item.priceRub === 0
                ? 'text-emerald-400 bg-emerald-500/10'
                : 'text-white/50 bg-white/[0.06]'
            }`}>
              {item.priceRub === 0 ? 'Бесплатно' : `${item.priceRub.toLocaleString('ru-RU')} ₽`}
            </span>
          </div>
          <span className="shrink-0 flex items-center gap-1 text-[10px] font-mono text-white/35">
            <Code2 size={10} />
            {item.stack}
          </span>
        </div>
        <p className="text-white/45 text-xs leading-relaxed mb-3">
          {owned
            ? 'Шаблон куплен — нажмите, чтобы скопировать промпт.'
            : 'Готовый шаблон сайта. Промпт откроется после оплаты.'}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-white/[0.06] hover:bg-white/[0.1] text-white/80 cursor-pointer"
          >
            <Copy size={12} />
            {isLoggedIn ? 'Скопировать промпт' : 'Скопировать'}
          </button>

          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors text-white/45 hover:text-white/70 hover:bg-white/[0.04]"
          >
            Открыть
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </article>
  );
}

export default function HomeSitesSection({ onAuthRequired, balance = 0, onBalanceChange }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getToken()));
  const [ownedSiteIds, setOwnedSiteIds] = useState([]);
  const [activeItem, setActiveItem] = useState(null);

  const loadPurchases = useCallback(async () => {
    if (!getToken()) {
      setOwnedSiteIds([]);
      return;
    }
    try {
      const data = await api.getSitePurchases();
      setOwnedSiteIds(Array.isArray(data.site_ids) ? data.site_ids : []);
    } catch {
      setOwnedSiteIds([]);
    }
  }, []);

  useEffect(() => {
    const syncAuth = () => {
      const loggedIn = Boolean(getToken());
      setIsLoggedIn(loggedIn);
      if (loggedIn) loadPurchases();
      else setOwnedSiteIds([]);
    };
    syncAuth();
    window.addEventListener('velorix:auth-success', syncAuth);
    window.addEventListener('velorix:auth-expired', syncAuth);
    return () => {
      window.removeEventListener('velorix:auth-success', syncAuth);
      window.removeEventListener('velorix:auth-expired', syncAuth);
    };
  }, [loadPurchases]);

  return (
    <>
      <section id="сгенерированные-сайты" className="relative py-24 md:py-32 px-5 sm:px-8" style={{ backgroundColor: pageBg }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 md:mb-16">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
              style={{ backgroundColor: softPanelBg, color: 'var(--milk-muted)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Globe size={12} />
              Веб-приложения
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-white">
              Сгенерированные сайты
            </h2>
            <p className="mt-4 text-white/40 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
              {HOME_SITE_ITEMS.length} готовых шаблонов из промптов — от {formatRub(SITE_PRICE_MIN)} до {formatRub(SITE_PRICE_MAX)}. Есть 2 бесплатных!
              {' '}Скопируйте промпт и оплатите с баланса личного кабинета.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {HOME_SITE_ITEMS.map((item) => (
              <SiteCard
                key={item.id}
                item={item}
                isLoggedIn={isLoggedIn}
                owned={ownedSiteIds.includes(item.id)}
                onAuthRequired={onAuthRequired}
                onOpenModal={setActiveItem}
              />
            ))}
          </div>
        </div>
      </section>

      {activeItem && (
        <SitePromptModal
          item={activeItem}
          owned={ownedSiteIds.includes(activeItem.id)}
          balance={balance}
          onClose={() => setActiveItem(null)}
          onBalanceChange={onBalanceChange}
          onPurchased={(siteId) => setOwnedSiteIds((prev) => (prev.includes(siteId) ? prev : [...prev, siteId]))}
        />
      )}
    </>
  );
}
