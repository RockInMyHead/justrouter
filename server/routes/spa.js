import express from 'express';
import { join } from 'path';
import { MODEL_CATEGORIES } from '../../shared/seo-config.js';
import { isNoIndexPath } from '../http-policy.js';

export function registerSpaRoutes(app, { distPath, renderSeoHtml }) {
  app.use('/demos', express.static(join(distPath, 'demos')));
  app.use(express.static(distPath, { index: false }));

  app.get('/models', (req, res) => {
    const category = String(req.query.category || '');
    if (MODEL_CATEGORIES.includes(category)) {
      return res.redirect(301, `/models/${category}`);
    }
    return res.redirect(301, '/models/text');
  });

  app.get('/api-docs', (_req, res) => {
    res.redirect(301, '/docs');
  });

  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    if (req.path.startsWith('/demos/')) return next();
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();

    try {
      const search = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
      const html = renderSeoHtml(distPath, req.path, search);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      if (isNoIndexPath(req.path)) {
        res.setHeader('X-Robots-Tag', 'noindex, nofollow');
      }
      return res.send(html);
    } catch (e) {
      console.error('[seo-html]', e.message);
      return res.sendFile(join(distPath, 'index.html'));
    }
  });
}
