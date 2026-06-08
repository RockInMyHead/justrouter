import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Copy, Check, Coins, Sparkles, Code2, Wallet, Lock } from 'lucide-react';
import { api } from './api.js';
import { getToken, getSession, saveAuth } from './auth.js';
import { siteUrl } from '../shared/home-sites.js';

const panelBg = 'var(--panel-bg)';

function formatRub(amount) {
  return `${Number(amount).toLocaleString('ru-RU')} ₽`;
}

async function copyText(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  }
}

export default function SitePromptModal({ item, owned, balance, onClose, onBalanceChange, onPurchased }) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [promptLoading, setPromptLoading] = useState(false);
  const [error, setError] = useState('');
  const [isOwned, setIsOwned] = useState(owned);
  const [success, setSuccess] = useState(false);
  const [promptText, setPromptText] = useState('');

  const accent = item.previewBg || '#7b39fc';
  const canAfford = balance >= item.priceRub;

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    setIsOwned(owned);
  }, [owned]);

  useEffect(() => {
    if (!isOwned) {
      setPromptText('');
      return;
    }

    let cancelled = false;
    setPromptLoading(true);
    setError('');

    api.getSitePrompt(item.id)
      .then((data) => {
        if (!cancelled) setPromptText(data.prompt || '');
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || 'Не удалось загрузить промпт');
      })
      .finally(() => {
        if (!cancelled) setPromptLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOwned, item.id]);

  const syncBalance = (nextBalance) => {
    onBalanceChange?.(nextBalance);
    const token = getToken();
    const session = getSession();
    if (token && session) {
      saveAuth(token, { ...session, balance: nextBalance });
    }
  };

  const handleCopy = async (prompt) => {
    const text = prompt || promptText;
    const ok = await copyText(text);
    if (!ok) {
      setError('Не удалось скопировать промпт');
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handlePurchase = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.purchaseSite(item.id);
      if (result.balance != null) syncBalance(result.balance);
      if (result.prompt) setPromptText(result.prompt);
      setIsOwned(true);
      setSuccess(true);
      onPurchased?.(item.id);
      await handleCopy(result.prompt);
    } catch (e) {
      setError(e.message || 'Не удалось оплатить шаблон');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(12px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="site-prompt-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl rounded-[28px] overflow-hidden shadow-2xl"
        style={{
          backgroundColor: panelBg,
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: `0 24px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), 0 0 60px ${accent}22`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="absolute inset-x-0 top-0 h-40 pointer-events-none"
          style={{ background: `linear-gradient(180deg, ${accent}33 0%, transparent 100%)` }}
        />
        <div
          className="absolute -top-16 -right-16 size-48 rounded-full blur-3xl pointer-events-none opacity-40"
          style={{ backgroundColor: accent }}
        />

        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Закрыть"
        >
          <X size={18} />
        </button>

        <div className="relative p-6 sm:p-8">
          <div className="flex items-start gap-4 mb-6">
            <div
              className="size-14 rounded-2xl overflow-hidden shrink-0 ring-1 ring-white/10"
              style={{ backgroundColor: accent }}
            >
              <iframe
                src={siteUrl(item.id)}
                title=""
                tabIndex={-1}
                className="w-[400%] h-[400%] origin-top-left scale-[0.25] border-0 pointer-events-none"
                style={{ backgroundColor: accent }}
              />
            </div>
            <div className="min-w-0 pr-8">
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium uppercase tracking-wide mb-2"
                style={{ backgroundColor: `${accent}22`, color: 'rgba(255,255,255,0.75)' }}
              >
                <Sparkles size={12} />
                Шаблон сайта
              </div>
              <h2 id="site-prompt-title" className="text-white text-xl sm:text-2xl font-semibold leading-tight">
                {item.titleRu}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-white/40 text-xs">
                <Code2 size={12} />
                {item.stack}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <div
              className="rounded-2xl p-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center gap-2 text-white/45 text-xs mb-1">
                <Wallet size={14} />
                Цена шаблона
              </div>
              <p className="text-white text-2xl font-semibold tracking-tight">
                {item.priceRub === 0 ? (
                  <span className="text-emerald-400">Бесплатно</span>
                ) : formatRub(item.priceRub)}
              </p>
            </div>
            <div
              className="rounded-2xl p-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center gap-2 text-white/45 text-xs mb-1">
                <Coins size={14} />
                Ваш баланс
              </div>
              <p className={`text-2xl font-semibold tracking-tight ${canAfford || isOwned ? 'text-emerald-300' : 'text-amber-300'}`}>
                {formatRub(balance)}
              </p>
            </div>
          </div>

          <div className="mb-5">
            <p className="text-white/40 text-xs uppercase tracking-wide mb-2">Промпт</p>
            {isOwned ? (
              <div
                className="rounded-2xl p-4 max-h-36 overflow-y-auto text-sm leading-relaxed text-white/70"
                style={{ backgroundColor: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {promptLoading ? (
                  <span className="text-white/35">Загрузка промпта…</span>
                ) : (
                  promptText
                )}
              </div>
            ) : (
              <div
                className="relative rounded-2xl p-5 overflow-hidden"
                style={{ backgroundColor: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="space-y-2 blur-md select-none pointer-events-none opacity-40" aria-hidden>
                  <div className="h-2.5 rounded bg-white/20 w-full" />
                  <div className="h-2.5 rounded bg-white/15 w-[92%]" />
                  <div className="h-2.5 rounded bg-white/15 w-[88%]" />
                  <div className="h-2.5 rounded bg-white/10 w-[76%]" />
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-4">
                  <div
                    className="size-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: `${accent}22`, border: `1px solid ${accent}44` }}
                  >
                    <Lock size={18} className="text-white/70" />
                  </div>
                  <p className="text-white/70 text-sm font-medium">Промпт скрыт</p>
                  <p className="text-white/40 text-xs leading-relaxed">
                    Оплатите шаблон, чтобы увидеть и скопировать промпт
                  </p>
                </div>
              </div>
            )}
          </div>

          {success && (
            <div
              className="mb-4 rounded-2xl px-4 py-3 text-sm text-emerald-200"
              style={{ backgroundColor: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.22)' }}
            >
              Оплата прошла — промпт скопирован в буфер обмена.
            </div>
          )}

          {error && (
            <p className="mb-4 text-sm text-red-400/90">{error}</p>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5">
            {isOwned ? (
              <button
                type="button"
                onClick={() => handleCopy()}
                disabled={promptLoading || !promptText}
                className="inline-flex flex-1 items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-medium text-black transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)' }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Скопировано' : 'Скопировать промпт'}
              </button>
            ) : item.priceRub === 0 ? (
              <button
                type="button"
                onClick={handlePurchase}
                disabled={loading}
                className="inline-flex flex-1 items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-medium text-black transition-all duration-200 disabled:opacity-50 cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)' }}
              >
                <Sparkles size={16} />
                {loading ? 'Загрузка...' : 'Получить бесплатно'}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handlePurchase}
                  disabled={loading || !canAfford}
                  className="inline-flex flex-1 items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-medium text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  style={{
                    background: canAfford
                      ? `linear-gradient(135deg, ${accent} 0%, #7b39fc 100%)`
                      : 'rgba(255,255,255,0.08)',
                  }}
                >
                  <Coins size={16} />
                  {loading ? 'Оплата…' : `Оплатить с баланса · ${formatRub(item.priceRub)}`}
                </button>
                {!canAfford && (
                  <Link
                    to="/account"
                    onClick={onClose}
                    className="inline-flex flex-1 items-center justify-center gap-2 px-5 py-3.5 rounded-2xl text-sm font-medium text-white/80 transition-colors border border-white/10 hover:border-white/25 hover:bg-white/5"
                  >
                    Пополнить баланс
                  </Link>
                )}
              </>
            )}
          </div>

          {!isOwned && !canAfford && (
            <p className="mt-3 text-center text-white/35 text-xs">
              Не хватает {formatRub(item.priceRub - balance)} — пополните баланс в личном кабинете.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
