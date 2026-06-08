import { readFileSync } from 'fs';
import { join } from 'path';
import {
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  resolveSeo,
  getStaticBodyHtml,
  buildJsonLd,
  escapeHtml,
} from '../shared/seo-config.js';

let cachedTemplate = null;

function getTemplate(distPath) {
  if (!cachedTemplate) {
    cachedTemplate = readFileSync(join(distPath, 'index.html'), 'utf8');
  }
  return cachedTemplate;
}

function buildHeadMarkup(seo) {
  const robots = seo.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large';
  const canonical = seo.canonical || DEFAULT_OG_IMAGE.replace('/og-image.png', '/');
  const ogType = seo.canonical?.endsWith('/') && !seo.canonical.includes('/models') ? 'website' : 'article';

  return `
    <meta charset="UTF-8" />
    <!-- Yandex.Metrika counter -->
    <script type="text/javascript">
    (function(m,e,t,r,i,k,a){
        m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
    })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=109602539', 'ym');

    ym(109602539, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
    </script>
    <noscript><div><img src="https://mc.yandex.ru/watch/109602539" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
    <!-- /Yandex.Metrika counter -->

    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(seo.title)}</title>
    <meta name="description" content="${escapeHtml(seo.description)}" />
    ${seo.keywords ? `<meta name="keywords" content="${escapeHtml(seo.keywords)}" />` : ''}
    <meta name="robots" content="${robots}" />
    <meta name="author" content="${SITE_NAME}" />
    <meta name="theme-color" content="#000000" />
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <link rel="alternate" hreflang="ru" href="${escapeHtml(canonical)}" />
    <link rel="alternate" hreflang="x-default" href="${escapeHtml(canonical)}" />
    <meta property="og:type" content="${ogType}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:locale" content="ru_RU" />
    <meta property="og:title" content="${escapeHtml(seo.title)}" />
    <meta property="og:description" content="${escapeHtml(seo.description)}" />
    <meta property="og:url" content="${escapeHtml(canonical)}" />
    <meta property="og:image" content="${DEFAULT_OG_IMAGE}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(seo.title)}" />
    <meta name="twitter:description" content="${escapeHtml(seo.description)}" />
    <meta name="twitter:image" content="${DEFAULT_OG_IMAGE}" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  `.trim();
}

export function renderSeoHtml(distPath, pathname, search = '') {
  const template = getTemplate(distPath);
  const seo = resolveSeo(pathname, search);
  const head = buildHeadMarkup(seo);
  const jsonLd = buildJsonLd(pathname, seo)
    .map((block) => `<script type="application/ld+json">${JSON.stringify(block)}</script>`)
    .join('\n    ');

  // Preserve Vite module scripts and CSS links from the original template
  const viteAssets = (template.match(/<script type="module"[^>]*src="[^"]*"[^>]*><\/script>/g) || []).join('\n    ');
  const viteCss = (template.match(/<link rel="stylesheet"[^>]*href="[^"]*"[^>]*>/g) || []).join('\n    ');

  const staticBody = getStaticBodyHtml(seo);

  let html = template.replace(/<head>[\s\S]*?<\/head>/, `<head>\n    ${head}\n    ${jsonLd}\n    ${viteAssets}\n    ${viteCss}\n  </head>`);

  const noscript = staticBody
    ? `\n    <noscript><main style="max-width:720px;margin:2rem auto;padding:0 1rem;font-family:Inter,sans-serif;color:#111">${staticBody}</main></noscript>`
    : '';

  if (html.includes('<div id="root"></div>')) {
    html = html.replace('<div id="root"></div>', `<div id="root"></div>${noscript}`);
  }

  return html;
}

export function invalidateSeoTemplateCache() {
  cachedTemplate = null;
}
