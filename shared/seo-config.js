import { BLOG_POSTS, BLOG_SLUGS } from './blog-posts.js';

export const SITE_URL = 'https://justrouter.ru';
export const SITE_NAME = 'JustRouter';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

export const MODEL_CATEGORIES = ['text', 'image', 'video', 'audio', 'embedding'];

export const CATEGORY_LABELS = {
  text: 'Текстовые модели',
  image: 'Генерация изображений',
  video: 'Генерация видео',
  audio: 'Аудио',
  embedding: 'Embeddings',
};

export const HOME_FAQ = [
  {
    question: 'Как получить API-ключ JustRouter?',
    answer:
      'Зарегистрируйтесь на сайте, подтвердите email и создайте ключ в личном кабинете. Формат ключа: jr_* для пользователей или ag_* для агентов.',
  },
  {
    question: 'Какие модели доступны?',
    answer:
      '150+ моделей: GPT-4o, Claude 3.5, Gemini, DeepSeek R1, Llama, генерация изображений (Flux, DALL·E) и видео. Полный каталог — на странице моделей.',
  },
  {
    question: 'Как оплатить JustRouter из России?',
    answer:
      'Пополнение баланса в рублях банковской картой РФ. Списание только за фактическое использование — pay-as-you-go без абонентской платы.',
  },
  {
    question: 'Чем JustRouter лучше OpenRouter для России?',
    answer:
      'Оплата в рублях без VPN, поддержка на русском, единый доступ к тексту, изображениям и видео. Альтернатива OpenRouter для российских разработчиков.',
  },
  {
    question: 'Есть ли бесплатный тариф?',
    answer:
      'При регистрации начисляется бонус на баланс. Плюс бесплатные первые 10 запросов к каждой модели для тестирования.',
  },
];

export const PRICING_FAQ = [
  {
    question: 'Есть ли абонентская плата?',
    answer: 'Нет. Вы платите только за использованные токены и генерации — модель pay-as-you-go.',
  },
  {
    question: 'Минимальное пополнение баланса?',
    answer: 'Минимальная сумма пополнения указана в личном кабинете при оплате. Баланс не сгорает.',
  },
  {
    question: 'Как узнать цену модели?',
    answer: 'Актуальные цены за 1M токенов или за генерацию — в каталоге моделей на justrouter.ru/models.',
  },
];

export const LANDING_PAGES = {
  '/neyroseti-bez-vpn': {
    title: 'Нейросети без VPN — GPT, Claude, Gemini в России | JustRouter',
    description:
      'Доступ к GPT-4o, Claude, Gemini и другим AI-моделям из России без VPN. Оплата в рублях, единый API-ключ.',
    keywords: 'нейросети без vpn, gpt без vpn, claude россия, ai api россия',
    h1: 'Нейросети без VPN — из России, в рублях',
    lead: 'JustRouter даёт доступ к 150+ моделям без обхода блокировок. Один ключ, оплата картой РФ.',
    cta: { label: 'Получить API-ключ', href: '/account' },
    sections: [
      { title: 'Без VPN', body: 'Сайт и API доступны из России напрямую — justrouter.ru.' },
      { title: 'Все модели', body: 'GPT, Claude, Gemini, DeepSeek, изображения и видео в одном сервисе.' },
      { title: 'Оплата в ₽', body: 'Пополнение баланса российской картой, без зарубежных счетов.' },
    ],
    faq: HOME_FAQ.slice(0, 3),
  },
  '/openrouter-oplata-rossiya': {
    title: 'OpenRouter оплата из России — альтернатива JustRouter',
    description:
      'Как платить за AI API из России. JustRouter — оплата в рублях, альтернатива OpenRouter без USD и VPN.',
    keywords: 'openrouter оплата россия, openrouter альтернатива, ai api рубли',
    h1: 'OpenRouter из России: оплата и альтернатива',
    lead: 'OpenRouter требует USD и часто VPN. JustRouter — рубли, карта РФ, тот же принцип «один API — много моделей».',
    cta: { label: 'Попробовать JustRouter', href: '/models/text' },
    sections: [
      { title: 'Проблема OpenRouter', body: 'Зарубежные карты, USD, нестабильный доступ без VPN.' },
      { title: 'Решение JustRouter', body: 'Единый API, 150+ моделей, оплата в рублях из РФ.' },
      { title: 'Миграция за минуты', body: 'Замените base URL и API-ключ — формат запросов совместим.' },
    ],
    faq: [
      {
        question: 'JustRouter — это замена OpenRouter?',
        answer: 'Да, для российских разработчиков: тот же подход агрегатора моделей, но с локальной оплатой.',
      },
    ],
  },
  '/ai-api-rubli': {
    title: 'AI API в рублях — оплата картой РФ | JustRouter',
    description:
      'Единый AI API с оплатой в рублях. GPT, Claude, Gemini, DeepSeek — пополнение картой России, без USD.',
    keywords: 'ai api рубли, нейросеть оплата рублями, gpt api россия',
    h1: 'AI API с оплатой в рублях',
    lead: 'Один ключ для всех моделей. Пополняйте баланс картой РФ — платите только за использование.',
    cta: { label: 'Смотреть модели', href: '/models/text' },
    sections: [
      { title: 'Pay-as-you-go', body: 'Без подписки — списание за токены и генерации.' },
      { title: 'Прозрачные цены', body: 'Стоимость каждой модели в каталоге — в рублях за 1M токенов.' },
      { title: 'Бонус при регистрации', body: 'Начните тестировать модели с бонусом на баланс.' },
    ],
    faq: HOME_FAQ.slice(2, 5),
  },
  '/generaciya-video-neyrosetyu': {
    title: 'Генерация видео нейросетью — API и веб | JustRouter',
    description:
      'Создавайте видео через AI: Wan, Kling и другие модели. API и веб-интерфейс, оплата в рублях.',
    keywords: 'генерация видео нейросеть, ai video api, wan kling',
    h1: 'Генерация видео нейросетью',
    lead: 'Text-to-video и image-to-video в одном сервисе. Выберите модель в каталоге и создайте ролик.',
    cta: { label: 'Модели видео', href: '/models/video' },
    sections: [
      { title: 'Text-to-video', body: 'Опишите сцену — получите короткий ролик.' },
      { title: 'Image-to-video', body: 'Анимация из референс-изображений.' },
      { title: 'API для продуктов', body: 'Интегрируйте генерацию видео в своё приложение.' },
    ],
    faq: [],
  },
  '/generaciya-izobrazheniy': {
    title: 'Генерация изображений нейросетью — Flux, DALL·E | JustRouter',
    description:
      'AI-генерация картинок: Flux, DALL·E, Stable Diffusion. API и чат, оплата в рублях.',
    keywords: 'генерация изображений нейросеть, flux api, dall-e россия',
    h1: 'Генерация изображений нейросетью',
    lead: 'Создавайте картинки через лучшие image-модели. Один аккаунт — текст, фото и видео.',
    cta: { label: 'Модели изображений', href: '/models/image' },
    sections: [
      { title: 'Flux и DALL·E', body: 'Популярные модели в каталоге с актуальными ценами.' },
      { title: 'Референсы', body: 'Загружайте изображения для image-to-image.' },
      { title: 'API', body: 'Автоматизируйте генерацию в своих сервисах.' },
    ],
    faq: [],
  },
};

const MODELS_TABLE_ROWS = [
  ['GPT-4o', 'openai/gpt-4o', 'Текст, мультимодальность'],
  ['Claude 3.5 Sonnet', 'anthropic/claude-3.5-sonnet', 'Текст, длинный контекст'],
  ['DeepSeek R1', 'deepseek/deepseek-r1', 'Reasoning, код'],
  ['Gemini 2.0', 'google/gemini-2.0-flash', 'Быстрые ответы'],
  ['Flux', 'black-forest-labs/flux-1.1-pro', 'Генерация изображений'],
];

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function getCategoryFromPath(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'models') return null;
  const cat = parts[1];
  return MODEL_CATEGORIES.includes(cat) ? cat : 'text';
}

function blogSlugFromPath(pathname) {
  if (!pathname.startsWith('/blog/')) return null;
  const slug = pathname.slice('/blog/'.length).replace(/\/$/, '');
  return BLOG_POSTS[slug] ? slug : null;
}

export function getBreadcrumbs(pathname) {
  const items = [{ name: SITE_NAME, url: `${SITE_URL}/` }];

  if (pathname === '/' || pathname === '') return items;

  if (pathname.startsWith('/models')) {
    items.push({ name: 'Модели', url: `${SITE_URL}/models/text` });
    const cat = getCategoryFromPath(pathname);
    if (cat && cat !== 'text') {
      items.push({ name: CATEGORY_LABELS[cat], url: `${SITE_URL}/models/${cat}` });
    }
    return items;
  }

  if (pathname === '/pricing') {
    items.push({ name: 'Тарифы', url: `${SITE_URL}/pricing` });
    return items;
  }

  if (pathname === '/docs' || pathname === '/docs/quickstart' || pathname === '/api-docs') {
    items.push({ name: 'Документация', url: `${SITE_URL}/docs` });
    if (pathname === '/docs/quickstart') {
      items.push({ name: 'Быстрый старт', url: `${SITE_URL}/docs/quickstart` });
    }
    return items;
  }

  if (pathname === '/blog') {
    items.push({ name: 'Блог', url: `${SITE_URL}/blog` });
    return items;
  }

  const blogSlug = blogSlugFromPath(pathname);
  if (blogSlug) {
    items.push({ name: 'Блог', url: `${SITE_URL}/blog` });
    items.push({ name: BLOG_POSTS[blogSlug].title, url: `${SITE_URL}/blog/${blogSlug}` });
    return items;
  }

  if (pathname === '/faq') {
    items.push({ name: 'FAQ', url: `${SITE_URL}/faq` });
    return items;
  }

  const landing = LANDING_PAGES[pathname];
  if (landing) {
    items.push({ name: landing.h1, url: `${SITE_URL}${pathname}` });
  }

  return items;
}

function buildBreadcrumbJsonLd(pathname) {
  const crumbs = getBreadcrumbs(pathname);
  if (crumbs.length <= 1) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function resolveSeo(pathname, search = '') {
  const path = pathname.replace(/\/$/, '') || '/';
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const category = params.get('category');

  if (path === '/models' && MODEL_CATEGORIES.includes(category)) {
    return resolveSeo(`/models/${category}`, '');
  }

  if (path === '/api-docs') {
    return resolveSeo('/docs', '');
  }

  const blogSlug = blogSlugFromPath(path);
  if (blogSlug) {
    const post = BLOG_POSTS[blogSlug];
    return {
      title: `${post.title} | ${SITE_NAME}`,
      description: post.description,
      keywords: 'ai api, justrouter, нейросети, gpt, openrouter',
      canonical: `${SITE_URL}/blog/${blogSlug}`,
      faq: post.faq,
      article: post,
    };
  }

  if (path === '/') {
    return {
      title: 'JustRouter — единый AI API для GPT, Claude, DeepSeek | Оплата в рублях',
      description:
        'Один API-ключ для 150+ нейросетей: GPT-4o, Claude, Gemini, DeepSeek. Без VPN, оплата картой РФ, бесплатный старт. Альтернатива OpenRouter для России.',
      keywords:
        'ai api, gpt api россия, openrouter альтернатива, claude api, deepseek api, нейросети без vpn, ai api рубли',
      canonical: `${SITE_URL}/`,
      faq: HOME_FAQ,
      h1: 'Единый API для всех нейросетей',
      h2: 'Один ключ. Все модели. Без VPN.',
    };
  }

  if (path.startsWith('/models')) {
    const cat = getCategoryFromPath(path);
    const catLabel = CATEGORY_LABELS[cat] || 'Текстовые модели';
    const base = {
      title: 'Каталог AI-моделей — GPT-4o, Claude, DeepSeek, Gemini | JustRouter',
      description:
        '150+ AI-моделей в одном API: GPT-4o, Claude 3.5, DeepSeek R1, Gemini, Flux. Цены в рублях, без VPN. Выберите модель и начните за минуту.',
      keywords: 'gpt-4o api, claude api, deepseek r1, gemini api, каталог ai моделей',
      canonical: `${SITE_URL}/models/${cat || 'text'}`,
      h1: 'Все AI-модели — одна точка входа',
      modelGroups: ['GPT-4o и OpenAI', 'Claude 3.5', 'DeepSeek R1', 'Gemini и Google'],
    };
    if (cat && cat !== 'text') {
      base.title = `${catLabel} — AI-модели | JustRouter`;
      base.description = `${catLabel} через JustRouter API. Оплата в рублях, единый ключ, без VPN.`;
      base.canonical = `${SITE_URL}/models/${cat}`;
    }
    return base;
  }

  if (path === '/pricing') {
    return {
      title: 'Тарифы JustRouter — бесплатный старт и оплата в рублях',
      description:
        'Pay-as-you-go: платите только за использование. Бонус при регистрации, пополнение картой РФ. Без абонентской платы и скрытых комиссий.',
      keywords: 'тарифы justrouter, ai api цена, gpt api стоимость, оплата нейросети рубли',
      canonical: `${SITE_URL}/pricing`,
      faq: PRICING_FAQ,
      h1: 'Тарифы JustRouter',
      h2: 'Платите только за то, что используете',
    };
  }

  if (path === '/docs' || path === '/docs/quickstart') {
    return {
      title: 'Документация API JustRouter — быстрый старт за 5 минут',
      description:
        'REST API для GPT, Claude, DeepSeek и 150+ моделей. Примеры curl, Python, Node.js. Совместимость с OpenAI SDK. Регистрация и первый запрос.',
      keywords: 'justrouter api, ai api документация, gpt api quickstart, openai compatible api',
      canonical: path === '/docs/quickstart' ? `${SITE_URL}/docs/quickstart` : `${SITE_URL}/docs`,
      h1: 'Документация API JustRouter',
      h2: 'Быстрый старт за 5 минут',
    };
  }

  if (path === '/blog') {
    return {
      title: 'Блог JustRouter — AI API, нейросети, гайды для разработчиков',
      description:
        'Статьи про GPT-4o в России, DeepSeek R1, сравнение с OpenRouter. Гайды по API и интеграции нейросетей.',
      keywords: 'блог ai api, gpt россия, openrouter vs justrouter',
      canonical: `${SITE_URL}/blog`,
      h1: 'Блог JustRouter',
    };
  }

  if (path === '/faq') {
    return {
      title: 'Частые вопросы — JustRouter',
      description: 'Ответы на популярные вопросы о JustRouter: оплата, модели, API, аккаунт, подписка и технические детали.',
      keywords: 'faq, частые вопросы, justrouter, оплата, api, нейросети',
      canonical: `${SITE_URL}/faq`,
      h1: 'Частые вопросы',
    };
  }

  const landing = LANDING_PAGES[path];
  if (landing) {
    return {
      title: landing.title,
      description: landing.description,
      keywords: landing.keywords,
      canonical: `${SITE_URL}${path}`,
      faq: landing.faq,
      h1: landing.h1,
    };
  }

  const noindex =
    path.startsWith('/admin') ||
    path.startsWith('/account') ||
    path.startsWith('/legal');

  return {
    title: `${SITE_NAME} — AI-сервис`,
    description: 'Единый API для нейросетей: текст, изображения, видео, аудио. Оплата в рублях.',
    canonical: `${SITE_URL}${path === '/' ? '' : path}`,
    noindex,
  };
}

export function getStaticBodyHtml(seo) {
  if (!seo) return '';

  if (seo.h1) {
    let html = `<h1>${escapeHtml(seo.h1)}</h1>`;
    if (seo.h2) html += `<p>${escapeHtml(seo.h2)}</p>`;
    if (seo.description) html += `<p>${escapeHtml(seo.description)}</p>`;
    return html;
  }

  if (seo.article) {
    const post = seo.article;
    let html = `<article><h1>${escapeHtml(post.title)}</h1><p>${escapeHtml(post.description)}</p>`;
    for (const section of post.sections || []) {
      html += `<h2>${escapeHtml(section.heading)}</h2><p>${escapeHtml(section.body)}</p>`;
    }
    html += '</article>';
    return html;
  }

  return '';
}

export function buildJsonLd(pathname, seo) {
  const path = pathname.replace(/\/$/, '') || '/';
  const blocks = [];

  if (path === '/') {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Web',
      description: seo.description,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'RUB',
        description: 'Бонус при регистрации, pay-as-you-go',
      },
    });
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
      inLanguage: 'ru-RU',
    });
    if (HOME_FAQ.length) {
      blocks.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: HOME_FAQ.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      });
    }
  }

  if (path.startsWith('/models')) {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'Каталог AI-моделей JustRouter',
      itemListElement: MODELS_TABLE_ROWS.map((row, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: row[0],
        description: row[2],
      })),
    });
  }

  const blogSlug = blogSlugFromPath(path);
  if (blogSlug) {
    const post = BLOG_POSTS[blogSlug];
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: post.description,
      datePublished: post.datePublished,
      dateModified: post.dateModified,
      author: { '@type': 'Organization', name: SITE_NAME },
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        logo: { '@type': 'ImageObject', url: DEFAULT_OG_IMAGE },
      },
      mainEntityOfPage: `${SITE_URL}/blog/${blogSlug}`,
    });
  }

  const pageFaq = seo?.faq;
  if (pageFaq?.length && path !== '/') {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: pageFaq.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    });
  }

  const breadcrumbs = buildBreadcrumbJsonLd(path);
  if (breadcrumbs) blocks.push(breadcrumbs);

  return blocks;
}

export { BLOG_POSTS, BLOG_SLUGS };
