import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Headphones, Send, X, Loader2 } from 'lucide-react';
import { api } from './api.js';

const GUEST_TOKEN_KEY = 'justrouter_support_guest';

function getStoredGuestToken() {
  return localStorage.getItem(GUEST_TOKEN_KEY) || '';
}

function storeGuestToken(token) {
  if (token) localStorage.setItem(GUEST_TOKEN_KEY, token);
}

function roleLabel(role) {
  if (role === 'admin') return 'Оператор';
  if (role === 'assistant') return 'Помощник';
  return 'Вы';
}

function roleBubbleStyle(role) {
  if (role === 'user') {
    return {
      backgroundColor: 'rgba(245,158,11,0.22)',
      border: '1px solid rgba(251,191,36,0.35)',
    };
  }
  if (role === 'admin') {
    return {
      backgroundColor: 'rgba(59,130,246,0.18)',
      border: '1px solid rgba(96,165,250,0.35)',
    };
  }
  return {
    backgroundColor: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.08)',
  };
}

export default function SupportChat() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState(null);
  const [guestToken, setGuestToken] = useState(getStoredGuestToken());
  const [handoffToHuman, setHandoffToHuman] = useState(false);
  const [messages, setMessages] = useState([]);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const hidden = location.pathname.startsWith('/admin');

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    });
  }, []);

  const loadConversation = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getSupportConversation(guestToken || undefined);
      setConversationId(data.conversation_id);
      if (data.guest_token) {
        setGuestToken(data.guest_token);
        storeGuestToken(data.guest_token);
      }
      setHandoffToHuman(!!data.handoff_to_human);
      setMessages(data.messages || []);
      scrollToBottom();
    } catch (e) {
      setError(e.message || 'Не удалось загрузить чат');
    } finally {
      setLoading(false);
    }
  }, [guestToken, scrollToBottom]);

  useEffect(() => {
    if (open && !hidden) {
      loadConversation();
    }
  }, [open, hidden, loadConversation]);

  useEffect(() => {
    if (!open || !conversationId || hidden) return undefined;

    const poll = setInterval(async () => {
      try {
        const data = await api.getSupportMessages(conversationId, guestToken || undefined);
        setHandoffToHuman(!!data.handoff_to_human);
        setMessages(data.messages || []);
      } catch {
        // ignore polling errors
      }
    }, 5000);

    return () => clearInterval(poll);
  }, [open, conversationId, guestToken, hidden]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setSending(true);
    setError('');
    setInput('');

    try {
      const data = await api.sendSupportMessage(text, {
        conversationId,
        guestToken: guestToken || undefined,
      });
      setConversationId(data.conversation_id);
      if (data.guest_token) {
        setGuestToken(data.guest_token);
        storeGuestToken(data.guest_token);
      }
      setHandoffToHuman(!!data.handoff_to_human);
      setMessages(data.messages || []);
    } catch (err) {
      setError(err.message || 'Не удалось отправить сообщение');
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  if (hidden) return null;

  return (
    <div className="jr-helpdesk fixed bottom-5 right-5 z-[150] flex flex-col items-end gap-3">
      {open && (
        <div
          className="w-[min(100vw-2rem,380px)] h-[min(72vh,560px)] rounded-2xl overflow-hidden flex flex-col shadow-2xl"
          style={{
            backgroundColor: 'rgba(12,12,16,0.96)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(18px)',
          }}
        >
          <div
            className="px-4 py-3 flex items-center justify-between shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="size-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'rgba(245,158,11,0.18)', border: '1px solid rgba(251,191,36,0.35)' }}
              >
                <Headphones size={18} className="text-amber-300" />
              </div>
              <div>
                <div className="text-white text-sm font-medium">Техподдержка</div>
                <div className="text-white/40 text-[11px]">
                  {handoffToHuman ? 'Оператор подключён' : 'ИИ-помощник онлайн'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-white/40 hover:text-white/80 transition-colors p-1 cursor-pointer"
              aria-label="Закрыть окно помощи"
            >
              <X size={18} />
            </button>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
            {loading ? (
              <div className="flex items-center justify-center h-full text-white/30 text-xs gap-2">
                <Loader2 size={14} className="animate-spin" />
                Загрузка...
              </div>
            ) : messages.length === 0 ? (
              <div className="text-white/35 text-xs leading-relaxed px-1 py-2">
                Здравствуйте! Задайте вопрос о JustRouter — пополнении, моделях, API или аккаунте.
                Сначала ответит ИИ-помощник, при необходимости подключится оператор.
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-[92%] rounded-2xl text-sm text-white/90 whitespace-pre-wrap break-words px-3 py-2" style={roleBubbleStyle(msg.role)}>
                    <div className="text-[10px] uppercase tracking-wide text-white/35 mb-1 font-mono">
                      {roleLabel(msg.role)}
                    </div>
                    {msg.content}
                  </div>
                </div>
              ))
            )}

            {sending && (
              <div className="flex items-center gap-2 text-white/30 text-xs px-1">
                <Loader2 size={12} className="animate-spin" />
                Печатает...
              </div>
            )}
          </div>

          {error && (
            <div className="px-3 pb-1 text-red-300 text-[11px]">{error}</div>
          )}

          <form
            onSubmit={handleSend}
            className="p-3 shrink-0 flex items-end gap-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              rows={1}
              placeholder="Напишите сообщение..."
              className="flex-1 resize-none rounded-xl px-3 py-2.5 text-sm text-white outline-none max-h-28"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="size-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer"
              style={{ backgroundColor: 'rgba(245,158,11,0.28)', border: '1px solid rgba(251,191,36,0.55)' }}
              aria-label="Отправить сообщение"
            >
              {sending ? <Loader2 size={16} className="animate-spin text-amber-200" /> : <Send size={16} className="text-amber-200" />}
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="size-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.95), rgba(217,119,6,0.95))',
          border: '1px solid rgba(251,191,36,0.6)',
          boxShadow: '0 8px 32px rgba(245,158,11,0.25)',
        }}
        aria-label="Помощь JustRouter"
        title="Техподдержка"
      >
        {open ? <X size={22} className="text-black" /> : <Headphones size={22} className="text-black" />}
      </button>
    </div>
  );
}
