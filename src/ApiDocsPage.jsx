import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, Check, Bot, Key, CreditCard, MessageSquare, List, User, ExternalLink, BookOpen, Globe } from 'lucide-react';

const endpoints = [
  {
    method: 'POST',
    path: '/api/v1/chat',
    title: 'Единый API чата',
    icon: Globe,
    desc: 'Универсальный эндпоинт для отправки сообщений. Работает и для пользователей, и для агентов. Просто передайте model_id. Пользователь: бесплатные первые 10 запросов к каждой модели. Агент: средства списываются с баланса.',
    auth: 'X-Api-Key (пользовательский jr_* или агентский ag_*) или Authorization: Bearer',
    request: `curl -X POST https://justrouter.ru/api/v1/chat \\
  -H "X-Api-Key: jr_<ваш_ключ_пользователя>" \\
  -H "Content-Type: application/json" \\
  -d '{"model_id": "openai/gpt-5.5", "content": "Напиши код на Python"}'`,
    response: `{
  "response": "Конечно! Вот пример на Python:...",
  "auth_type": "user",
  "is_free": true,
  "free_remaining": 9,
  "balance": 1000.00
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/agents/register',
    title: 'Создать агента',
    icon: Bot,
    desc: 'Регистрирует нового AI-агента и возвращает API-ключ.',
    request: `curl -X POST https://justrouter.ru/api/v1/agents/register \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Мой первый агент"}'`,
    response: `{
  "agent": {
    "id": 1,
    "name": "Мой первый агент",
    "api_key": "ag_abc123...",
    "balance": 0
  },
  "message": "Агент создан. Сохраните API ключ — он показывается только один раз."
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/agents/login',
    title: 'Войти по API-ключу',
    icon: Key,
    desc: 'Получить токен сессии для агента по его API-ключу.',
    request: `curl -X POST https://justrouter.ru/api/v1/agents/login \\
  -H "Content-Type: application/json" \\
  -d '{"api_key": "ag_abc123..."}'`,
    response: `{
  "token": "session_token_here",
  "agent": {
    "id": 1,
    "name": "Мой первый агент",
    "balance": 0
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/agents/me',
    title: 'Профиль агента',
    icon: User,
    desc: 'Получить данные профиля агента: имя, баланс, API-ключ, количество сообщений.',
    auth: 'X-Api-Key или Bearer',
    request: `curl https://justrouter.ru/api/v1/agents/me \\
  -H "X-Api-Key: ag_abc123..."`,
    response: `{
  "id": 1,
  "name": "Мой первый агент",
  "balance": 950.00,
  "api_key": "ag_abc123...",
  "total_messages": 5,
  "created_at": "2026-05-17 12:00:00"
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/agents/invoice?amount=500',
    title: 'Ссылка на оплату',
    icon: CreditCard,
    desc: 'Получить ссылку для пополнения баланса агента.',
    auth: 'X-Api-Key или Bearer',
    request: `curl "https://justrouter.ru/api/v1/agents/invoice?amount=500" \\
  -H "X-Api-Key: ag_abc123..."`,
    response: `{
  "invoice_url": "https://justrouter.ru/pay?agent_id=1&amount=500",
  "amount": 500,
  "agent_id": 1,
  "status": "pending"
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/agents/chat',
    title: 'Отправить сообщение',
    icon: MessageSquare,
    desc: 'Отправить сообщение от имени агента к указанной модели. Средства списываются с баланса агента.',
    auth: 'X-Api-Key или Bearer',
    request: `curl -X POST https://justrouter.ru/api/v1/agents/chat \\
  -H "X-Api-Key: ag_abc123..." \\
  -H "Content-Type: application/json" \\
  -d '{"model_id": "openai/gpt-5.5", "content": "Привет! Напиши код на Python"}'`,
    response: `{
  "response": "Здравствуйте! Я агент Мой первый агент...",
  "balance": 949.75,
  "cost": 0.25
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/agents/messages?model_id=openai/gpt-5.5',
    title: 'История сообщений',
    icon: List,
    desc: 'Получить историю сообщений агента. Можно фильтровать по model_id.',
    auth: 'X-Api-Key или Bearer',
    request: `curl "https://justrouter.ru/api/v1/agents/messages?model_id=openai/gpt-5.5" \\
  -H "X-Api-Key: ag_abc123..."`,
    response: `[
  {
    "id": 1,
    "agent_id": 1,
    "model_id": "openai/gpt-5.5",
    "role": "user",
    "content": "Привет!",
    "created_at": "2026-05-17 12:00:00"
  },
  {
    "id": 2,
    "agent_id": 1,
    "model_id": "openai/gpt-5.5",
    "role": "assistant",
    "content": "Здравствуйте! ...",
    "created_at": "2026-05-17 12:00:01"
  }
]`,
  },
  {
    method: 'GET',
    path: '/api/v1/agents/models',
    title: 'Список моделей',
    icon: List,
    desc: 'Получить список всех доступных моделей для использования агентом.',
    auth: 'X-Api-Key или Bearer',
    request: `curl https://justrouter.ru/api/v1/agents/models \\
  -H "X-Api-Key: ag_abc123..."`,
    response: `[
  {"id": "openai/gpt-5.5", "name": "GPT-5.5", "provider": "OpenAI", ...},
  {"id": "anthropic/claude-opus-4.7", "name": "Claude Opus 4.7", ...}
]`,
  },
];

function EndpointCard({ ep, index }) {
  const [copiedReq, setCopiedReq] = useState(false);
  const [copiedRes, setCopiedRes] = useState(false);

  const copyText = async (text, setter) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch {}
  };

  const methodColor = {
    GET: 'bg-emerald-500/20 text-emerald-400',
    POST: 'bg-blue-500/20 text-blue-400',
  };

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5"
      style={{
        backgroundColor: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Header */}
      <div className="p-5 sm:p-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold ${methodColor[ep.method]}`}>
            {ep.method}
          </div>
          <code className="text-white/60 text-xs font-mono truncate">{ep.path}</code>
          <div className="ml-auto">
            <ep.icon size={16} style={{ color: 'rgba(255,255,255,0.2)' }} />
          </div>
        </div>
        <h3 className="text-white text-sm font-semibold mb-1">{ep.title}</h3>
        <p className="text-white/40 text-xs leading-relaxed">{ep.desc}</p>
        {ep.auth && (
          <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono" style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: 'rgba(245,158,11,0.7)' }}>
            <Key size={10} />
            {ep.auth}
          </div>
        )}
      </div>

      {/* Request */}
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/30 text-[10px] font-mono uppercase tracking-wider">Пример запроса</span>
          <button
            onClick={() => copyText(ep.request, setCopiedReq)}
            className="flex items-center gap-1 text-[10px] font-mono transition-colors"
            style={{ color: copiedReq ? '#10B981' : 'rgba(255,255,255,0.3)' }}
          >
            {copiedReq ? <Check size={11} /> : <Copy size={11} />}
            {copiedReq ? 'Скопировано' : 'Копировать'}
          </button>
        </div>
        <pre
          className="rounded-xl p-4 text-xs leading-relaxed overflow-x-auto font-mono"
          style={{
            backgroundColor: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          {ep.request}
        </pre>

        {/* Response */}
        <div className="flex items-center justify-between mb-2 mt-4">
          <span className="text-white/30 text-[10px] font-mono uppercase tracking-wider">Пример ответа</span>
          <button
            onClick={() => copyText(ep.response, setCopiedRes)}
            className="flex items-center gap-1 text-[10px] font-mono transition-colors"
            style={{ color: copiedRes ? '#10B981' : 'rgba(255,255,255,0.3)' }}
          >
            {copiedRes ? <Check size={11} /> : <Copy size={11} />}
            {copiedRes ? 'Скопировано' : 'Копировать'}
          </button>
        </div>
        <pre
          className="rounded-xl p-4 text-xs leading-relaxed overflow-x-auto font-mono"
          style={{
            backgroundColor: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.04)',
            color: 'rgba(16,185,129,0.8)',
          }}
        >
          {ep.response}
        </pre>
      </div>
    </div>
  );
}

export default function ApiDocsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 px-5 py-3 sm:px-8 sm:py-4"
        style={{
          backgroundColor: 'rgba(0,0,0,0.9)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="text-white/30 hover:text-white/60 transition-colors p-1 cursor-pointer"
            >
              <ArrowLeft size={18} />
            </button>
            <span className="text-white text-lg font-semibold tracking-tight">API для агентов</span>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-xs font-medium px-3 py-1.5 rounded-full text-white/60 hover:text-white transition-all duration-200 cursor-pointer"
          >
            На главную
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
        {/* Intro */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <div
              className="size-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(139,92,246,0.15)' }}
            >
              <Bot size={20} style={{ color: '#8B5CF6' }} />
            </div>
            <div>
              <h1 className="text-white text-xl font-semibold">API JustRouter</h1>
              <p className="text-white/30 text-xs font-mono mt-0.5">Единый API для всех моделей · v1</p>
            </div>
          </div>

          <div
            className="rounded-2xl p-5 text-sm leading-relaxed"
            style={{
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            <p className="mb-3">
              JustRouter предоставляет единый API для всех AI-моделей. 
              Используйте один ключ для доступа к любой модели — просто меняйте параметр <code className="text-white/60">model_id</code>.
            </p>
            <p className="mb-3">
              <strong className="text-white/80">Для пользователей:</strong> ваш API-ключ начинается с <code className="text-white/60">jr_</code>.
              Первые 10 запросов к каждой модели — бесплатно.
            </p>
            <p className="mb-3">
              <strong className="text-white/80">Для агентов:</strong> создайте агента и используйте его ключ <code className="text-white/60">ag_</code>.
              Агент имеет собственный баланс и историю.
            </p>
            <p className="text-white/40 text-xs">
              Аутентификация: через заголовок <code className="text-white/60">X-Api-Key</code> (для пользователей и агентов) 
              или <code className="text-white/60">Authorization: Bearer &lt;token&gt;</code> (для пользователей).
            </p>
          </div>
        </div>

        {/* Quick start */}
        <div className="mb-10">
          <h2 className="text-white text-base font-semibold mb-4 flex items-center gap-2">
            <BookOpen size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />
            Быстрый старт
          </h2>
          <div
            className="rounded-2xl p-5"
            style={{
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <pre
              className="text-xs leading-relaxed font-mono"
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              <span className="text-white/30"># 1. Получить API-ключ в личном кабинете</span>
              <br />
              <span className="text-white/30">#    Он начинается с jr_</span>
              <br /><br />
              <span className="text-white/30"># 2. Использовать ключ для запросов к любой модели</span>
              <br />
              curl -X POST https://justrouter.ru/api/v1/chat \<br />
              <span className="ml-4">-H "X-Api-Key: jr_&lt;ваш_ключ&gt;" \</span>
              <span className="ml-4">-H "Content-Type: application/json" \</span>
              <span className="ml-4">-d '{'{'}"model_id": "openai/gpt-5.5", "content": "Напиши код!"{'}'}'</span>
              <br /><br />
              <span className="text-white/30"># 3. Агенты: создать агента и использовать его ключ</span>
              <br />
              curl -X POST https://justrouter.ru/api/v1/agents/register \<br />
              <span className="ml-4">-H "Content-Type: application/json" \</span>
              <span className="ml-4">-d '{'{'}"name": "Мой агент"{'}'}'</span>
            </pre>
          </div>
        </div>

        {/* Endpoints */}
        <h2 className="text-white text-base font-semibold mb-4 flex items-center gap-2">
          <ExternalLink size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />
          Все эндпоинты
        </h2>
        <div className="space-y-4">
          {endpoints.map((ep, i) => (
            <EndpointCard key={i} ep={ep} index={i} />
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-10 text-center">
          <p className="text-white/20 text-xs font-mono">
            JustRouter API for Agents · Все эндпоинты доступны публично · 
            <a href="https://justrouter.ru" className="text-white/40 hover:text-white/60 transition-colors ml-1">JustRouter</a>
          </p>
        </div>
      </div>
    </div>
  );
}
