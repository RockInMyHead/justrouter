function parseJsonField(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeSlug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function registerContentRoutes(app, { db, adminMiddleware }) {
  app.get('/api/blog', (_req, res) => {
    const posts = db.prepare(`
      SELECT id, slug, title, description, image_url, date_published, date_modified, read_minutes, author
      FROM blog_posts
      WHERE is_published = 1
      ORDER BY date_published DESC
    `).all();
    res.json(posts);
  });

  app.get('/api/blog/:slug', (req, res) => {
    const post = db.prepare('SELECT * FROM blog_posts WHERE slug = ? AND is_published = 1').get(req.params.slug);
    if (!post) return res.status(404).json({ error: 'Статья не найдена' });
    post.content = parseJsonField(post.content, []);
    post.faq = parseJsonField(post.faq, []);
    return res.json(post);
  });

  app.get('/api/admin/blog', adminMiddleware, (_req, res) => {
    const posts = db.prepare('SELECT id, slug, title, description, image_url, date_published, date_modified, read_minutes, is_published, author, created_at FROM blog_posts ORDER BY created_at DESC').all();
    res.json(posts);
  });

  app.post('/api/admin/blog', adminMiddleware, (req, res) => {
    const { slug, title, description, content, image_url, date_published, read_minutes, faq, author } = req.body;
    if (!slug || !title) return res.status(400).json({ error: 'slug и title обязательны' });

    const cleanSlug = normalizeSlug(slug);
    if (!cleanSlug) return res.status(400).json({ error: 'Некорректный slug' });

    const existing = db.prepare('SELECT id FROM blog_posts WHERE slug = ?').get(cleanSlug);
    if (existing) return res.status(400).json({ error: 'Статья с таким slug уже существует' });

    const now = new Date().toISOString().split('T')[0];
    db.prepare(`
      INSERT INTO blog_posts (slug, title, description, content, image_url, date_published, date_modified, read_minutes, faq, author, is_published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      cleanSlug,
      title,
      description || '',
      JSON.stringify(content || []),
      image_url || null,
      date_published || now,
      now,
      parseInt(read_minutes) || 5,
      JSON.stringify(faq || []),
      author || 'JustRouter',
    );
    return res.json({ success: true, slug: cleanSlug });
  });

  app.put('/api/admin/blog/:id', adminMiddleware, (req, res) => {
    const post = db.prepare('SELECT id FROM blog_posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Статья не найдена' });

    const { slug, title, description, content, image_url, date_published, date_modified, read_minutes, faq, author, is_published } = req.body;
    const now = new Date().toISOString().split('T')[0];

    if (slug) {
      const cleanSlug = normalizeSlug(slug);
      const existing = db.prepare('SELECT id FROM blog_posts WHERE slug = ? AND id != ?').get(cleanSlug, req.params.id);
      if (existing) return res.status(400).json({ error: 'Статья с таким slug уже существует' });
    }

    db.prepare(`
      UPDATE blog_posts SET
        slug = COALESCE(?, slug),
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        content = COALESCE(?, content),
        image_url = COALESCE(?, image_url),
        date_published = COALESCE(?, date_published),
        date_modified = ?,
        read_minutes = COALESCE(?, read_minutes),
        faq = COALESCE(?, faq),
        author = COALESCE(?, author),
        is_published = COALESCE(?, is_published),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      slug || null,
      title || null,
      description || null,
      content ? JSON.stringify(content) : null,
      image_url || null,
      date_published || null,
      date_modified || now,
      parseInt(read_minutes) || null,
      faq ? JSON.stringify(faq) : null,
      author || null,
      is_published !== undefined ? (is_published ? 1 : 0) : null,
      req.params.id,
    );
    return res.json({ success: true });
  });

  app.delete('/api/admin/blog/:id', adminMiddleware, (req, res) => {
    const post = db.prepare('SELECT id FROM blog_posts WHERE id = ?').get(req.params.id);
    if (!post) return res.status(404).json({ error: 'Статья не найдена' });
    db.prepare('DELETE FROM blog_posts WHERE id = ?').run(req.params.id);
    return res.json({ message: 'Статья удалена' });
  });

  app.get('/api/faq', (_req, res) => {
    const items = db.prepare(`
      SELECT id, question, answer, category, sort_order
      FROM faq
      WHERE is_published = 1
      ORDER BY category ASC, sort_order ASC, id ASC
    `).all();
    res.json(items);
  });

  app.get('/api/admin/faq', adminMiddleware, (_req, res) => {
    const items = db.prepare('SELECT * FROM faq ORDER BY category ASC, sort_order ASC, id ASC').all();
    res.json(items);
  });

  app.post('/api/admin/faq', adminMiddleware, (req, res) => {
    const { question, answer, category, sort_order } = req.body;
    if (!question || !answer) return res.status(400).json({ error: 'question и answer обязательны' });
    db.prepare(`
      INSERT INTO faq (question, answer, category, sort_order, is_published)
      VALUES (?, ?, ?, ?, 0)
    `).run(question, answer, category || 'general', parseInt(sort_order) || 0);
    return res.json({ success: true });
  });

  app.put('/api/admin/faq/:id', adminMiddleware, (req, res) => {
    const item = db.prepare('SELECT id FROM faq WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Вопрос не найден' });
    const { question, answer, category, sort_order, is_published } = req.body;
    db.prepare(`
      UPDATE faq SET
        question = COALESCE(?, question),
        answer = COALESCE(?, answer),
        category = COALESCE(?, category),
        sort_order = COALESCE(?, sort_order),
        is_published = COALESCE(?, is_published),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      question || null,
      answer || null,
      category || null,
      parseInt(sort_order) || null,
      is_published !== undefined ? (is_published ? 1 : 0) : null,
      req.params.id,
    );
    return res.json({ success: true });
  });

  app.delete('/api/admin/faq/:id', adminMiddleware, (req, res) => {
    const item = db.prepare('SELECT id FROM faq WHERE id = ?').get(req.params.id);
    if (!item) return res.status(404).json({ error: 'Вопрос не найден' });
    db.prepare('DELETE FROM faq WHERE id = ?').run(req.params.id);
    return res.json({ message: 'Вопрос удалён' });
  });
}
