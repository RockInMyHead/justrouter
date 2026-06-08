import { useState, useEffect } from 'react';
import { SeoPageShell } from './Breadcrumbs.jsx';
import { api } from './api';

const panelBg = 'var(--panel-bg)';

var CATEGORY_LABELS = {
  general: 'Общие вопросы',
  service: 'О сервисе',
  payment: 'Оплата и тарифы',
  models: 'Модели и API',
  account: 'Аккаунт и безопасность',
  tech: 'Технические вопросы',
  subscription: 'Подписка',
};

var CATEGORY_ORDER = ['general', 'service', 'payment', 'subscription', 'models', 'account', 'tech'];

export default function FaqPage() {
  var [items, setItems] = useState([]);
  var [loading, setLoading] = useState(true);
  var [openItems, setOpenItems] = useState({});

  useEffect(function () {
    api.getFaq()
      .then(function (data) {
        setItems(data || []);
      })
      .catch(function () {
        setItems([]);
      })
      .finally(function () {
        setLoading(false);
      });
  }, []);

  // Group by category
  var grouped = {};
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var cat = item.category || 'general';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }

  var sortedCategories = CATEGORY_ORDER.filter(function (c) { return grouped[c]; });
  // Add any unknown categories at the end
  for (var groupedCategory in grouped) {
    if (sortedCategories.indexOf(groupedCategory) === -1) sortedCategories.push(groupedCategory);
  }

  var toggleItem = function toggleItem(id) {
    setOpenItems(function (prev) {
      var next = Object.assign({}, prev);
      next[id] = !next[id];
      return next;
    });
  };

  var categoryColors = {
    general: { dot: '#3B82F6', bg: 'rgba(59,130,246,0.05)', border: 'rgba(59,130,246,0.15)' },
    service: { dot: '#8B5CF6', bg: 'rgba(139,92,246,0.05)', border: 'rgba(139,92,246,0.15)' },
    payment: { dot: '#10B981', bg: 'rgba(16,185,129,0.05)', border: 'rgba(16,185,129,0.15)' },
    models: { dot: '#F59E0B', bg: 'rgba(245,158,11,0.05)', border: 'rgba(245,158,11,0.15)' },
    account: { dot: '#EC4899', bg: 'rgba(236,72,153,0.05)', border: 'rgba(236,72,153,0.15)' },
    tech: { dot: '#06B6D4', bg: 'rgba(6,182,212,0.05)', border: 'rgba(6,182,212,0.15)' },
    subscription: { dot: '#F97316', bg: 'rgba(249,115,22,0.05)', border: 'rgba(249,115,22,0.15)' },
  };

  return (
    <SeoPageShell pathname="/faq">
      <section className="space-y-4">
        <h1 className="text-3xl sm:text-4xl font-semibold leading-tight">Частые вопросы</h1>
        <p className="text-white/65 text-lg leading-relaxed max-w-3xl">
          Ответы на самые популярные вопросы о JustRouter, оплате, моделях и API
        </p>
      </section>

      <section>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'rgba(255,255,255,0.6)' }} />
          </div>
        ) : sortedCategories.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <p>Вопросы появятся скоро</p>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedCategories.map(function (cat) {
              var catItems = grouped[cat];
              var colors = categoryColors[cat] || { dot: '#6B7280', bg: 'rgba(107,114,128,0.05)', border: 'rgba(107,114,128,0.15)' };
              var label = CATEGORY_LABELS[cat] || cat;

              return (
                <div key={cat} className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colors.dot }} />
                    <h2 className="text-lg font-semibold text-white">{label}</h2>
                    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: colors.bg, color: colors.dot }}>
                      {catItems.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {catItems.map(function (item) {
                      var isOpen = openItems[item.id];
                      return (
                        <div
                          key={item.id}
                          className="rounded-xl transition-all duration-200"
                          style={{
                            backgroundColor: colors.bg,
                            border: isOpen ? '1px solid ' + colors.dot : '1px solid ' + colors.border,
                          }}
                        >
                          <button
                            type="button"
                            onClick={function () { toggleItem(item.id); }}
                            className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left cursor-pointer"
                          >
                            <span className="text-sm font-medium text-white/90 pr-2">{item.question}</span>
                            <svg
                              className="shrink-0 transition-transform duration-200"
                              style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', color: colors.dot }}
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                          <div
                            className="overflow-hidden transition-all duration-200"
                            style={{
                              maxHeight: isOpen ? '500px' : '0px',
                              opacity: isOpen ? 1 : 0,
                            }}
                          >
                            <div className="px-5 pb-4">
                              <div className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'rgba(255,255,255,0.55)' }}>
                                {item.answer}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </SeoPageShell>
  );
}
