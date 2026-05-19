import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Plus, Copy, Check, Key, Coins, Calendar, MessageSquare, ExternalLink, ArrowLeft, Trash2, Terminal } from 'lucide-react';

const LOCAL_AGENTS_KEY = 'velorix_agents_cache';

export default function AgentsPage() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [agentName, setAgentName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);

  // Load agents from cache
  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem(LOCAL_AGENTS_KEY) || '[]');
      setAgents(cached);
    } catch { /* ignore */ }
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    if (!agentName.trim()) return setError('Введите имя агента');
    setCreating(true);

    try {
      const token = localStorage.getItem('velorix_token');
      const res = await fetch('/api/v1/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agentName.trim(),
          owner_token: token || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка создания');

      const newAgent = data.agent;
      const updated = [newAgent, ...agents];
      setAgents(updated);
      localStorage.setItem(LOCAL_AGENTS_KEY, JSON.stringify(updated));
      setAgentName('');
      setShowCreate(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const deleteAgent = (id) => {
    const updated = agents.filter(a => a.id !== id);
    setAgents(updated);
    localStorage.setItem(LOCAL_AGENTS_KEY, JSON.stringify(updated));
    if (selectedAgent?.id === id) setSelectedAgent(null);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0a' }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 sm:px-6 py-3"
        style={{
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-white/30 hover:text-white/60 transition-colors p-1 cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="text-white text-lg font-semibold tracking-tight">Мои агенты</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/api-docs')}
            className="text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 cursor-pointer"
            style={{
              color: 'rgba(255,255,255,0.6)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Terminal size={12} />
            API
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5 cursor-pointer"
            style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.9)',
            }}
          >
            <Plus size={12} />
            Создать
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 max-w-2xl mx-auto w-full space-y-4">
        {/* Create card */}
        {showCreate && (
          <div
            className="rounded-2xl p-5"
            style={{
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="size-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(16,185,129,0.1)' }}
              >
                <Bot size={18} style={{ color: '#10B981' }} />
              </div>
              <div>
                <div className="text-white text-sm font-semibold">Новый агент</div>
                <div className="text-white/30 text-[10px] font-mono">Создайте API-агента</div>
              </div>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Имя агента (например: Мой бот)"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 focus:bg-white/[0.05] transition-all duration-200 font-mono"
                autoFocus
              />
              {error && (
                <div className="text-red-400/80 text-xs font-mono bg-red-500/5 border border-red-500/10 rounded-xl px-4 py-2">
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
                  style={{
                    backgroundColor: creating ? 'rgba(255,255,255,0.05)' : '#fff',
                    color: creating ? 'rgba(255,255,255,0.3)' : '#000',
                  }}
                >
                  {creating ? 'Создание...' : 'Создать агента'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setError(''); }}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
                  style={{ color: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.05)' }}
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Agent detail view */}
        {selectedAgent && (
          <div
            className="rounded-2xl p-5"
            style={{
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="size-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'rgba(16,185,129,0.1)' }}
                >
                  <Bot size={18} style={{ color: '#10B981' }} />
                </div>
                <div>
                  <div className="text-white text-sm font-semibold">{selectedAgent.name}</div>
                  <div className="text-white/30 text-[10px] font-mono">
                    ID: {selectedAgent.id}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="text-white/30 hover:text-white/60 text-xs cursor-pointer"
              >
                Закрыть
              </button>
            </div>

            {/* API Key */}
            <div className="mb-4">
              <div className="text-white/40 text-[10px] font-mono uppercase tracking-wider mb-1.5">API-ключ (показан один раз)</div>
              <div className="flex items-center gap-2">
                <code
                  className="flex-1 text-white text-xs font-mono px-3 py-2 rounded-lg truncate"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {selectedAgent.api_key}
                </code>
                <button
                  onClick={() => copyToClipboard(selectedAgent.api_key, 'detail')}
                  className="size-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                >
                  {copiedIdx === 'detail' ? (
                    <Check size={14} style={{ color: '#10B981' }} />
                  ) : (
                    <Copy size={14} className="text-white/40" />
                  )}
                </button>
              </div>
            </div>

            {/* Agent stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <Coins size={14} className="text-white/30 mb-1" />
                <div className="text-white text-sm font-semibold">{selectedAgent.balance?.toFixed(2) || '0.00'} ₽</div>
                <div className="text-white/30 text-[10px] font-mono">Баланс</div>
              </div>
              <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <MessageSquare size={14} className="text-white/30 mb-1" />
                <div className="text-white text-sm font-semibold">{selectedAgent.total_messages || 0}</div>
                <div className="text-white/30 text-[10px] font-mono">Сообщений</div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => navigate('/api-docs')}
                className="px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                style={{ color: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.05)' }}
              >
                <Terminal size={12} />
                Документация API
                <ExternalLink size={10} />
              </button>
              <button
                onClick={() => deleteAgent(selectedAgent.id)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                style={{ color: 'rgba(239,68,68,0.6)', backgroundColor: 'rgba(239,68,68,0.08)' }}
              >
                <Trash2 size={12} />
                Удалить
              </button>
            </div>
          </div>
        )}

        {/* Agent list */}
        {agents.length === 0 && !showCreate ? (
          <div className="text-center py-16">
            <div
              className="size-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
            >
              <Bot size={28} className="text-white/20" />
            </div>
            <h3 className="text-white text-base font-semibold mb-1">Нет агентов</h3>
            <p className="text-white/30 text-xs font-mono mb-4">
              Создайте агента для доступа к API
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }}
            >
              <Plus size={14} />
              Создать агента
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map((agent, idx) => (
              <div
                key={agent.id}
                className="rounded-2xl p-4 transition-all duration-200 cursor-pointer"
                style={{
                  backgroundColor: selectedAgent?.id === agent.id
                    ? 'rgba(255,255,255,0.04)'
                    : 'rgba(255,255,255,0.02)',
                  border: selectedAgent?.id === agent.id
                    ? '1px solid rgba(255,255,255,0.1)'
                    : '1px solid rgba(255,255,255,0.06)',
                }}
                onClick={() => setSelectedAgent(agent)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="size-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'rgba(16,185,129,0.1)' }}
                  >
                    <Bot size={18} style={{ color: '#10B981' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium truncate">{agent.name}</span>
                      <span className="text-white/20 text-[10px] font-mono shrink-0">
                        #{agent.id}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-white/30 text-[11px] font-mono truncate max-w-[200px]">
                        <Key size={10} className="inline mr-1" />
                        {agent.api_key?.slice(0, 20)}...
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); copyToClipboard(agent.api_key, idx); }}
                      className="size-8 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer"
                      style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                    >
                      {copiedIdx === idx ? (
                        <Check size={12} style={{ color: '#10B981' }} />
                      ) : (
                        <Copy size={12} className="text-white/40" />
                      )}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteAgent(agent.id); }}
                      className="size-8 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer"
                      style={{ backgroundColor: 'rgba(239,68,68,0.08)' }}
                    >
                      <Trash2 size={12} style={{ color: 'rgba(239,68,68,0.5)' }} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info card */}
        <div
          className="rounded-2xl p-5"
          style={{
            backgroundColor: 'rgba(59,130,246,0.03)',
            border: '1px solid rgba(59,130,246,0.1)',
          }}
        >
          <div className="flex items-start gap-3">
            <Terminal size={16} style={{ color: '#3B82F6', marginTop: 2 }} />
            <div>
              <div className="text-white text-sm font-semibold mb-1">API для агентов</div>
              <p className="text-white/40 text-xs leading-relaxed">
                Ваши агенты могут использовать все модели через REST API.
                Передавайте API-ключ в заголовке <code style={{ color: 'rgba(255,255,255,0.6)' }}>X-Api-Key</code>.
              </p>
              <button
                onClick={() => navigate('/api-docs')}
                className="mt-3 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                style={{ color: '#3B82F6' }}
              >
                Документация
                <ExternalLink size={10} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
