import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, ArrowRight, Coins, Zap, Building2 } from 'lucide-react';
import { SeoPageShell } from './Breadcrumbs.jsx';
import { PRICING_FAQ } from '../shared/seo-config.js';
import { api } from './api.js';
import { reachGoal, GOALS } from './metrica.js';

const panelBg = 'var(--panel-bg)';
const softPanelBg = 'var(--soft-panel-bg)';

const SUBSCRIPTION_PLANS = [
  {
    id: 'base',
    name: 'Base',
    desc: 'Для ежедневного использования моделей с приоритетом и без рекламы.',
    popular: false,
    prices: { monthly: 499, yearly: 4990 },
    features: [
      'Приоритетная очередь запросов',
      'Без рекламы и баннеров',
      'Расширенный контекст до 32K',
      'Поддержка по email в течение 24ч',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    desc: 'Для профессионалов и команд — максимум возможностей JustRouter.',
    popular: true,
    prices: { monthly: 1499, yearly: 14990 },
    features: [
      'Всё из Base',
      'Безлимитные запросы (честный Fair Use)',
      'Приоритетная поддержка 24/7',
      'Новые модели сразу после релиза',
      'Доступ к WebSearch и аналитике',
      'Ранний доступ к функциям',
    ],
  },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(null);

  const token = localStorage.getItem('velorix_token');

  const handleSubscribe = async (planId) => {
    if (!token) {
      navigate('/', { state: { auth: 'login' } });
      return;
    }

    setLoading(planId);
    try {
      const result = await api.createSubscriptionPayment(planId, period);
      // Fire metrica goal before redirect
      const goalName = planId === 'base'
        ? (period === 'monthly' ? GOALS.SUBSCRIPTION_BASE_MONTHLY : GOALS.SUBSCRIPTION_BASE_YEARLY)
        : (period === 'monthly' ? GOALS.SUBSCRIPTION_PRO_MONTHLY : GOALS.SUBSCRIPTION_PRO_YEARLY);
      reachGoal(goalName, { plan: planId, period, amount: result.amount });

      if (result.confirmation_url) {
        window.location.href = result.confirmation_url;
      }
    } catch (e) {
      alert(e.message || 'Ошибка оформления подписки');
    } finally {
      setLoading(null);
    }
  };

  return (
    <SeoPageShell pathname="/pricing">
      <section className="space-y-4">
        <h1 className="text-3xl sm:text-4xl font-semibold leading-tight">Тарифы JustRouter</h1>
        <p className="text-white/65 text-lg leading-relaxed max-w-3xl">
          Подписка или Pay-as-you-go — выбирайте, как удобно.
        </p>
      </section>

      {/* Period toggle */}
      <div className="flex items-center gap-1 p-1 rounded-2xl w-fit" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={() => setPeriod('monthly')}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer"
          style={period === 'monthly' ? { backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff' } : { color: 'rgba(255,255,255,0.5)' }}
        >
          Ежемесячно
        </button>
        <button
          onClick={() => setPeriod('yearly')}
          className="px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer"
          style={period === 'yearly' ? { backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff' } : { color: 'rgba(255,255,255,0.5)' }}
        >
          Ежегодно
          <span className="ml-1.5 text-[10px] text-emerald-400 font-semibold">−17%</span>
        </button>
      </div>

      {/* Subscription plans */}
      <section aria-labelledby="subscription-plans">
        <h2 id="subscription-plans" className="sr-only">Тарифы подписки</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const price = plan.prices[period];
            const isBase = plan.id === 'base';
            const isPro = plan.id === 'pro';
            const goalName = isBase
              ? (period === 'monthly' ? GOALS.SUBSCRIPTION_BASE_MONTHLY : GOALS.SUBSCRIPTION_BASE_YEARLY)
              : (period === 'monthly' ? GOALS.SUBSCRIPTION_PRO_MONTHLY : GOALS.SUBSCRIPTION_PRO_YEARLY);

            return (
              <article
                key={plan.id}
                className="rounded-2xl p-6 flex flex-col gap-4 relative"
                style={{
                  backgroundColor: panelBg,
                  border: plan.popular
                    ? '1px solid rgba(16,185,129,0.4)'
                    : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {plan.popular && (
                  <span className="absolute -top-2.5 left-4 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500 text-black font-semibold">
                    Популярный
                  </span>
                )}

                <div>
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <p className="text-white/55 text-sm mt-1">{plan.desc}</p>
                </div>

                <div>
                  <p className="text-3xl font-semibold">
                    {price} ₽
                    <span className="text-white/40 text-sm font-normal">/{period === 'monthly' ? 'мес' : 'год'}</span>
                  </p>
                  {period === 'yearly' && (
                    <p className="text-emerald-400/70 text-xs mt-1">
                      {Math.round(price / 12)} ₽/мес при оплате за год
                    </p>
                  )}
                </div>

                <ul className="space-y-2 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white/60">
                      <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading === plan.id}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    plan.popular
                      ? 'bg-emerald-500 text-black hover:bg-emerald-400'
                      : 'bg-white/10 hover:bg-white/15 text-white'
                  } disabled:opacity-50`}
                >
                  {loading === plan.id ? 'Оформляем...' : `Оформить ${plan.name}`}
                  <ArrowRight size={16} />
                </button>

                <div className="text-white/25 text-[10px] font-mono text-center">
                  Цель Metrika: <code className="text-white/40">{goalName}</code>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Pay-as-you-go */}
      <section className="rounded-2xl p-6" style={{ backgroundColor: panelBg, border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(251,191,36,0.12)' }}>
            <Coins size={22} style={{ color: '#F59E0B' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold">Pay-as-you-go</h3>
            <p className="text-white/55 text-sm mt-1 leading-relaxed">
              Не хотите подписку? Просто пополняйте баланс от 10 ₽ и платите только за использованные токены и генерации.
              Все 150+ моделей доступны — GPT, Claude, DeepSeek, Gemini, Midjourney и другие.
            </p>
            <button
              type="button"
              onClick={() => navigate('/account')}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors bg-white/10 hover:bg-white/15 text-white cursor-pointer"
            >
              Пополнить баланс
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* Business plan */}
      <section className="rounded-2xl p-6" style={{ backgroundColor: panelBg, border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(99,102,241,0.12)' }}>
            <Building2 size={22} style={{ color: '#818CF8' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold">Business</h3>
            <p className="text-white/55 text-sm mt-1 leading-relaxed">
              Для команд и продуктов: высокие объёмы, приоритетная поддержка, кастомные условия и SLA.
            </p>
            <a
              href="mailto:support@justrouter.ru"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors bg-white/10 hover:bg-white/15 text-white"
            >
              Написать в поддержку
              <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* Price calculation info */}
      <section className="rounded-2xl p-6 space-y-3" style={{ backgroundColor: panelBg, border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 className="text-xl font-semibold">Как считается стоимость</h2>
        <p className="text-white/55 text-sm leading-relaxed">
          Текстовые модели — за 1M токенов (вход + выход). Изображения и видео — за генерацию.
          Актуальные цены указаны в{' '}
          <Link to="/models/text" className="text-emerald-400 hover:underline">
            каталоге моделей
          </Link>
          . Баланс не сгорает.
        </p>
        <Link
          to="/docs"
          className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:underline"
        >
          Документация API
          <ArrowRight size={14} />
        </Link>
      </section>

      {/* FAQ */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Частые вопросы о тарифах</h2>
        <div className="space-y-3">
          {PRICING_FAQ.map((item) => (
            <details
              key={item.question}
              className="rounded-2xl p-4"
              style={{ backgroundColor: panelBg, border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <summary className="cursor-pointer font-medium">{item.question}</summary>
              <p className="mt-3 text-white/60 text-sm leading-relaxed">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>
    </SeoPageShell>
  );
}
