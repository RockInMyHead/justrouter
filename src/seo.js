export {
  SITE_URL,
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  HOME_FAQ,
  PRICING_FAQ,
  LANDING_PAGES,
  MODEL_CATEGORIES,
  BLOG_POSTS,
  BLOG_SLUGS,
  resolveSeo,
  getCategoryFromPath,
  getBreadcrumbs,
} from '../shared/seo-config.js';

import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  resolveSeo,
  buildJsonLd,
} from '../shared/seo-config.js';

function upsertMeta(name, content, attr = 'name') {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel, href, extra = {}) {
  if (!href) return;
  let selector = `link[rel="${rel}"]`;
  if (extra.hreflang) selector += `[hreflang="${extra.hreflang}"]`;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
  Object.entries(extra).forEach(([key, value]) => {
    if (value != null) el.setAttribute(key, value);
  });
}

export function applySeo(pathname, search = '') {
  const seo = resolveSeo(pathname, search);
  const canonical = seo.canonical || `${SITE_URL}${pathname === '/' ? '' : pathname}`;

  document.documentElement.lang = 'ru';
  document.title = seo.title || `${SITE_NAME} — AI-сервис`;

  upsertMeta('description', seo.description);
  upsertMeta('keywords', seo.keywords);
  upsertMeta('robots', seo.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
  upsertMeta('author', SITE_NAME);
  upsertMeta('theme-color', '#000000');

  upsertMeta('og:title', seo.title, 'property');
  upsertMeta('og:description', seo.description, 'property');
  upsertMeta('og:type', pathname === '/' || pathname.startsWith('/blog/') ? (pathname === '/' ? 'website' : 'article') : 'website', 'property');
  upsertMeta('og:url', canonical, 'property');
  upsertMeta('og:site_name', SITE_NAME, 'property');
  upsertMeta('og:locale', 'ru_RU', 'property');
  upsertMeta('og:image', DEFAULT_OG_IMAGE, 'property');

  upsertMeta('twitter:card', 'summary_large_image');
  upsertMeta('twitter:title', seo.title);
  upsertMeta('twitter:description', seo.description);
  upsertMeta('twitter:image', DEFAULT_OG_IMAGE);

  upsertLink('canonical', canonical);
  upsertLink('alternate', canonical, { hreflang: 'ru' });
  upsertLink('alternate', canonical, { hreflang: 'x-default' });

  document.querySelectorAll('script[data-justrouter-ld]').forEach((el) => el.remove());
  const blocks = buildJsonLd(pathname, seo);
  blocks.forEach((block, i) => {
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute('data-justrouter-ld', '1');
    el.id = `justrouter-ld-${i}`;
    el.textContent = JSON.stringify(block);
    document.head.appendChild(el);
  });
}
