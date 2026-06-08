import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const pageBg = 'var(--page-bg)';
const panelBg = 'var(--panel-bg)';

export default function LandingPage({ config }) {
  const navigate = useNavigate();
  if (!config) return null;

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: pageBg, fontFamily: 'Inter, sans-serif' }}>
      <header className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="text-white font-semibold tracking-tight">JustRouter</Link>
          <button
            type="button"
            onClick={() => navigate(config.cta?.href || '/models/text')}
            className="text-sm px-4 py-2 rounded-full bg-white text-black font-medium hover:bg-white/90 transition-colors"
          >
            {config.cta?.label || 'Начать'}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-10 sm:py-14 space-y-10">
        <section className="space-y-4">
          <h1 className="text-3xl sm:text-4xl font-semibold leading-tight">{config.h1}</h1>
          <p className="text-white/65 text-lg leading-relaxed max-w-3xl">{config.lead}</p>
          <button
            type="button"
            onClick={() => navigate(config.cta?.href || '/models/text')}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 text-black font-medium hover:bg-emerald-400 transition-colors"
          >
            {config.cta?.label || 'Начать'}
            <ArrowRight size={18} />
          </button>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {(config.sections || []).map((section) => (
            <article
              key={section.title}
              className="rounded-2xl p-5 space-y-2"
              style={{ backgroundColor: panelBg, border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <h2 className="text-base font-semibold">{section.title}</h2>
              <p className="text-white/55 text-sm leading-relaxed">{section.body}</p>
            </article>
          ))}
        </section>

        {(config.faq || []).length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Частые вопросы</h2>
            <div className="space-y-3">
              {config.faq.map((item) => (
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
        )}

        <section className="rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" style={{ backgroundColor: panelBg, border: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <p className="font-semibold">Готовы попробовать?</p>
            <p className="text-white/55 text-sm mt-1">Регистрация за минуту, бонус на баланс, оплата в рублях.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/account')}
            className="px-5 py-3 rounded-2xl bg-white text-black font-medium hover:bg-white/90 transition-colors whitespace-nowrap"
          >
            Создать аккаунт
          </button>
        </section>
      </main>
    </div>
  );
}
