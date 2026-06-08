// ── Static blog posts (fallback / client-side) ──
var _posts = {
  'gpt4o-api-russia': {
    slug: 'gpt4o-api-russia',
    title: 'Как подключить GPT-4o API в России без VPN',
    description:
      'Пошаговая инструкция: регистрация в JustRouter, API-ключ, первый запрос к GPT-4o. Оплата в рублях, без зарубежных карт.',
    datePublished: '2026-05-20',
    dateModified: '2026-05-28',
    readMinutes: 6,
    sections: [
      {
        heading: 'Почему GPT-4o сложно подключить напрямую',
        body: `OpenAI официально не принимает российские карты, а прямой доступ к API часто блокируется или требует VPN. Для продакшена это означает нестабильность, риски для аккаунта и сложности с оплатой в долларах.

JustRouter решает эту задачу: вы работаете через единый API-ключ, а маршрутизация к GPT-4o и другим моделям происходит на нашей стороне. Оплата — в рублях, пополнение картой РФ.`,
      },
      {
        heading: 'Шаг 1: регистрация и API-ключ',
        body: `Зарегистрируйтесь на justrouter.ru и подтвердите email. В личном кабинете откройте раздел «API-ключи» и создайте ключ формата jr_*. Сохраните его — он показывается один раз.

Новым пользователям начисляется бонус на баланс, чтобы протестировать модели без предоплаты.`,
      },
      {
        heading: 'Шаг 2: первый запрос к GPT-4o',
        body: `JustRouter совместим с OpenAI-подобным форматом. Отправьте POST-запрос на /api/v1/chat с model_id нужной модели, например openai/gpt-4o:

curl -X POST https://justrouter.ru/api/v1/chat \\
  -H "X-Api-Key: jr_ваш_ключ" \\
  -H "Content-Type: application/json" \\
  -d '{"model_id": "openai/gpt-4o", "content": "Привет!"}'

Ответ придёт в JSON с полем response. Стоимость спишется с баланса по фактическому использованию токенов.`,
      },
      {
        heading: 'Шаг 3: интеграция в приложение',
        body: `В Python используйте библиотеку openai с base_url=https://justrouter.ru/api/v1 и вашим jr_* ключом. В Node.js — аналогично через fetch или официальный SDK с кастомным baseURL.

Для агентов и автоматизаций доступен отдельный ag_* ключ с балансом агента. Подробности — в документации API.`,
      },
    ],
    faq: [
      {
        question: 'Нужен ли VPN для GPT-4o через JustRouter?',
        answer: 'Нет. Запросы идут на justrouter.ru — сервис доступен из России без VPN.',
      },
      {
        question: 'Сколько стоит GPT-4o?',
        answer: 'Цена зависит от модели в каталоге — смотрите актуальную стоимость за 1M токенов на странице моделей. Оплата только за фактическое использование.',
      },
    ],
  },
  'deepseek-r1-api': {
    slug: 'deepseek-r1-api',
    title: 'DeepSeek R1 через API: reasoning-модель для разработчиков',
    description:
      'DeepSeek R1 — мощная reasoning-модель. Как вызывать её через JustRouter API, когда использовать и чем отличается от GPT-4o.',
    datePublished: '2026-05-22',
    dateModified: '2026-05-28',
    readMinutes: 5,
    sections: [
      {
        heading: 'Что такое DeepSeek R1',
        body: `DeepSeek R1 — модель с явным «рассуждением» (chain-of-thought): она показывает ход мыслей перед финальным ответом. Это полезно для математики, логики, сложного кода и многошаговых задач.

Через JustRouter вы получаете доступ к DeepSeek R1 и другим моделям DeepSeek одним API-ключом, без отдельной регистрации на зарубежных платформах.`,
      },
      {
        heading: 'Когда выбирать R1 вместо GPT-4o',
        body: `GPT-4o лучше подходит для универсального диалога, мультимодальности и быстрых ответов. DeepSeek R1 — когда нужна глубокая логика: доказательства, алгоритмы, рефакторинг сложного кода, анализ спецификаций.

Для простых чат-ботов R1 может быть избыточен и дороже по времени ответа. Для аналитики и инженерных задач — часто выигрывает по качеству рассуждений.`,
      },
      {
        heading: 'Пример запроса',
        body: `curl -X POST https://justrouter.ru/api/v1/chat \\
  -H "X-Api-Key: jr_ваш_ключ" \\
  -H "Content-Type: application/json" \\
  -d '{"model_id": "deepseek/deepseek-r1", "content": "Докажи, что √2 иррационально"}'

model_id смотрите в каталоге — названия могут обновляться. JustRouter автоматически маршрутизирует к доступному провайдеру.`,
      },
    ],
    faq: [
      {
        question: 'DeepSeek R1 доступен из России?',
        answer: 'Да, через JustRouter — без VPN и с оплатой в рублях.',
      },
    ],
  },
  'openrouter-vs-justrouter': {
    slug: 'openrouter-vs-justrouter',
    title: 'OpenRouter vs JustRouter: что выбрать в России',
    description:
      'Сравнение OpenRouter и JustRouter: оплата, VPN, поддержка, API. Когда использовать каждый сервис.',
    datePublished: '2026-05-25',
    dateModified: '2026-05-28',
    readMinutes: 7,
    sections: [
      {
        heading: 'Общее: один API, много моделей',
        body: `И OpenRouter, и JustRouter — это агрегаторы AI-моделей: один ключ, десятки провайдеров, единый формат запросов. Оба подходят разработчикам, которым не нужно держать отдельные аккаунты у OpenAI, Anthropic, Google и других.

Различия — в географии, оплате и локализации для российских пользователей.`,
      },
      {
        heading: 'Оплата и доступ из РФ',
        body: `OpenRouter ориентирован на международную аудиторию: оплата в USD, часто нужна зарубежная карта или криптовалюта. Для пользователей из России это барьер.

JustRouter создан для российского рынка: пополнение в рублях, карты РФ, понятные чеки и поддержка на русском. Не нужен VPN для доступа к сайту и API.`,
      },
      {
        heading: 'API и совместимость',
        body: `OpenRouter использует OpenAI-совместимый API с base_url openrouter.ai. JustRouter предоставляет /api/v1/chat с model_id — формат близок и миграция занимает минуты: замените URL и ключ.

Каталог моделей пересекается: GPT, Claude, Gemini, DeepSeek, генерация изображений и видео. Актуальный список — на justrouter.ru/models.`,
      },
      {
        heading: 'Когда выбрать JustRouter',
        body: `• Вы в России и хотите платить в рублях
• Нужна поддержка на русском и стабильный доступ без VPN
• Строите продукт для российской аудитории
• Нужны не только LLM, но и изображения/видео в одном сервисе

OpenRouter может быть удобнее, если вы уже за рубежом, платите в USD и интегрированы в их экосистему.`,
      },
    ],
    faq: [
      {
        question: 'Можно ли мигрировать с OpenRouter на JustRouter?',
        answer: 'Да. Замените base URL на https://justrouter.ru/api/v1, получите jr_* ключ и обновите model_id по нашему каталогу.',
      },
    ],
  },
};

// ── Populate static posts from database (server-side) ──
export function syncBlogPostsFromDb(db) {
  try {
    var rows = db.prepare("SELECT * FROM blog_posts WHERE is_published = 1").all();
    if (!rows || rows.length === 0) return;
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var content = [];
      try { content = JSON.parse(row.content); } catch {}
      var faq = [];
      try { faq = JSON.parse(row.faq); } catch {}
      _posts[row.slug] = {
        slug: row.slug,
        title: row.title,
        description: row.description || '',
        datePublished: row.date_published,
        dateModified: row.date_modified,
        readMinutes: row.read_minutes || 5,
        sections: content,
        faq: faq || [],
        author: row.author || 'JustRouter',
      };
    }
  } catch (e) {
    console.log('[blog-posts] sync from db failed:', e.message);
  }
}

export var BLOG_POSTS = _posts;
export var BLOG_SLUGS = Object.keys(_posts);
