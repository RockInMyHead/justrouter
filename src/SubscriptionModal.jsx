import { useState, useEffect } from 'react';
import { X, Check, Sparkles, Loader2, ExternalLink, MessageSquare, Image, Video } from 'lucide-react';
import { api } from './api';

const CATEGORY_ICONS = {
  text: MessageSquare,
  image: Image,
  video: Video,
};

const TIER_CONFIG = {
  starter: {
    accent: '#3B82F6',
    label: 'Базовый',
    glassGrad: 'linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(59,130,246,0.02) 100%)',
    borderGrad: 'linear-gradient(135deg, rgba(59,130,246,0.4) 0%, rgba(59,130,246,0.1) 50%, rgba(99,102,241,0.15) 100%)',
    shimmerColor: 'rgba(59,130,246,0.08)',
  },
  standard: {
    accent: '#8B5CF6',
    label: 'Стандартный',
    glassGrad: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(139,92,246,0.02) 100%)',
    borderGrad: 'linear-gradient(135deg, rgba(139,92,246,0.4) 0%, rgba(139,92,246,0.1) 50%, rgba(167,139,250,0.15) 100%)',
    shimmerColor: 'rgba(139,92,246,0.08)',
  },
  premium: {
    accent: '#F59E0B',
    label: 'Премиум',
    glassGrad: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.02) 100%)',
    borderGrad: 'linear-gradient(135deg, rgba(245,158,11,0.4) 0%, rgba(245,158,11,0.1) 50%, rgba(251,191,36,0.15) 100%)',
    shimmerColor: 'rgba(245,158,11,0.08)',
  },
};

const CATEGORY_MODEL_EXAMPLES = {
  starter: {
    text: [
      { name: 'Llama 3.1 8B Instruct' },
      { name: 'Mistral Nemo' },
      { name: 'Qwen2.5 7B Instruct' },
      { name: 'Mistral Small 3' },
      { name: 'Llama 3.3 70B Instruct' },
    ],
  },
  standard: {
    text: [
      { name: 'GPT-4o-mini' },
      { name: 'DeepSeek V3.2' },
      { name: 'Gemini 2.5 Flash Lite' },
      { name: 'Llama 3.1 70B Instruct' },
      { name: 'Mistral Small 3.1 24B' },
    ],
    image: [
      { name: 'Nano Banana (Gemini 2.5 Flash Image)' },
      { name: 'GPT-5 Image Mini' },
    ],
  },
  premium: {
    text: [
      { name: 'GPT-4o-mini' },
      { name: 'DeepSeek V3.2' },
      { name: 'Gemini 2.5 Flash Lite' },
      { name: 'Llama 3.1 70B Instruct' },
      { name: 'Mistral Small 3.1 24B' },
    ],
    image: [
      { name: 'Nano Banana (Gemini 2.5 Flash Image)' },
      { name: 'GPT-5 Image Mini' },
      { name: 'Nano Banana 2 (Gemini 3.1 Flash Image Preview)' },
      { name: 'GPT-5 Image' },
    ],
    video: [
      { name: 'Wan 2.6' },
      { name: 'Seedance 1.5 Pro' },
      { name: 'Hailuo 2.3' },
      { name: 'Veo 3.1 Lite' },
    ],
  },
};

function LiquidGlassCard({ children, accent, glassGrad, borderGrad, shimmerColor, isActive, className = '' }) {
  return (
    <div
      className={'relative rounded-2xl overflow-hidden transition-all duration-500 ' + className}
      style={{
        background: glassGrad,
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid transparent',
        borderImage: borderGrad + ' 1',
        boxShadow: isActive
          ? '0 0 40px ' + accent + '20, 0 0 80px ' + accent + '10, inset 0 1px 0 rgba(255,255,255,0.08)'
          : '0 0 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      {/* Shimmer overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, ' + shimmerColor + ' 25%, rgba(255,255,255,0.03) 37%, ' + shimmerColor + ' 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'liquid-shimmer 5s ease-in-out infinite',
          zIndex: 0,
        }}
      />
      {/* Inner content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

export default function SubscriptionModal({ onClose, userTier, userName, onLoginRequired }) {
  const [tiers, setTiers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payingTier, setPayingTier] = useState(null);
  const [error, setError] = useState(null);
  const [hoveredTier, setHoveredTier] = useState(null);

  useEffect(function () {
    api.getSubscriptionTiersInfo()
      .then(function (data) { setTiers(data.tiers); })
      .catch(function () { setError('Не удалось загрузить информацию о тарифах'); })
      .finally(function () { setLoading(false); });
  }, []);

  var handlePurchase = function handlePurchase(tierKey) {
    if (!userName) {
      if (onLoginRequired) onLoginRequired();
      return;
    }
    setPayingTier(tierKey);
    setError(null);
    api.createTierSubscriptionPayment(tierKey)
      .then(function (data) {
        if (data.confirmation_url) {
          window.location.href = data.confirmation_url;
        } else {
          setError('Не удалось создать платёж. Попробуйте позже.');
          setPayingTier(null);
        }
      })
      .catch(function (err) {
        setError(err?.error || err?.message || 'Ошибка оплаты');
        setPayingTier(null);
      });
  };

  var hasActiveSubscription = Boolean(userTier);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
      onClick={function (e) { if (e.target === e.currentTarget) onClose(); }}
      style={{
        backgroundColor: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-10"
        style={{
          background: 'linear-gradient(135deg, rgba(15,15,25,0.95) 0%, rgba(10,10,20,0.98) 50%, rgba(20,15,30,0.95) 100%)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 0 80px rgba(0,0,0,0.6), 0 0 120px rgba(139,92,246,0.05), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {/* Background ambient glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
            zIndex: 0,
          }}
        />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 z-20 p-2 rounded-full transition-all duration-300 cursor-pointer"
          style={{
            color: 'rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
          onMouseOver={function (e) { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
          onMouseOut={function (e) { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="relative z-10 text-center mb-10">
          <div
            className="inline-flex items-center justify-center size-12 rounded-full mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(59,130,246,0.1) 100%)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(139,92,246,0.15)',
              animation: 'liquid-iris 3s ease-in-out infinite',
            }}
          >
            <Sparkles size={22} style={{ color: '#8B5CF6' }} />
          </div>
          <h2
            className="text-3xl sm:text-4xl font-bold tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #F0E6FF 0%, #C4B5FD 50%, #93C5FD 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Безлимитная подписка
          </h2>
          <p className="text-sm sm:text-base mt-3 max-w-md mx-auto" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Ежемесячная подписка на модели — пользуйтесь без ограничений в веб-интерфейсе и через API
          </p>
          {hasActiveSubscription && (
            <div
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full mt-4 text-sm font-medium"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(16,185,129,0.05) 100%)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(16,185,129,0.2)',
                color: '#34D399',
              }}
            >
              <Check size={14} />
              Активен тариф «{tiers?.[userTier]?.label || userTier}»
            </div>
          )}
        </div>

        {loading ? (
          <div className="relative z-10 flex justify-center py-20">
            <Loader2 size={32} className="animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />
          </div>
        ) : error && !tiers ? (
          <div className="relative z-10 text-center py-12" style={{ color: 'rgba(255,255,255,0.5)' }}>{error}</div>
        ) : (
          <>
            {/* Tier cards */}
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 mb-10">
              {tiers && ['starter', 'standard', 'premium'].map(function (tierKey) {
                var tier = tiers[tierKey];
                if (!tier) return null;
                var cfg = TIER_CONFIG[tierKey];
                var isActive = userTier === tierKey;
                var isPaying = payingTier === tierKey;
                var isHovered = hoveredTier === tierKey;
                var categories = tier.categories || {};
                var hardcoded = CATEGORY_MODEL_EXAMPLES[tierKey] || {};

                return (
                  <LiquidGlassCard
                    key={tierKey}
                    accent={cfg.accent}
                    glassGrad={cfg.glassGrad}
                    borderGrad={isActive ? 'linear-gradient(135deg, ' + cfg.accent + ' 0%, ' + cfg.accent + ' 30%, rgba(255,255,255,0.1) 100%)' : cfg.borderGrad}
                    shimmerColor={cfg.shimmerColor}
                    isActive={isActive}
                    className={isActive ? 'scale-[1.02]' : (isHovered ? 'scale-[1.015]' : '')}
                  >
                    <div
                      className="p-5 sm:p-6 flex flex-col min-h-full"
                      onMouseEnter={function () { setHoveredTier(tierKey); }}
                      onMouseLeave={function () { setHoveredTier(null); }}
                    >
                      {/* Active badge */}
                      {isActive && (
                        <div
                          className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-semibold z-20"
                          style={{
                            background: 'linear-gradient(135deg, ' + cfg.accent + ' 0%, rgba(255,255,255,0.2) 100%)',
                            color: 'white',
                            boxShadow: '0 0 20px ' + cfg.accent + '40',
                            backdropFilter: 'blur(8px)',
                          }}
                        >
                          <span className="flex items-center gap-1.5">
                            <Check size={10} />
                            Активен
                          </span>
                        </div>
                      )}

                      {/* Tier name */}
                      <h3
                        className="text-xl font-bold tracking-tight"
                        style={{
                          color: cfg.accent,
                          fontFamily: 'Inter, sans-serif',
                        }}
                      >
                        {tier.label}
                      </h3>

                      {/* Price */}
                      <div className="mt-4 mb-5">
                        <span className="text-4xl font-bold tracking-tight text-white">{tier.price.toLocaleString('ru-RU')}</span>
                        <span className="text-sm ml-1 font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>₽</span>
                        <div
                          className="text-xs mt-1 font-medium inline-block px-3 py-0.5 rounded-full"
                          style={{
                            color: 'rgba(255,255,255,0.35)',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)',
                          }}
                        >
                          в месяц
                        </div>
                      </div>

                      {/* Categories */}
                      <div className="flex-1 space-y-4">
                        {Object.keys(categories).map(function (catKey) {
                          var cat = categories[catKey];
                          var CatIcon = CATEGORY_ICONS[catKey] || MessageSquare;
                          var examples = hardcoded[catKey] || [];
                          return (
                            <div key={catKey}>
                              <div className="flex items-center gap-2 text-xs font-medium mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                <div
                                  className="flex items-center justify-center size-5 rounded-md"
                                  style={{
                                    background: cfg.accent + '15',
                                    border: '1px solid ' + cfg.accent + '20',
                                  }}
                                >
                                  <CatIcon size={10} style={{ color: cfg.accent }} />
                                </div>
                                <span>{cat.label}</span>
                                <span
                                  className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                                  style={{
                                    background: cfg.accent + '10',
                                    color: cfg.accent,
                                    border: '1px solid ' + cfg.accent + '15',
                                  }}
                                >
                                  {cat.count || examples.length}
                                </span>
                              </div>
                              <div className="space-y-1">
                                {examples.map(function (m, idx) {
                                  return (
                                    <div key={idx} className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                      <div
                                        className="size-1 rounded-full shrink-0"
                                        style={{ backgroundColor: cfg.accent, opacity: 0.5 }}
                                      />
                                      <span className="truncate">{m.name}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Buy button */}
                      <button
                        type="button"
                        disabled={isPaying || (hasActiveSubscription && !isActive)}
                        onClick={function () { handlePurchase(tierKey); }}
                        className="w-full mt-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        style={{
                          background: isActive
                            ? 'transparent'
                            : 'linear-gradient(135deg, ' + cfg.accent + ' 0%, ' + cfg.accent + 'CC 100%)',
                          color: isActive ? cfg.accent : 'white',
                          border: isActive ? '1px solid ' + cfg.accent + '40' : 'none',
                          boxShadow: isActive
                            ? 'none'
                            : '0 0 20px ' + cfg.accent + '20, inset 0 1px 0 rgba(255,255,255,0.15)',
                        }}
                        onMouseOver={!isActive ? function (e) {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 0 30px ' + cfg.accent + '30, inset 0 1px 0 rgba(255,255,255,0.2)';
                        } : undefined}
                        onMouseOut={!isActive ? function (e) {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 0 20px ' + cfg.accent + '20, inset 0 1px 0 rgba(255,255,255,0.15)';
                        } : undefined}
                      >
                        {isPaying ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 size={14} className="animate-spin" /> Платёж...
                          </span>
                        ) : isActive ? (
                          'Уже активен'
                        ) : (
                          'Купить'
                        )}
                      </button>
                    </div>
                  </LiquidGlassCard>
                );
              })}
            </div>

            {/* Error message */}
            {error && (
              <div
                className="relative z-10 text-center mb-5 p-4 rounded-xl text-sm"
                style={{
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.03) 100%)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(239,68,68,0.15)',
                  color: '#F87171',
                }}
              >
                {error}
              </div>
            )}

            {/* API article link */}
            <div className="relative z-10 text-center">
              <a
                href="/api-docs"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all duration-300"
                style={{
                  color: 'rgba(255,255,255,0.3)',
                  background: 'rgba(255,255,255,0.02)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.04)',
                }}
                onMouseOver={function (e) {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }}
                onMouseOut={function (e) {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.3)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                }}
              >
                <ExternalLink size={13} />
                Как пользоваться API — документация и примеры
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
