import { useState, useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, Calendar, Clock, Loader2 } from 'lucide-react';
import { SeoPageShell } from './Breadcrumbs.jsx';
import { api } from './api';

const panelBg = 'var(--panel-bg)';

export default function BlogArticlePage() {
  var { slug } = useParams();
  var [post, setPost] = useState(null);
  var [loading, setLoading] = useState(true);
  var [notFound, setNotFound] = useState(false);

  useEffect(function () {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    api.getBlogPost(slug)
      .then(function (data) {
        setPost(data);
      })
      .catch(function () {
        setNotFound(true);
      })
      .finally(function () {
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <SeoPageShell pathname="/blog">
        <div className="flex justify-center py-16">
          <Loader2 size={32} className="animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />
        </div>
      </SeoPageShell>
    );
  }

  if (notFound || !post) {
    return <Navigate to="/blog" replace />;
  }

  var content = post.content || [];
  var faqItems = post.faq || [];

  return (
    <SeoPageShell pathname={`/blog/${slug}`}>
      <article className="space-y-8">
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/40">
            <span className="inline-flex items-center gap-1">
              <Calendar size={12} />
              {new Date(post.date_published).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock size={12} />
              {post.read_minutes} мин чтения
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold leading-tight">{post.title}</h1>
          <p className="text-white/65 text-lg leading-relaxed">{post.description}</p>
        </header>

        <div className="space-y-8">
          {content.map(function (section) {
            var heading = section.heading || section.title || '';
            var body = section.body || section.content || '';
            return (
              <section key={heading} className="space-y-3">
                <h2 className="text-xl font-semibold">{heading}</h2>
                <div className="text-white/60 text-sm leading-relaxed whitespace-pre-line">
                  {body}
                </div>
              </section>
            );
          })}
        </div>

        {faqItems.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Частые вопросы</h2>
            <div className="space-y-3">
              {faqItems.map(function (item) {
                var question = item.question || item.q || '';
                var answer = item.answer || item.a || '';
                return (
                  <details
                    key={question}
                    className="rounded-2xl p-4"
                    style={{ backgroundColor: panelBg, border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <summary className="cursor-pointer font-medium">{question}</summary>
                    <p className="mt-3 text-white/60 text-sm leading-relaxed">{answer}</p>
                  </details>
                );
              })}
            </div>
          </section>
        )}

        <section
          className="rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          style={{ backgroundColor: panelBg, border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div>
            <p className="font-semibold">Попробуйте JustRouter</p>
            <p className="text-white/55 text-sm mt-1">Единый API, оплата в рублях, без VPN.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 text-sm font-medium hover:bg-white/15 transition-colors"
            >
              Документация API
            </Link>
            <Link
              to="/models/text"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-black text-sm font-medium hover:bg-emerald-400 transition-colors"
            >
              Каталог моделей
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        <p className="text-sm">
          <Link to="/blog" className="text-white/40 hover:text-white/70 transition-colors">
            ← Все статьи
          </Link>
        </p>
      </article>
    </SeoPageShell>
  );
}
