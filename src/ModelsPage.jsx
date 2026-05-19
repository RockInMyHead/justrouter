import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Cpu, Banknote, TrendingUp, Zap, Star, ChevronDown, SlidersHorizontal, ArrowLeft, Coins, X as XIcon, Send, ExternalLink, Clock, MessageSquare, Info, Bot } from 'lucide-react';
import { api } from './api.js';

const MODELS = [
  // ── TEXT ──
  { id: 'openai/gpt-5.5', name: 'GPT-5.5', provider: 'OpenAI', category: 'text', price: 25, context: 128000, speed: 95, badge: '🔥 популярная', color: '#10B981', rating: { reasoning: 98, analysis: 95, accuracy: 97, creativity: 94, context: 90 }, desc: 'Флагманская модель OpenAI с глубокими рассуждениями и высокой точностью. Лучший выбор для сложных задач.' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI', category: 'text', price: 10, context: 128000, speed: 90, badge: null, color: '#10B981', rating: { reasoning: 90, analysis: 89, accuracy: 90, creativity: 91, context: 88 }, desc: 'Мультимодальная модель для текста, изображений и аудио. Оптимальный баланс цены и качества.' },
  { id: 'openai/o3', name: 'o3', provider: 'OpenAI', category: 'text', price: 35, context: 200000, speed: 70, badge: '🧠 рассуждения', color: '#10B981', rating: { reasoning: 99, analysis: 93, accuracy: 96, creativity: 80, context: 92 }, desc: 'Специализированная модель для сложных логических рассуждений и научных задач. Максимальная глубина анализа.' },
  { id: 'anthropic/claude-opus-4.7', name: 'Claude Opus 4.7', provider: 'Anthropic', category: 'text', price: 15, context: 200000, speed: 85, badge: '⭐ лучший', color: '#8B5CF6', rating: { reasoning: 97, analysis: 94, accuracy: 98, creativity: 93, context: 92 }, desc: 'Топ-модель Anthropic с выдающейся точностью и безопасностью. Идеальна для работы с большими контекстами.' },
  { id: 'anthropic/claude-sonnet-4.4', name: 'Claude Sonnet 4.4', provider: 'Anthropic', category: 'text', price: 8, context: 200000, speed: 92, badge: null, color: '#8B5CF6', rating: { reasoning: 88, analysis: 87, accuracy: 90, creativity: 85, context: 90 }, desc: 'Сбалансированная модель для повседневных задач. Быстрая и надёжная, отлично подходит для чатов.' },
  { id: 'anthropic/claude-haiku-3.8', name: 'Claude Haiku 3.8', provider: 'Anthropic', category: 'text', price: 3, context: 200000, speed: 97, badge: '⚡ быстрый', color: '#8B5CF6', rating: { reasoning: 78, analysis: 74, accuracy: 80, creativity: 76, context: 88 }, desc: 'Самая быстрая модель Anthropic для простых запросов. Минимальная задержка при максимальной экономии.' },
  { id: 'google/gemini-3.1-pro', name: 'Gemini 3.1 Pro', provider: 'Google', category: 'text', price: 7, context: 1000000, speed: 88, badge: '🆕 новинка', color: '#3B82F6', rating: { reasoning: 91, analysis: 90, accuracy: 89, creativity: 88, context: 98 }, desc: 'Мощная модель Google с огромным контекстом до 1M токенов. Отлично анализирует длинные документы.' },
  { id: 'google/gemini-3.1-flash', name: 'Gemini 3.1 Flash', provider: 'Google', category: 'text', price: 0.5, context: 1000000, speed: 98, badge: null, color: '#3B82F6', rating: { reasoning: 80, analysis: 79, accuracy: 82, creativity: 77, context: 96 }, desc: 'Молниеносная модель Google для простых задач. Самая доступная цена при большом контексте.' },
  { id: 'google/gemini-3.5-pro', name: 'Gemini 3.5 Pro', provider: 'Google', category: 'text', price: 12, context: 2000000, speed: 82, badge: null, color: '#3B82F6', rating: { reasoning: 94, analysis: 92, accuracy: 93, creativity: 89, context: 99 }, desc: 'Новейшая модель Google с контекстом 2M токенов. Продвинутые рассуждения и анализ.' },
  { id: 'meta/llama-4', name: 'Llama 4', provider: 'Meta', category: 'text', price: 0.8, context: 128000, speed: 94, badge: '🆓 бесплатно', color: '#F59E0B', rating: { reasoning: 82, analysis: 78, accuracy: 81, creativity: 79, context: 75 }, desc: 'Бесплатная open-source модель от Meta. Отличный старт для знакомства с AI без затрат.' },
  { id: 'meta/llama-4-70b', name: 'Llama 4 70B', provider: 'Meta', category: 'text', price: 2.5, context: 128000, speed: 88, badge: null, color: '#F59E0B', rating: { reasoning: 86, analysis: 83, accuracy: 85, creativity: 82, context: 78 }, desc: 'Улучшенная версия Llama 4 с 70B параметров. Более глубокие ответы за небольшую плату.' },
  { id: 'deepseek/deepseek-v4', name: 'DeepSeek V4', provider: 'DeepSeek', category: 'text', price: 0.6, context: 64000, speed: 93, badge: '💰 дешёвая', color: '#EC4899', rating: { reasoning: 89, analysis: 91, accuracy: 88, creativity: 83, context: 72 }, desc: 'Китайская модель с отличными навыками программирования. Очень низкая цена при высоком качестве.' },
  { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek', category: 'text', price: 1.2, context: 128000, speed: 80, badge: null, color: '#EC4899', rating: { reasoning: 96, analysis: 88, accuracy: 92, creativity: 78, context: 80 }, desc: 'Модель с усиленными рассуждениями от DeepSeek. Отлично справляется с математикой и логикой.' },
  { id: 'mistral/mistral-large-3', name: 'Mistral Large 3', provider: 'Mistral', category: 'text', price: 4, context: 128000, speed: 89, badge: null, color: '#14B8A6', rating: { reasoning: 85, analysis: 84, accuracy: 86, creativity: 81, context: 80 }, desc: 'Европейская модель с хорошим балансом всех навыков. Надёжный выбор для бизнес-задач.' },
  { id: 'mistral/mistral-small-3', name: 'Mistral Small 3', provider: 'Mistral', category: 'text', price: 0.4, context: 32000, speed: 96, badge: null, color: '#14B8A6', rating: { reasoning: 72, analysis: 71, accuracy: 74, creativity: 73, context: 60 }, desc: 'Лёгкая и быстрая модель для базовых задач. Максимальная скорость за минимальную цену.' },

  // ── IMAGE ──
  { id: 'openai/dall-e-4', name: 'DALL-E 4', provider: 'OpenAI', category: 'image', price: 40, context: 0, speed: 75, badge: '🎨 изображения', color: '#10B981', rating: { quality: 90, creativity: 97, detail: 92, style: 88, speed: 70 }, desc: 'Генерация изображений по текстовому описанию. Создаёт фотореалистичные и креативные картинки.' },
  { id: 'stability/sdxl-turbo', name: 'SDXL Turbo', provider: 'Stability', category: 'image', price: 3, context: 0, speed: 92, badge: null, color: '#F97316', rating: { quality: 78, creativity: 85, detail: 70, style: 82, speed: 95 }, desc: 'Быстрая генерация изображений в реальном времени. Отличный вариант для быстрых прототипов.' },
  { id: 'recraft/recraft-v3', name: 'Recraft V3', provider: 'Recraft', category: 'image', price: 5, context: 0, speed: 85, badge: null, color: '#A855F7', rating: { quality: 82, creativity: 90, detail: 85, style: 92, speed: 80 }, desc: 'Генерация векторных изображений и иконок. Лучший выбор для дизайна интерфейсов.' },

  // ── AUDIO ──
  { id: 'openai/whisper-4', name: 'Whisper 4', provider: 'OpenAI', category: 'audio', price: 0.3, context: 0, speed: 95, badge: '🎤 аудио', color: '#10B981', rating: { recognition: 96, quality: 90, accuracy: 95, languages: 92, speed: 94 }, desc: 'Распознавание речи и транскрибация аудио. Поддерживает множество языков с высокой точностью.' },
  { id: 'cartesia/sonic', name: 'Sonic', provider: 'Cartesia', category: 'audio', price: 1, context: 0, speed: 97, badge: null, color: '#06B6D4', rating: { recognition: 88, quality: 92, accuracy: 90, languages: 75, speed: 97 }, desc: 'Синтез речи с естественными голосами. Подходит для озвучки и голосовых ассистентов.' },
  { id: 'openai/tts-2', name: 'TTS 2', provider: 'OpenAI', category: 'audio', price: 1.5, context: 0, speed: 94, badge: null, color: '#10B981', rating: { recognition: 85, quality: 93, accuracy: 92, languages: 88, speed: 93 }, desc: 'Качественный синтез речи от OpenAI. Выразительные голоса с поддержкой эмоций.' },

  // ── VIDEO ──
  { id: 'google/veo-3', name: 'Veo 3', provider: 'Google', category: 'video', price: 60, context: 0, speed: 60, badge: '🎬 видео', color: '#3B82F6', rating: { quality: 88, creativity: 95, realism: 90, animation: 85, speed: 65 }, desc: 'Генерация видео по текстовому описанию. Создаёт короткие клипы с высокой креативностью.' },
  { id: 'runway/gen-4', name: 'Gen-4', provider: 'Runway', category: 'video', price: 35, context: 0, speed: 65, badge: null, color: '#8B5CF6', rating: { quality: 85, creativity: 93, realism: 88, animation: 90, speed: 68 }, desc: 'Видеогенерация от Runway с продвинутой анимацией. Идеальна для креативных проектов.' },

  // ── EMBEDDING ──
  { id: 'openai/embedding-4', name: 'Embedding 4', provider: 'OpenAI', category: 'embedding', price: 0.05, context: 8192, speed: 99, badge: '📊 эмбеддинги', color: '#10B981', rating: { accuracy: 99, speed: 98, dimension: 85, quality: 95, reliability: 98 }, desc: 'Векторные представления текста для поиска и RAG. Высочайшая точность среди эмбеддингов.' },
];

const CATEGORIES = [
  { id: 'all', label: 'Все', icon: Cpu },
  { id: 'text', label: 'Текст', icon: Zap },
  { id: 'image', label: 'Изображения', icon: Star },
  { id: 'audio', label: 'Аудио', icon: TrendingUp },
  { id: 'video', label: 'Видео', icon: ChevronDown },
  { id: 'embedding', label: 'Эмбеддинги', icon: SlidersHorizontal },
];

const PROVIDERS = ['Все', 'OpenAI', 'Anthropic', 'Google', 'Meta', 'DeepSeek', 'Mistral', 'Stability', 'Recraft', 'Cartesia', 'Runway'];

function formatPrice(price) {
  const rub = price * 80;
  if (rub < 1) return `${(rub).toFixed(2)} ₽`;
  return `${rub} ₽`;
}

function getInitials(name) {
  return name.slice(0, 2).toUpperCase();
}

const MODEL_DESCRIPTIONS = {
  'openai/gpt-5.5': { description: 'Флагманская модель OpenAI. Лучшая в классе для сложных рассуждений, написания кода и креативных задач. Поддерживает функции, стриминг, structured output.', strengths: 'Сложные рассуждения, код, креатив', contextNote: '128K токенов' },
  'openai/gpt-4o': { description: 'Мультимодальная модель от OpenAI. Работает с текстом и изображениями. Отличный баланс скорости и качества. Самая популярная модель для повседневных задач.', strengths: 'Мультимодальность, скорость, цена', contextNote: '128K токенов' },
  'openai/o3': { description: 'Модель для глубоких рассуждений от OpenAI. Использует chain-of-thought для решения сложных задач. Идеальна для математики, логики и научных исследований.', strengths: 'Цепочка рассуждений, математика, наука', contextNote: '200K токенов' },
  'deepseek/deepseek-v4': { description: 'Передовая модель DeepSeek. Показывает впечатляющие результаты при низкой стоимости. Отлично справляется с программированием и анализом данных.', strengths: 'Код, анализ данных, цена', contextNote: '64K токенов' },
  'deepseek/deepseek-r1': { description: 'Модель рассуждений от DeepSeek с открытым процессом мышления. Прозрачная логика и высокое качество ответов на сложные вопросы.', strengths: 'Прозрачные рассуждения, логика', contextNote: '128K токенов' },
};

for (const m of [
  { id: 'anthropic/claude-opus-4.7', desc: 'Самая мощная модель Anthropic. Лидирует в сложных рассуждениях, написании кода и анализе больших контекстов. Безопасность на первом месте.', s: 'Рассуждения, код, безопасность', c: '200K токенов' },
  { id: 'anthropic/claude-sonnet-4.4', desc: 'Оптимальный баланс между производительностью и скоростью. Отлично подходит для продакшн-нагрузок с большим объёмом запросов.', s: 'Баланс, продакшн, скорость', c: '200K токенов' },
  { id: 'anthropic/claude-haiku-3.8', desc: 'Самая быстрая модель Anthropic. Создана для задач, где важна минимальная задержка. Мгновенные ответы.', s: 'Скорость, лёгкие задачи', c: '200K токенов' },
  { id: 'google/gemini-3.1-pro', desc: 'Флагман Google с контекстом до 1M токенов. Мультимодальная — обрабатывает текст, изображения, аудио и видео.', s: 'Огромный контекст, мультимодальность', c: '1M токенов' },
  { id: 'google/gemini-3.1-flash', desc: 'Самая быстрая и дешёвая модель Google. Контекст 1M токенов по минимальной цене.', s: 'Скорость, цена, контекст', c: '1M токенов' },
]) {
  MODEL_DESCRIPTIONS[m.id] = { description: m.desc, strengths: m.s, contextNote: m.c };
}

function ModelModal({ model, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [freeRequests, setFreeRequests] = useState(10);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const chatRef = useRef(null);
  const navigate = useNavigate();
  const info = MODEL_DESCRIPTIONS[model.id];

  useEffect(() => {
    api.getFreeRemaining(model.id).then((r) => {
      setFreeRequests(r.free_remaining);
    }).catch(() => {});
    api.getMessages(model.id).then((msgs) => setMessages(msgs)).catch(() => {});
    const s = JSON.parse(localStorage.getItem('velorix_session') || 'null');
    if (s) setBalance(s.balance);
  }, [model.id]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    if (freeRequests <= 0 && balance <= 0) {
      setMessages((prev) => [...prev, { role: 'user', content: input }, { role: 'assistant', content: 'Недостаточно средств. Бесплатные запросы закончились — пополните баланс.' }]);
      setInput('');
      return;
    }

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const result = await api.sendMessage(model.id, userMsg);
      setMessages((prev) => [...prev, { role: 'assistant', content: result.response }]);
      setFreeRequests(result.free_remaining);
      setBalance(result.balance);
      localStorage.setItem('velorix_session', JSON.stringify({ ...JSON.parse(localStorage.getItem('velorix_session') || '{}'), balance: result.balance }));
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: `Ошибка: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6"
      style={{
        backgroundColor: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl h-[85vh] sm:h-[80vh] rounded-2xl flex flex-col lg:flex-row overflow-hidden"
        style={{
          backgroundColor: '#080808',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left - Model Info */}
        <div className="lg:w-[320px] shrink-0 p-5 sm:p-6 overflow-y-auto" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-white text-sm font-semibold">{model.name}</h3>
              <span className="text-white/30 text-[11px] font-mono">{model.id}</span>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors p-1 cursor-pointer">
              <XIcon size={18} />
            </button>
          </div>

          <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.04)' }} className="mb-4" />

          {/* Description */}
          {model.desc && (
            <p className="text-xs leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {model.desc}
            </p>
          )}

          {/* Stats */}
          <div className="space-y-3 mb-5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/30">Provider</span>
              <span className="text-white/60">{model.provider}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/30">Цена</span>
              <span className="text-white/60">{formatPrice(model.price)}/M токенов</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/30">Контекст</span>
              <span className="text-white/60">{info?.contextNote || `${(model.context / 1000).toFixed(0)}K`}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/30">Скорость</span>
              <span className="text-white/60">{model.speed}/100</span>
            </div>
          </div>

          {/* Ratings */}
          <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.04)' }} className="mb-4" />
          <span className="text-white/30 text-[10px] font-mono uppercase tracking-wider block mb-3">Ratings</span>
          <div className="space-y-2 mb-5">
            {getRatingCats(model.category).map((cat) => (
              <div key={cat.key} className="flex items-center gap-2">
                <span className="text-[10px] font-mono w-24 shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>{cat.label}</span>
                <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${model.rating?.[cat.key] || 0}%`, backgroundColor: cat.color }}
                  />
                </div>
                <span className="text-[11px] font-mono w-7 text-right" style={{ color: 'rgba(255,255,255,0.4)' }}>{model.rating?.[cat.key] || 0}</span>
              </div>
            ))}
          </div>

          {info && (
            <>
              <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.04)' }} className="mb-4" />
              <div className="space-y-3">
                <div>
                  <span className="text-white/30 text-[10px] font-mono uppercase tracking-wider block mb-1.5">Описание</span>
                  <p className="text-white/50 text-xs leading-relaxed">{info.description}</p>
                </div>
                <div>
                  <span className="text-white/30 text-[10px] font-mono uppercase tracking-wider block mb-1.5">Сильные стороны</span>
                  <p className="text-white/50 text-xs">{info.strengths}</p>
                </div>
              </div>
            </>
          )}

          <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.04)' }} className="my-4" />

          <button
            onClick={() => { onClose(); navigate('/models'); }}
            className="w-full py-2 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer hover:opacity-80 "
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <ExternalLink size={12} className="inline mr-1.5" />
            Все модели
          </button>
        </div>

        {/* Right - Chat */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Chat header */}
          <div
            className="flex items-center justify-between px-4 sm:px-5 py-3 shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2">
              <MessageSquare size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
              <span className="text-white/50 text-xs font-mono">Чат с {model.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={11} style={{ color: freeRequests > 0 ? '#10B981' : 'rgba(255,255,255,0.3)' }} />
              <span
                className="text-xs font-mono"
                style={{ color: freeRequests > 0 ? 'rgba(16,185,129,0.7)' : 'rgba(255,255,255,0.3)' }}
              >
                {freeRequests}/10 бесплатно
              </span>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={chatRef}
            className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.05) transparent',
            }}
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-10">
                <div
                  className="size-12 rounded-2xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${model.color}15` }}
                >
                  <Info size={22} style={{ color: model.color }} />
                </div>
                <p className="text-white/40 text-sm font-medium mb-1">{model.name}</p>
                <p className="text-white/20 text-xs font-mono max-w-xs">
                  У вас {freeRequests} бесплатных запросов. Задайте вопрос — ответ имитирует работу модели.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'text-white'
                      : 'text-white/70'
                  }`}
                  style={{
                    backgroundColor: msg.role === 'user' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                    border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="rounded-xl px-3.5 py-3 text-sm" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex gap-1">
                    <div className="size-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="size-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="size-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 sm:p-4 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={freeRequests > 0 ? 'Напишите сообщение...' : 'Бесплатные запросы закончились'}
                className="flex-1 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 outline-none transition-all font-mono"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              />
              <button
                onClick={handleSend}
                className="px-3.5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed "
                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                disabled={loading || !input.trim()}
              >
                <Send size={16} style={{ color: loading || !input.trim() ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)' }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const RATING_CATS_BY_CATEGORY = {
  text: [
    { key: 'reasoning', label: 'Рассуждение', color: '#8B5CF6' },
    { key: 'analysis', label: 'Анализ', color: '#3B82F6' },
    { key: 'accuracy', label: 'Точность', color: '#10B981' },
    { key: 'creativity', label: 'Креативность', color: '#F59E0B' },
    { key: 'context', label: 'Контекст', color: '#EC4899' },
  ],
  image: [
    { key: 'quality', label: 'Качество', color: '#8B5CF6' },
    { key: 'creativity', label: 'Креативность', color: '#F59E0B' },
    { key: 'detail', label: 'Детализация', color: '#3B82F6' },
    { key: 'style', label: 'Стиль', color: '#EC4899' },
    { key: 'speed', label: 'Скорость', color: '#10B981' },
  ],
  audio: [
    { key: 'recognition', label: 'Распознавание', color: '#8B5CF6' },
    { key: 'quality', label: 'Качество', color: '#10B981' },
    { key: 'accuracy', label: 'Точность', color: '#3B82F6' },
    { key: 'languages', label: 'Языки', color: '#F59E0B' },
    { key: 'speed', label: 'Скорость', color: '#EC4899' },
  ],
  video: [
    { key: 'quality', label: 'Качество', color: '#10B981' },
    { key: 'creativity', label: 'Креативность', color: '#F59E0B' },
    { key: 'realism', label: 'Реализм', color: '#8B5CF6' },
    { key: 'animation', label: 'Анимация', color: '#3B82F6' },
    { key: 'speed', label: 'Скорость', color: '#EC4899' },
  ],
  embedding: [
    { key: 'accuracy', label: 'Точность', color: '#10B981' },
    { key: 'speed', label: 'Скорость', color: '#3B82F6' },
    { key: 'dimension', label: 'Размерность', color: '#8B5CF6' },
    { key: 'quality', label: 'Качество', color: '#F59E0B' },
    { key: 'reliability', label: 'Надёжность', color: '#EC4899' },
  ],
};

function getRatingCats(category) {
  return RATING_CATS_BY_CATEGORY[category] || RATING_CATS_BY_CATEGORY.text;
}

function RatingBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] w-20 font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] font-mono w-6 text-right" style={{ color: 'rgba(255,255,255,0.35)' }}>{value}</span>
    </div>
  );
}

function ModelCard({ model, onSelect, onApiKey }) {
  return (
    <div
      className="group rounded-2xl p-6 transition-all duration-300 hover:-translate-y-0.5 flex flex-col cursor-pointer"
      style={{
        backgroundColor: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
      onClick={() => onSelect(model)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <h3 className="text-white text-base font-semibold truncate">{model.name}</h3>
          <span className="text-white/30 text-xs font-mono">{model.provider} · {model.id.split('/')[1]}</span>
        </div>
        {model.badge && (
          <span
            className="text-[11px] font-medium px-2.5 py-0.5 rounded-full shrink-0 ml-2"
            style={{ backgroundColor: `${model.color}15`, color: model.color, border: `1px solid ${model.color}20` }}
          >
            {model.badge}
          </span>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.04)' }} className="mb-2" />

      {/* Description */}
      {model.desc && (
        <p className="text-xs leading-relaxed mb-3 text-white/80">
          {model.desc}
        </p>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-4 text-sm mb-3">
        <div className="flex items-center gap-1">
          <Banknote size={12} className="text-white/40" />
          <span className="text-white/80">{formatPrice(model.price)}<span className="text-white/40">/M</span></span>
        </div>
        {model.context > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-white/80">{(model.context / 1000).toFixed(0)}K</span>
            <span className="text-white/40 text-[10px]">ctx</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Zap size={12} className="text-white/40" />
          <span className="text-white/80">{model.speed}</span>
        </div>
      </div>
      <div className="text-[10px] font-mono mb-3 text-white/60">
        ≈ {(model.price * 80 * 0.001).toFixed(2)} ₽ за сообщение
      </div>

      {/* Rating bars */}
      <div className="space-y-1.5 mb-4">
        {getRatingCats(model.category).map((cat) => (
          <RatingBar
            key={cat.key}
            label={cat.label}
            value={model.rating?.[cat.key] || 0}
            color={cat.color}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <span className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>{model.id}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onApiKey(model); }}
          className="text-sm font-medium px-4 py-1.5 rounded-lg transition-all duration-200 cursor-pointer hover:opacity-80 "
          style={{ backgroundColor: `${model.color}15`, color: model.color }}
        >
          API ключ
        </button>
      </div>
    </div>
  );
}

function ApiKeyModal({ model, onClose }) {
  const [copied, setCopied] = useState(false);
  const token = localStorage.getItem('velorix_token') || 'токен не найден';
  const curlExample = `curl https://api.justrouter.ru/v1/chat/completions \\
  -H "Authorization: Bearer ${token.slice(0, 16)}..." \\
  -H "Content-Type: application/json" \\
  -d '{"model": "${model.id}", "messages":[{"role":"user","content":"Привет"}]}'`;

  const handleCopy = () => {
    navigator.clipboard.writeText(token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6 sm:p-8"
        style={{
          backgroundColor: '#0a0a0a',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-lg font-semibold">API ключ</h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors p-1">
            <XIcon size={18} />
          </button>
        </div>

        <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Ваш API-ключ для модели <strong className="text-white">{model.name}</strong>. Используйте его в заголовке <code className="text-white/70">Authorization: Bearer</code>.
        </p>

        <div
          className="rounded-xl p-4 mb-4 font-mono text-xs break-all select-all"
          style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {token}
        </div>

        <div className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Пример запроса:
          <br />
          <code style={{ color: 'rgba(255,255,255,0.5)', whiteSpace: 'pre-wrap' }}>
            {curlExample}
          </code>
        </div>

        <button
          onClick={handleCopy}
          className="w-full py-3 rounded-xl text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor: copied ? '#10B981' : '#ffffff',
            color: copied ? '#fff' : '#000',
          }}
        >
          {copied ? 'Скопировано!' : 'Копировать ключ'}
        </button>
      </div>
    </div>
  );
}

export default function ModelsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [provider, setProvider] = useState('Все');
  const [sort, setSort] = useState('default');
  const [session, setSession] = useState(null);
  const [balance, setBalance] = useState(0);
  const [selectedModel, setSelectedModel] = useState(null);
  const [dbModels, setDbModels] = useState([]);
  const [apiKeyModel, setApiKeyModel] = useState(null);

  useEffect(() => {
    const s = JSON.parse(localStorage.getItem('velorix_session') || 'null');
    setSession(s);
    if (s) setBalance(s.balance);

    api.getModels().then(setDbModels).catch(() => {});

    if (s) {
      api.me().then((u) => {
        setBalance(u.balance);
        localStorage.setItem('velorix_session', JSON.stringify(u));
      }).catch(() => {});
    }
  }, []);

  const models = useMemo(() => {
    if (dbModels.length === 0) return MODELS;
    return dbModels.map((m) => {
      const local = MODELS.find((lm) => lm.id === m.id);
      if (local) return { ...m, desc: local.desc, rating: local.rating };
      return m;
    });
  }, [dbModels]);

  const filtered = useMemo(() => {
    let result = [...models];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q));
    }

    if (category !== 'all') result = result.filter((m) => m.category === category);
    if (provider !== 'Все') result = result.filter((m) => m.provider === provider);

    if (sort === 'price-asc') result.sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') result.sort((a, b) => b.price - a.price);
    else if (sort === 'speed') result.sort((a, b) => b.speed - a.speed);
    else if (sort === 'context') result.sort((a, b) => b.context - a.context);

    return result;
  }, [search, category, provider, sort]);

  const sidebarItems = [
    { id: 'models', label: 'Модели', icon: Cpu },
    { id: 'settings', label: 'Настройки', icon: SlidersHorizontal },
  ];
  const [sidebarActive, setSidebarActive] = useState('models');

  const handleSidebarClick = (id) => {
    setSidebarActive(id);
    if (id === 'models') { /* stay */ }
  };

  return (
    <div className="min-h-screen flex overflow-x-hidden" style={{ backgroundColor: '#0a0a0a' }}>
      {selectedModel && (
        <ModelModal model={selectedModel} onClose={() => setSelectedModel(null)} />
      )}
      {apiKeyModel && (
        <ApiKeyModal model={apiKeyModel} onClose={() => setApiKeyModel(null)} />
      )}

      {/* Sidebar */}
      <div
        className="w-[200px] shrink-0 hidden md:flex flex-col pt-6 pb-4 px-3"
        style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        <button
          onClick={() => navigate('/')}
          className="text-white text-lg font-semibold tracking-tight mb-8 px-3 text-left hover:opacity-80 transition-opacity cursor-pointer"
        >
          JustRouter
        </button>

        <nav className="flex flex-col gap-1 flex-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSidebarClick(item.id)}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer text-left "
              style={{
                backgroundColor: sidebarActive === item.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: sidebarActive === item.id ? '#fff' : 'rgba(255,255,255,0.4)',
              }}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium"
            style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
          >
            <Coins size={13} style={{ color: '#F59E0B' }} />
            <span className="text-white/70">{balance.toFixed(2)} ₽</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 overflow-x-hidden">
        {/* Top bar */}
        <div
          className="sticky top-0 z-40 px-5 py-3 sm:px-8 sm:py-4 md:pl-6"
          style={{
            backgroundColor: 'rgba(0,0,0,0.9)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              {/* Mobile: show logo & menu */}
              <div className="flex items-center gap-3 md:hidden">
                <button
                  onClick={() => navigate('/')}
                  className="text-white/30 hover:text-white/60 transition-colors p-1 cursor-pointer"
                >
                  <ArrowLeft size={18} />
                </button>
                <span className="text-white text-lg font-semibold tracking-tight">JustRouter</span>
              </div>
              <div className="hidden md:block" />

              <div className="flex items-center gap-3">
                {/* Balance */}
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <Coins size={13} style={{ color: '#F59E0B' }} />
                  <span className="text-white/70">{balance.toFixed(2)} ₽</span>
                </div>

                {session ? (
                  <button
                    onClick={() => navigate('/account')}
                    className="text-xs font-medium px-3 py-1.5 rounded-full text-white/80 hover:text-white transition-all duration-200 cursor-pointer "
                  >
                    Личный кабинет
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/')}
                    className="text-xs font-medium px-3 py-1.5 rounded-full text-black transition-all duration-200 cursor-pointer hover:opacity-80 "
                    style={{ backgroundColor: '#ffffff' }}
                  >
                    Войти
                  </button>
                )}
              </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.25)' }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск моделей..."
                className="w-full rounded-xl pl-9 pr-4 py-2 text-white text-sm placeholder-white/20 outline-none transition-all font-mono"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div
          className="sticky top-[88px] sm:top-[100px] md:top-[80px] z-30 px-5 sm:px-8 md:pl-6 py-3"
          style={{
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            {/* Category pills */}
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer  ${
                    category === cat.id ? 'text-white' : 'text-white/40 hover:text-white/70'
                  }`}
                  style={{
                    backgroundColor: category === cat.id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                    border: category === cat.id ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <cat.icon size={12} />
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Provider + Sort */}
            <div className="flex gap-2 w-full sm:w-auto">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-lg outline-none cursor-pointer font-mono"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
              >
                {PROVIDERS.map((p) => (
                  <option key={p} value={p} style={{ backgroundColor: '#111', color: '#fff' }}>{p === 'Все' ? 'Все провайдеры' : p}</option>
                ))}
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-lg outline-none cursor-pointer font-mono"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
              >
                <option value="default" style={{ backgroundColor: '#111', color: '#fff' }}>По умолчанию</option>
                <option value="price-asc" style={{ backgroundColor: '#111', color: '#fff' }}>Цена ↑</option>
                <option value="price-desc" style={{ backgroundColor: '#111', color: '#fff' }}>Цена ↓</option>
                <option value="speed" style={{ backgroundColor: '#111', color: '#fff' }}>Скорость</option>
                <option value="context" style={{ backgroundColor: '#111', color: '#fff' }}>Контекст</option>
              </select>
            </div>
          </div>
        </div>

        {/* Models grid */}
        <div className="px-5 sm:px-8 md:pl-6 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/30 text-xs font-mono">Найдено {filtered.length} моделей</span>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-20">
                <Cpu size={32} style={{ color: 'rgba(255,255,255,0.1)' }} className="mx-auto mb-4" />
                <p className="text-white/20 text-sm font-mono">Модели не найдены</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-5">
                {filtered.map((model) => (
                  <ModelCard key={model.id} model={model} onSelect={(m) => setSelectedModel(m)} onApiKey={(m) => setApiKeyModel(m)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
