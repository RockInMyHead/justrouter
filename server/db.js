import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'velorix.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    balance REAL DEFAULT 0,
    api_key TEXT UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    balance REAL DEFAULT 0,
    owner_user_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (owner_user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS agent_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );

  CREATE TABLE IF NOT EXISTS agent_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL,
    model_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (agent_id) REFERENCES agents(id),
    FOREIGN KEY (model_id) REFERENCES models(id)
  );

  CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    category TEXT NOT NULL,
    price REAL NOT NULL,
    context INTEGER NOT NULL,
    speed INTEGER NOT NULL,
    badge TEXT,
    color TEXT NOT NULL,
    description TEXT,
    strengths TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    model_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    is_free INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (model_id) REFERENCES models(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK(type IN ('user_payment', 'agent_payment', 'referral_bonus', 'topup', 'admin_adjustment')),
    user_id INTEGER,
    agent_id INTEGER,
    amount REAL NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );

  CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    api_key TEXT,
    base_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Seed models
const existing = db.prepare('SELECT COUNT(*) as count FROM models').get();
if (existing.count === 0) {
  const insert = db.prepare(`
    INSERT INTO models (id, name, provider, category, price, context, speed, badge, color, description, strengths)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const modelsData = [
    ['openai/gpt-5.5', 'GPT-5.5', 'OpenAI', 'text', 25, 128000, 95, '🔥 Популярная', '#10B981', 'Флагманская модель OpenAI. Лучшая в классе для сложных рассуждений, написания кода и креативных задач. Поддерживает функции, стриминг, structured output.', 'Сложные рассуждения, код, креатив'],
    ['openai/gpt-4o', 'GPT-4o', 'OpenAI', 'text', 10, 128000, 90, null, '#10B981', 'Мультимодальная модель от OpenAI. Работает с текстом и изображениями. Отличный баланс скорости и качества.', 'Мультимодальность, скорость, цена'],
    ['openai/o3', 'o3', 'OpenAI', 'text', 35, 200000, 70, '🧠 Рассуждения', '#10B981', 'Модель для глубоких рассуждений от OpenAI. Использует chain-of-thought для решения сложных задач.', 'Цепочка рассуждений, математика, наука'],
    ['anthropic/claude-opus-4.7', 'Claude Opus 4.7', 'Anthropic', 'text', 15, 200000, 85, '⭐ Лучший', '#8B5CF6', 'Самая мощная модель Anthropic. Лидирует в сложных рассуждениях, написании кода и анализе больших контекстов.', 'Рассуждения, код, безопасность'],
    ['anthropic/claude-sonnet-4.4', 'Claude Sonnet 4.4', 'Anthropic', 'text', 8, 200000, 92, null, '#8B5CF6', 'Оптимальный баланс между производительностью и скоростью.', 'Баланс, продакшн, скорость'],
    ['anthropic/claude-haiku-3.8', 'Claude Haiku 3.8', 'Anthropic', 'text', 3, 200000, 97, '⚡ Быстрый', '#8B5CF6', 'Самая быстрая модель Anthropic. Создана для задач, где важна минимальная задержка.', 'Скорость, лёгкие задачи'],
    ['google/gemini-3.1-pro', 'Gemini 3.1 Pro', 'Google', 'text', 7, 1000000, 88, '🆕 Новинка', '#3B82F6', 'Флагман Google с контекстом до 1M токенов. Мультимодальная.', 'Огромный контекст, мультимодальность'],
    ['google/gemini-3.1-flash', 'Gemini 3.1 Flash', 'Google', 'text', 0.5, 1000000, 98, null, '#3B82F6', 'Самая быстрая и дешёвая модель Google.', 'Скорость, цена, контекст'],
    ['google/gemini-3.5-pro', 'Gemini 3.5 Pro', 'Google', 'text', 12, 2000000, 82, null, '#3B82F6', 'Флагманская модель Google с самым большим контекстом.', 'Контекст, мультимодальность'],
    ['meta/llama-4', 'Llama 4', 'Meta', 'text', 0.8, 128000, 94, '🆓 Бесплатно', '#F59E0B', 'Открытая модель от Meta. Отличный выбор для экспериментов.', 'Open-source, цена'],
    ['meta/llama-4-70b', 'Llama 4 70B', 'Meta', 'text', 2.5, 128000, 88, null, '#F59E0B', 'Большая версия Llama 4 с улучшенным качеством.', 'Качество, open-source'],
    ['deepseek/deepseek-v4', 'DeepSeek V4', 'DeepSeek', 'text', 0.6, 64000, 93, '💰 Дешёвая', '#EC4899', 'Передовая модель DeepSeek. Отлично справляется с программированием и анализом данных.', 'Код, анализ данных, цена'],
    ['deepseek/deepseek-r1', 'DeepSeek R1', 'DeepSeek', 'text', 1.2, 128000, 80, null, '#EC4899', 'Модель рассуждений от DeepSeek с открытым процессом мышления.', 'Прозрачные рассуждения, логика'],
    ['mistral/mistral-large-3', 'Mistral Large 3', 'Mistral', 'text', 4, 128000, 89, null, '#14B8A6', 'Флагманская модель Mistral. Европейский стандарт качества.', 'Качество, приватность'],
    ['mistral/mistral-small-3', 'Mistral Small 3', 'Mistral', 'text', 0.4, 32000, 96, null, '#14B8A6', 'Лёгкая модель Mistral для повседневных задач.', 'Скорость, цена'],
    ['openai/dall-e-4', 'DALL-E 4', 'OpenAI', 'image', 40, 0, 75, '🎨 Изображения', '#10B981', 'Новейшая модель генерации изображений от OpenAI.', 'Качество изображений, стили'],
    ['stability/sdxl-turbo', 'SDXL Turbo', 'Stability', 'image', 3, 0, 92, null, '#F97316', 'Быстрая генерация изображений от Stability AI.', 'Скорость, цена'],
    ['recraft/recraft-v3', 'Recraft V3', 'Recraft', 'image', 5, 0, 85, null, '#A855F7', 'Модель для генерации изображений в едином стиле.', 'Стиль, брендинг'],
    ['openai/whisper-4', 'Whisper 4', 'OpenAI', 'audio', 0.3, 0, 95, '🎤 Аудио', '#10B981', 'Лучшая модель распознавания речи.', 'Точность, языки'],
    ['cartesia/sonic', 'Sonic', 'Cartesia', 'audio', 1, 0, 97, null, '#06B6D4', 'Синтез речи с естественными эмоциями.', 'Эмоции, скорость'],
    ['openai/tts-2', 'TTS 2', 'OpenAI', 'audio', 1.5, 0, 94, null, '#10B981', 'Качественный синтез речи от OpenAI.', 'Качество, голоса'],
    ['google/veo-3', 'Veo 3', 'Google', 'video', 60, 0, 60, '🎬 Видео', '#3B82F6', 'Передовая модель генерации видео от Google.', 'Качество видео, длительность'],
    ['runway/gen-4', 'Gen-4', 'Runway', 'video', 35, 0, 65, null, '#8B5CF6', 'Генерация и редактирование видео от Runway.', 'Редактирование, стили'],
    ['openai/embedding-4', 'Embedding 4', 'OpenAI', 'embedding', 0.05, 8192, 99, '📊 Эмбеддинги', '#10B981', 'Лучшая модель эмбеддингов от OpenAI.', 'Качество, размерность'],
  ];

  const insertMany = db.transaction((data) => {
    for (const m of data) insert.run(...m);
  });
  insertMany(modelsData);
}

// Seed providers
const existingProviders = db.prepare('SELECT COUNT(*) as count FROM providers').get();
if (existingProviders.count === 0) {
  const insertProvider = db.prepare('INSERT INTO providers (id, name, base_url) VALUES (?, ?, ?)');
  const providersData = [
    ['openai', 'OpenAI', 'https://api.openai.com/v1'],
    ['anthropic', 'Anthropic', 'https://api.anthropic.com/v1'],
    ['google', 'Google AI', 'https://generativelanguage.googleapis.com/v1'],
    ['meta', 'Meta', 'https://api.meta.ai/v1'],
    ['deepseek', 'DeepSeek', 'https://api.deepseek.com/v1'],
    ['mistral', 'Mistral AI', 'https://api.mistral.ai/v1'],
    ['stability', 'Stability AI', 'https://api.stability.ai/v1'],
    ['recraft', 'Recraft', 'https://api.recraft.ai/v1'],
    ['cartesia', 'Cartesia', 'https://api.cartesia.ai/v1'],
    ['runway', 'Runway', 'https://api.runwayml.com/v1'],
  ];
  const insertMany = db.transaction((data) => {
    for (const p of data) insertProvider.run(...p);
  });
  insertMany(providersData);
}

export default db;
