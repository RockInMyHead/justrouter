import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Clock } from 'lucide-react';
import { SeoPageShell } from './Breadcrumbs.jsx';
import { api } from './api';

const panelBg = 'var(--panel-bg)';

export default function BlogPage() {
  var [posts, setPosts] = useState([]);
  var [loading, setLoading] = useState(true);

  useEffect(function () {
    api.getBlogPosts()
      .then(function (data) {
        setPosts(data || []);
      })
      .catch(function () {
        setPosts([]);
      })
      .finally(function () {
        setLoading(false);
      });
  }, []);

  return (
    <SeoPageShell pathname="/blog">
      <section className="space-y-4">
        <h1 className="text-3xl sm:text-4xl font-semibold leading-tight">Блог JustRouter</h1>
        <p className="text-white/65 text-lg leading-relaxed max-w-3xl">
          Гайды по AI API, интеграция GPT и DeepSeek, сравнения сервисов для разработчиков из России.
        </p>
      </section>

      <section aria-labelledby="blog-list">
        <h2 id="blog-list" className="sr-only">
          Статьи блога
        </h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: 'rgba(255,255,255,0.6)' }} />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <p>Статьи появятся скоро</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {posts.map(function (post) {
              return (
                <article
                  key={post.slug}
                  className="rounded-2xl p-6 space-y-3 transition-colors hover:border-white/15"
                  style={{ backgroundColor: panelBg, border: '1px solid rgba(255,255,255,0.08)' }}
                >
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
                      {post.read_minutes} мин
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold">
                    <Link to={`/blog/${post.slug}`} className="hover:text-emerald-400 transition-colors">
                      {post.title}
                    </Link>
                  </h2>
                  <p className="text-white/55 text-sm leading-relaxed">{post.description}</p>
                  <Link
                    to={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:underline"
                  >
                    Читать статью
                    <ArrowRight size={14} />
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </SeoPageShell>
  );
}
