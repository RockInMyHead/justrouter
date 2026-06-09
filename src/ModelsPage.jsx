import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Banknote, TrendingUp, Zap, Star, ChevronDown, ArrowLeft, Coins, X as XIcon, Send, ExternalLink, Clock, MessageSquare, Info, Key, Image as ImageIcon, Mic, Volume2, Square, Wand2, FileAudio, Cpu, Film } from 'lucide-react';
import { api, isAuthError } from './api.js';
import { getToken, clearAuth } from './auth.js';
import AppSidebar from './AppSidebar.jsx';
import { getVideoOptionLists, modelSupportsFrameType, videoFramesToPayload } from './videoMeta.js';
import VideoFramePicker from './VideoFramePicker.jsx';

const pageBg = 'var(--page-bg)';
const panelBg = 'var(--panel-bg)';
const softPanelBg = 'var(--soft-panel-bg)';

function formatContext(context) {
  if (!context) return '—';
  if (context >= 1_000_000) return `${(context / 1_000_000).toFixed(context % 1_000_000 === 0 ? 0 : 1)}M`;
  return `${Math.round(context / 1000)}K`;
}

function estimateRating(model) {
  const round = (value) => Math.max(0, Math.min(99, Math.round(value)));
  const tier = round(Math.min(98, 55 + Math.log10(Math.max(model.price, 0.01) + 1) * 12));
  const ctx = round(Math.min(99, 45 + Math.log10(Math.max(model.context, 1000)) * 9));
  const speed = model.speed || 80;

  if (model.category === 'image') {
    return { quality: tier, creativity: round(tier - 1), detail: round(tier - 2), style: round(tier - 3), speed };
  }
  if (model.category === 'audio') {
    return { recognition: tier, quality: round(tier - 1), accuracy: tier, languages: round(tier - 2), speed };
  }
  if (model.category === 'video') {
    return { quality: tier, creativity: round(tier - 1), realism: round(tier - 2), animation: round(tier - 3), speed };
  }
  if (model.category === 'embedding') {
    return { accuracy: round(tier + 1), speed, dimension: ctx, quality: tier, reliability: tier };
  }
  return { reasoning: tier, analysis: round(tier - 1), accuracy: tier, creativity: round(tier - 2), context: ctx };
}

function enrichModel(model) {
  const description = model.description || '';
  return {
    ...model,
    desc: description.length > 180 ? `${description.slice(0, 177)}...` : description,
    rating: estimateRating(model),
  };
}

function isFreeTierModel(model) {
  return model.id.includes(':free') || model.price === 0 || model.badge === '🆓 бесплатно';
}

function freeTierGlowStyle() {
  return {
    background: `
      radial-gradient(ellipse 120% 80% at 100% 0%, rgba(16,185,129,0.14) 0%, transparent 58%),
      radial-gradient(ellipse 90% 70% at 0% 100%, rgba(52,211,153,0.10) 0%, transparent 55%),
      linear-gradient(145deg, rgba(16,185,129,0.07) 0%, transparent 42%)
    `,
  };
}

const CATEGORIES = [
  { id: 'text', label: 'Текст', icon: Zap },
  { id: 'image', label: 'Изображения', icon: Star },
  { id: 'audio', label: 'Аудио', icon: TrendingUp },
  { id: 'video', label: 'Видео', icon: ChevronDown },
];

function formatPrice(price) {
  // price is API units → rubles
  const rub = price * 80 * 0.001; // ~rub per 1 сообщение
  if (rub < 0.01) return '< 0.01 ₽';
  if (rub < 1) return `${rub.toFixed(2)} ₽`;
  if (rub < 100) return `${rub.toFixed(1)} ₽`;
  return `${Math.round(rub)} ₽`;
}

function formatModelPrice(model) {
  if (model.category === 'audio') return `${formatPrice(model.price)}/сек`;
  if (model.category === 'image') return `${formatPrice(model.price)}/изобр`;
  if (model.category === 'video') return `${formatPrice(model.price)}/видео`;
  if (model.category === 'embedding') return `${formatPrice(model.price)}/1K`;
  return `${formatPrice(model.price)}/сообщ`;
}

function getModelToolType(model) {
  if (model.category === 'image') return 'image';
  if (model.category === 'video') return 'video';
  if (model.category === 'embedding') return 'embedding';
  if (model.category === 'audio') {
    if (model.id.includes('whisper')) return 'stt';
    return 'tts';
  }
  return 'chat';
}

function TextChatTool({ model, messages, input, setInput, freeRequests, loading, chatRef, handleSend, handleKeyDown }) {
  return (
    <>
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
    </>
  );
}

function TtsTool({ model }) {
  const [text, setText] = useState('Привет! Это пример озвучки текста через JustRouter.');
  const [voiceName, setVoiceName] = useState('');
  const [voices, setVoices] = useState([]);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis?.getVoices?.() || [];
      setVoices(availableVoices);
      if (!voiceName && availableVoices[0]) setVoiceName(availableVoices[0].name);
    };

    loadVoices();
    window.speechSynthesis?.addEventListener?.('voiceschanged', loadVoices);
    return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', loadVoices);
  }, [voiceName]);

  const speak = () => {
    if (!text.trim() || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.trim());
    const selectedVoice = voices.find((voice) => voice.name === voiceName);
    if (selectedVoice) utterance.voice = selectedVoice;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex-1 p-5 sm:p-6 overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${model.color}15` }}>
            <Volume2 size={22} style={{ color: model.color }} />
          </div>
          <div>
            <h3 className="text-white font-semibold">Озвучка текста</h3>
            <p className="text-white/40 text-xs">Введите текст, выберите голос и прослушайте результат.</p>
          </div>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full min-h-40 rounded-2xl p-4 text-white text-sm placeholder-white/20 outline-none resize-none"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          placeholder="Текст для озвучки..."
        />

        <select
          value={voiceName}
          onChange={(e) => setVoiceName(e.target.value)}
          className="w-full rounded-xl px-4 py-2.5 text-white text-sm outline-none"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {voices.map((voice) => (
            <option key={voice.name} value={voice.name} style={{ backgroundColor: '#111' }}>
              {voice.name} {voice.lang ? `(${voice.lang})` : ''}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <button onClick={speak} className="flex-1 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-85" style={{ backgroundColor: `${model.color}22`, color: model.color }}>
            <Volume2 size={16} className="inline mr-2" />
            Озвучить
          </button>
          <button onClick={() => window.speechSynthesis?.cancel()} className="px-4 py-3 rounded-xl text-white/70 text-sm" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
            Стоп
          </button>
        </div>
      </div>
    </div>
  );
}

function SttTool({ model }) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  const startRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Распознавание речи недоступно в этом браузере. Попробуйте Chrome или Safari.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      const text = Array.from(event.results).map((result) => result[0]?.transcript || '').join(' ');
      setTranscript(text);
    };
    recognition.onerror = (event) => setError(`Ошибка распознавания: ${event.error}`);
    recognition.onend = () => setRecording(false);
    recognitionRef.current = recognition;
    setError('');
    setRecording(true);
    recognition.start();
  };

  const stopRecognition = () => {
    recognitionRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="flex-1 p-5 sm:p-6 overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${model.color}15` }}>
            <Mic size={22} style={{ color: model.color }} />
          </div>
          <div>
            <h3 className="text-white font-semibold">Распознавание речи</h3>
            <p className="text-white/40 text-xs">Запишите речь с микрофона и получите текстовую транскрибацию.</p>
          </div>
        </div>

        <button
          onClick={recording ? stopRecognition : startRecognition}
          className="w-full py-4 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-85"
          style={{ backgroundColor: recording ? 'rgba(239,68,68,0.16)' : `${model.color}22`, color: recording ? '#EF4444' : model.color }}
        >
          {recording ? <Square size={16} className="inline mr-2" /> : <Mic size={16} className="inline mr-2" />}
          {recording ? 'Остановить запись' : 'Начать запись'}
        </button>

        {error && <div className="rounded-xl p-3 text-red-300 text-xs" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>{error}</div>}

        <div className="rounded-2xl p-4 min-h-44 text-white/75 text-sm whitespace-pre-wrap" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {transcript || 'Здесь появится распознанный текст...'}
        </div>
      </div>
    </div>
  );
}

function ImageTool({ model: initialModel, onBalanceChange, onLoginRequired }) {
  var [currentModel, setCurrentModel] = useState(initialModel);
  var promptState = useState('Футуристичный AI gateway в стиле минималистичного интерфейса');
  var prompt = promptState[0];
  var setPrompt = promptState[1];
  var aspectState = useState('1:1');
  var aspectRatio = aspectState[0];
  var setAspectRatio = aspectState[1];
  var sizeState = useState('1K');
  var imageSize = sizeState[0];
  var setImageSize = sizeState[1];
  var refImagesState = useState([]);
  var referenceImages = refImagesState[0];
  var setReferenceImages = refImagesState[1];
  var generatedState = useState([]);
  var generatedImages = generatedState[0];
  var setGeneratedImages = generatedState[1];
  var genTextState = useState('');
  var generatedText = genTextState[0];
  var setGeneratedText = genTextState[1];
  var loadingState = useState(false);
  var loading = loadingState[0];
  var setLoading = loadingState[1];
  var errorState = useState('');
  var error = errorState[0];
  var setError = errorState[1];
  var elapsedState = useState(0);
  var elapsed = elapsedState[0];
  var setElapsed = elapsedState[1];
  var timerRef = useRef(null);
  var [imageModels, setImageModels] = useState([]);
  var model = currentModel;

  // Load all image models from DB
  useEffect(function() {
    api.getModels({ category: 'image' }).then(function(m) {
      var enriched = m.map(function(mdl) { return enrichModel(mdl); });
      enriched.sort(function(a, b) { return a.price - b.price; });
      setImageModels(enriched);
      // Ensure current model is in the list
      if (initialModel && !enriched.some(function(e) { return e.id === initialModel.id; })) {
        setCurrentModel(enriched[0] || initialModel);
      }
    }).catch(function() {});
  }, []);

  function handleGenerate() {
    if (!prompt.trim() || !model) return;
    setLoading(true);
    setError('');
    setGeneratedImages([]);
    setGeneratedText('');
    var start = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(function() {
      setElapsed(Date.now() - start);
    }, 100);

    api.generateImage({
      model_id: model.id,
      prompt: prompt.trim(),
      aspect_ratio: aspectRatio,
      image_size: imageSize,
      reference_images: referenceImages,
    }).then(function(res) {
      if (timerRef.current) clearInterval(timerRef.current);
      setLoading(false);
      if (res.images) {
        setGeneratedImages(res.images.map(function(img) {
          return typeof img === 'string' ? img : img.url;
        }));
      }
      if (res.text) setGeneratedText(res.text);
      if (res.balance != null) {
        if (onBalanceChange) onBalanceChange(res.balance);
      }
    }).catch(function(err) {
      if (timerRef.current) clearInterval(timerRef.current);
      setLoading(false);
      if (isAuthError(err) && onLoginRequired) {
        onLoginRequired();
        return;
      }
      setError(err.message || 'Ошибка генерации');
    });
  }

  function handleFileUpload(e) {
    var files = Array.from(e.target.files || []);
    files.slice(0, 4).forEach(function(file) {
      var reader = new FileReader();
      reader.onload = function(ev) {
        setReferenceImages(function(prev) {
          if (prev.length >= 4) return prev;
          return prev.concat(ev.target.result);
        });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  function removeRefImage(idx) {
    setReferenceImages(function(prev) {
      var copy = prev.slice();
      copy.splice(idx, 1);
      return copy;
    });
  }

  return (
    <div className="flex-1 flex min-h-0" style={{ maxHeight: 'calc(100vh - 140px)' }}>
      {/* Left: model list */}
      <div className="w-48 shrink-0 overflow-y-auto p-2 space-y-1" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="text-white/30 text-[9px] font-mono uppercase tracking-wider mb-2 px-2">Модели</div>
        {imageModels.map(function(m) {
          var active = m.id === (model && model.id);
          return (
            <div
              key={m.id}
              onClick={function() { setCurrentModel(m); }}
              className={'px-2 py-2 rounded-lg text-xs cursor-pointer transition-all ' + (active
                ? 'text-white' : 'text-white/50 hover:text-white/80')}
              style={{
                backgroundColor: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                borderLeft: active ? '2px solid ' + m.color : '2px solid transparent',
              }}
            >
              <div className="font-medium truncate text-[11px]">{m.name}</div>
              <div className="text-white/30 text-[9px] font-mono truncate">{m.provider}</div>
              <div className="text-white/40 text-[9px] font-mono">{formatModelPrice(m)}</div>
            </div>
          );
        })}
      </div>

      {/* Right: generation panel */}
      <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {/* Header + result area */}
          {generatedImages.length > 0 ? (
            <div className="mb-3 space-y-2">
              {generatedImages.map(function(url, idx) {
                return (
                  <div key={idx} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    <img src={url} className="w-full max-h-64 object-contain" alt={'generated-' + idx} />
                  </div>
                );
              })}
              {generatedText && (
                <div className="rounded-lg p-3 text-white/80 text-xs whitespace-pre-wrap" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {generatedText}
                </div>
              )}
            </div>
          ) : !loading ? (
            <div className="rounded-xl overflow-hidden relative flex items-center justify-center mb-3" style={{ height: '96px', background: 'radial-gradient(circle at 25% 20%, rgba(16,185,129,0.25), transparent 32%), radial-gradient(circle at 80% 75%, rgba(255,255,255,0.1), transparent 36%), #111', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-center">
                <ImageIcon size={20} className="mx-auto mb-1 text-white/40" />
                <p className="text-white/40 text-[11px]">Результат появится здесь</p>
              </div>
            </div>
          ) : null}

          {/* Controls */}
          <div className="space-y-2">
            {/* Current model badge */}
            {model && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: model.color + '10', border: '1px solid ' + model.color + '20' }}>
                <Zap size={10} style={{ color: model.color }} />
                <span className="text-[11px] font-medium" style={{ color: model.color + 'dd' }}>{model.name}</span>
                <span className="text-white/30 text-[9px] font-mono ml-auto">{formatModelPrice(model)}</span>
              </div>
            )}

            <textarea
              value={prompt}
              onChange={function(e) { setPrompt(e.target.value); }}
              className="w-full min-h-[52px] max-h-20 rounded-xl px-3 py-2 text-white text-xs placeholder-white/20 outline-none resize-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              placeholder="Промпт для изображения..."
              rows={2}
            />

            {/* Reference images + controls row */}
            <div className="flex items-center gap-2">
              {referenceImages.length > 0 && (
                <div className="flex gap-1">
                  {referenceImages.map(function(url, idx) {
                    return (
                      <div key={idx} className="relative size-8 rounded-md overflow-hidden shrink-0" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                        <img src={url} className="size-full object-cover" alt="ref" />
                        <button onClick={function() { removeRefImage(idx); }}
                          className="absolute inset-0 flex items-center justify-center text-[8px] cursor-pointer opacity-0 hover:opacity-100 transition-opacity"
                          style={{ backgroundColor: 'rgba(0,0,0,0.6)', color: '#fff' }}>✕</button>
                      </div>
                    );
                  })}
                </div>
              )}
              {referenceImages.length < 4 && (
                <label className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] cursor-pointer shrink-0"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                  <input type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
                  + Референс
                </label>
              )}
            </div>

            {/* Aspect ratio & size */}
            <div className="flex gap-2">
              <select value={aspectRatio} onChange={function(e) { setAspectRatio(e.target.value); }}
                className="flex-1 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none font-mono"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <option value="1:1" style={{ backgroundColor: '#111' }}>1:1</option>
                <option value="16:9" style={{ backgroundColor: '#111' }}>16:9</option>
                <option value="9:16" style={{ backgroundColor: '#111' }}>9:16</option>
                <option value="4:3" style={{ backgroundColor: '#111' }}>4:3</option>
                <option value="3:2" style={{ backgroundColor: '#111' }}>3:2</option>
              </select>
              <select value={imageSize} onChange={function(e) { setImageSize(e.target.value); }}
                className="flex-1 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none font-mono"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <option value="1K" style={{ backgroundColor: '#111' }}>1K</option>
                <option value="2K" style={{ backgroundColor: '#111' }}>2K</option>
                <option value="4K" style={{ backgroundColor: '#111' }}>4K</option>
              </select>
            </div>

            {error && (
              <div className="rounded-lg p-2 text-red-300 text-[10px]" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>{error}</div>
            )}

            <button onClick={handleGenerate} disabled={loading || !prompt.trim() || !model}
              className="w-full py-2 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-40 cursor-pointer"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff' }}>
              {loading ? (
                <span>Генерация... {elapsed > 0 ? (elapsed / 1000).toFixed(1) + 's' : ''}</span>
              ) : (
                <span><Wand2 size={14} className="inline mr-1" />Сгенерировать</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VideoTool({ model: initialModel, onBalanceChange, onLoginRequired }) {
  var [currentModel, setCurrentModel] = useState(initialModel);
  var promptState = useState('');
  var prompt = promptState[0];
  var setPrompt = promptState[1];
  var durationState = useState(8);
  var duration = durationState[0];
  var setDuration = durationState[1];
  var resolutionState = useState('720p');
  var resolution = resolutionState[0];
  var setResolution = resolutionState[1];
  var aspectState = useState('16:9');
  var aspectRatio = aspectState[0];
  var setAspectRatio = aspectState[1];
  var [firstFrame, setFirstFrame] = useState(null);
  var [lastFrame, setLastFrame] = useState(null);
  var [videoModels, setVideoModels] = useState([]);
  var loadingState = useState(false);
  var loading = loadingState[0];
  var setLoading = loadingState[1];
  var errorState = useState('');
  var error = errorState[0];
  var setError = errorState[1];
  var [jobId, setJobId] = useState(null);
  var [jobStatus, setJobStatus] = useState(null);
  var [streamUrls, setStreamUrls] = useState([]);
  var [costRub, setCostRub] = useState(null);
  var elapsedState = useState(0);
  var elapsed = elapsedState[0];
  var setElapsed = elapsedState[1];
  var timerRef = useRef(null);
  var pollRef = useRef(null);
  var model = currentModel;

  // Load all video models from DB
  useEffect(function() {
    api.getModels({ category: 'video' }).then(function(m) {
      var enriched = m.map(function(mdl) { return enrichModel(mdl); });
      enriched.sort(function(a, b) { return a.price - b.price; });
      setVideoModels(enriched);
      if (initialModel && !enriched.some(function(e) { return e.id === initialModel.id; })) {
        setCurrentModel(enriched[0] || initialModel);
      }
    }).catch(function() {});
  }, []);

  function getOptions() {
    return getVideoOptionLists(model);
  }

  function handleGenerate() {
    if (!prompt.trim() || !model) return;
    setLoading(true);
    setError('');
    setStreamUrls([]);
    setJobId(null);
    setJobStatus(null);
    setCostRub(null);
    var start = Date.now();
    setElapsed(0);
    timerRef.current = setInterval(function() {
      setElapsed(Date.now() - start);
    }, 100);

    var payload = {
      model_id: model.id,
      prompt: prompt.trim(),
      duration: duration,
      resolution: resolution,
      aspect_ratio: aspectRatio,
    };

    // Add image frames if model supports them
    if (firstFrame || lastFrame) {
      payload.images = videoFramesToPayload(firstFrame, lastFrame);
    }

    api.generateVideo(payload).then(function(res) {
      if (timerRef.current) clearInterval(timerRef.current);
      setLoading(false);
      if (res.job_id) {
        setJobId(res.job_id);
        setJobStatus(res.status || 'pending');
        if (res.balance != null && onBalanceChange) onBalanceChange(res.balance);
        // Start polling
        startPolling(res.job_id);
      }
    }).catch(function(err) {
      if (timerRef.current) clearInterval(timerRef.current);
      setLoading(false);
      if (isAuthError(err) && onLoginRequired) {
        onLoginRequired();
        return;
      }
      setError(err.message || 'Ошибка запуска генерации');
    });
  }

  function startPolling(id) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(function() {
      api.getVideoJob(id).then(function(res) {
        setJobStatus(res.status);
        if (res.stream_urls && res.stream_urls.length > 0) {
          setStreamUrls(res.stream_urls);
        }
        if (res.cost_rub != null) setCostRub(res.cost_rub);
        if (res.balance != null && onBalanceChange) onBalanceChange(res.balance);
        if (res.status === 'completed' || res.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }).catch(function() {
        // keep polling
      });
    }, 5000);
  }

  useEffect(function() {
    return function() {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  var opts = getOptions();

  return (
    <div className="flex-1 flex min-h-0" style={{ maxHeight: 'calc(100vh - 140px)' }}>
      {/* Left: model list */}
      <div className="w-48 shrink-0 overflow-y-auto p-2 space-y-1" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="text-white/30 text-[9px] font-mono uppercase tracking-wider mb-2 px-2">Модели</div>
        {videoModels.map(function(m) {
          var active = m.id === (model && model.id);
          return (
            <div
              key={m.id}
              onClick={function() { setCurrentModel(m); }}
              className={'px-2 py-2 rounded-lg text-xs cursor-pointer transition-all ' + (active
                ? 'text-white' : 'text-white/50 hover:text-white/80')}
              style={{
                backgroundColor: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                borderLeft: active ? '2px solid ' + m.color : '2px solid transparent',
              }}
            >
              <div className="font-medium truncate text-[11px]">{m.name}</div>
              <div className="text-white/30 text-[9px] font-mono truncate">{m.provider}</div>
              <div className="text-white/40 text-[9px] font-mono">{formatModelPrice(m)}</div>
            </div>
          );
        })}
      </div>

      {/* Right: generation panel */}
      <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {/* Result area */}
          {streamUrls.length > 0 ? (
            <div className="mb-3 space-y-2">
              {streamUrls.map(function(url, idx) {
                return (
                  <div key={idx} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                    <video src={url} controls className="w-full max-h-64" autoPlay={idx === 0} />
                  </div>
                );
              })}
              {costRub != null && (
                <div className="text-white/30 text-[10px] font-mono text-center">Стоимость: {costRub.toFixed(2)} ₽</div>
              )}
            </div>
          ) : jobStatus ? (
            <div className="rounded-xl overflow-hidden relative flex items-center justify-center mb-3" style={{ height: '96px', border: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
              <div className="text-center">
                <div className="size-6 rounded-full animate-spin mx-auto mb-1" style={{ border: '2px solid rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.3)' }} />
                <p className="text-white/40 text-[11px] font-mono">
                  {jobStatus === 'pending' ? 'В очереди...' : jobStatus === 'processing' ? 'Генерируем...' : jobStatus}
                </p>
                {costRub != null && <p className="text-white/30 text-[10px] font-mono mt-1">{costRub.toFixed(2)} ₽</p>}
              </div>
            </div>
          ) : !loading ? (
            <div className="rounded-xl overflow-hidden relative flex items-center justify-center mb-3" style={{ height: '96px', background: 'radial-gradient(circle at 25% 20%, rgba(244,63,94,0.25), transparent 32%), radial-gradient(circle at 80% 75%, rgba(255,255,255,0.1), transparent 36%), #111', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="text-center">
                <Film size={20} className="mx-auto mb-1 text-white/40" />
                <p className="text-white/40 text-[11px]">Результат появится здесь</p>
              </div>
            </div>
          ) : null}

          {/* Controls */}
          <div className="space-y-2">
            {/* Current model badge */}
            {model && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" style={{ backgroundColor: model.color + '10', border: '1px solid ' + model.color + '20' }}>
                <Film size={10} style={{ color: model.color }} />
                <span className="text-[11px] font-medium" style={{ color: model.color + 'dd' }}>{model.name}</span>
                <span className="text-white/30 text-[9px] font-mono ml-auto">{formatModelPrice(model)}</span>
              </div>
            )}

            <textarea
              value={prompt}
              onChange={function(e) { setPrompt(e.target.value); }}
              className="w-full min-h-[52px] max-h-20 rounded-xl px-3 py-2 text-white text-xs placeholder-white/20 outline-none resize-none"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              placeholder="Промпт для видео..."
              rows={2}
            />

            {/* Image-to-video frames */}
            {model && (
              <VideoFramePicker
                firstFrame={firstFrame}
                lastFrame={lastFrame}
                onFirstFrameChange={function(img, err) { setFirstFrame(img); if (err) setError(err); }}
                onLastFrameChange={function(img, err) { setLastFrame(img); if (err) setError(err); }}
                supportsFirst={modelSupportsFrameType(model, 'first_frame')}
                supportsLast={modelSupportsFrameType(model, 'last_frame')}
                disabled={loading}
                accentColor={model.color || '#10B981'}
                compact
              />
            )}

            {/* Duration, resolution, aspect ratio */}
            <div className="flex gap-2">
              <select value={duration} onChange={function(e) { setDuration(Number(e.target.value)); }}
                className="flex-1 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none font-mono"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {(opts.durations || [4, 6, 8]).map(function(d) {
                  return <option key={d} value={d} style={{ backgroundColor: '#111' }}>{d} сек</option>;
                })}
              </select>
              <select value={resolution} onChange={function(e) { setResolution(e.target.value); }}
                className="flex-1 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none font-mono"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {(opts.resolutions || ['720p', '1080p']).map(function(r) {
                  return <option key={r} value={r} style={{ backgroundColor: '#111' }}>{r}</option>;
                })}
              </select>
              <select value={aspectRatio} onChange={function(e) { setAspectRatio(e.target.value); }}
                className="flex-1 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none font-mono"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {(opts.aspectRatios || ['16:9', '9:16']).map(function(a) {
                  return <option key={a} value={a} style={{ backgroundColor: '#111' }}>{a}</option>;
                })}
              </select>
            </div>

            {error && (
              <div className="rounded-lg p-2 text-red-300 text-[10px]" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)' }}>{error}</div>
            )}

            <button onClick={handleGenerate} disabled={loading || !prompt.trim() || !model}
              className="w-full py-2 rounded-lg text-xs font-semibold transition-opacity disabled:opacity-40 cursor-pointer"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff' }}>
              {loading ? (
                <span>Генерация... {elapsed > 0 ? (elapsed / 1000).toFixed(1) + 's' : ''}</span>
              ) : (
                <span><Film size={14} className="inline mr-1" />Сгенерировать</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UtilityTool({ model }) {
  const labels = {
    video: ['Генерация видео', 'Опишите ролик, длительность и стиль будущего видео.'],
    embedding: ['Создание эмбеддингов', 'Введите текст, чтобы подготовить его к векторизации и поиску.'],
  };
  const [title, description] = labels[model.category] || ['Инструмент модели', 'Используйте API-ключ для подключения этой модели.'];
  const [value, setValue] = useState('');

  return (
    <div className="flex-1 p-5 sm:p-6 overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${model.color}15` }}>
            <FileAudio size={22} style={{ color: model.color }} />
          </div>
          <div>
            <h3 className="text-white font-semibold">{title}</h3>
            <p className="text-white/40 text-xs">{description}</p>
          </div>
        </div>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full min-h-40 rounded-2xl p-4 text-white text-sm placeholder-white/20 outline-none resize-none"
          style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          placeholder="Введите данные для модели..."
        />
        <div className="rounded-xl p-4 text-white/45 text-xs" style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          Для реального выполнения используйте кнопку «Получить API-ключ» и подключите модель через JustRouter API.
        </div>
      </div>
    </div>
  );
}

function ModelModal({ model, onClose, onApiKey, initialMessage = '' }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [freeRequests, setFreeRequests] = useState(10);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const chatRef = useRef(null);
  const initialSentRef = useRef(false);
  const navigate = useNavigate();
  const toolType = getModelToolType(model);
  const toolTitle = {
    chat: `Чат с ${model.name}`,
    tts: `Озвучка через ${model.name}`,
    stt: `Транскрибация через ${model.name}`,
    image: `Изображения через ${model.name}`,
    video: `Видео через ${model.name}`,
    embedding: `Эмбеддинги через ${model.name}`,
  }[toolType];

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

  const sendMessage = async (rawText) => {
    const userMsg = rawText.trim();
    if (!userMsg || loading) return;

    if (freeRequests <= 0 && balance <= 0) {
      setMessages((prev) => [...prev, { role: 'user', content: userMsg }, { role: 'assistant', content: 'Недостаточно средств. Бесплатные запросы закончились — пополните баланс.' }]);
      setInput('');
      return;
    }

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

  useEffect(() => {
    initialSentRef.current = false;
  }, [model.id]);

  useEffect(() => {
    if (!initialMessage.trim() || initialSentRef.current) return;
    initialSentRef.current = true;
    sendMessage(initialMessage);
  }, [initialMessage, model.id]);

  const handleSend = () => sendMessage(input);

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
              <span className="text-white/30">Провайдер</span>
              <span className="text-white/60">{model.provider}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/30">Цена</span>
              <span className="text-white/60">{model.category === 'audio' ? `${formatPrice(model.price)}/сек` : `${formatPrice(model.price)}/M токенов`}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/30">Контекст</span>
              <span className="text-white/60">{formatContext(model.context)}</span>
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
              <div key={cat.key} className="grid grid-cols-[116px_1fr_24px] items-center gap-2">
                <span className="text-[10px] font-mono truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{cat.label}</span>
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

          {model.strengths && (
            <>
              <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.04)' }} className="mb-4" />
              <div className="space-y-3">
                {model.description && (
                  <div>
                    <span className="text-white/30 text-[10px] font-mono uppercase tracking-wider block mb-1.5">Описание</span>
                    <p className="text-white/50 text-xs leading-relaxed">{model.description}</p>
                  </div>
                )}
                <div>
                  <span className="text-white/30 text-[10px] font-mono uppercase tracking-wider block mb-1.5">Сильные стороны</span>
                  <p className="text-white/50 text-xs">{model.strengths}</p>
                </div>
              </div>
            </>
          )}

          <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.04)' }} className="my-4" />

          <button
            onClick={() => onApiKey(model)}
            className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer hover:opacity-85 mb-2"
            style={{ backgroundColor: `${model.color}22`, color: model.color, border: `1px solid ${model.color}35` }}
          >
            <Key size={12} className="inline mr-1.5" />
            Получить API-ключ
          </button>

          <button
            onClick={() => { onClose(); navigate('/models'); }}
            className="w-full py-2 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer hover:opacity-80 "
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <ExternalLink size={12} className="inline mr-1.5" />
            Все модели
          </button>
        </div>

        {/* Right - model-specific tool */}
        <div className="flex-1 flex flex-col min-h-0">
          <div
            className="flex items-center justify-between px-4 sm:px-5 py-3 shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2">
              <MessageSquare size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
              <span className="text-white/50 text-xs font-mono">{toolTitle}</span>
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

          {toolType === 'chat' && (
            <TextChatTool
              model={model}
              messages={messages}
              input={input}
              setInput={setInput}
              freeRequests={freeRequests}
              loading={loading}
              chatRef={chatRef}
              handleSend={handleSend}
              handleKeyDown={handleKeyDown}
            />
          )}
          {toolType === 'tts' && <TtsTool model={model} />}
          {toolType === 'stt' && <SttTool model={model} />}
          {toolType === 'image' && <ImageTool model={model} balance={balance} onBalanceChange={function(b) { setBalance(b); }} />}
          {(toolType === 'video' || toolType === 'embedding') && <VideoTool model={model} balance={balance} onBalanceChange={function(b) { setBalance(b); }} />}
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
  const safeValue = Math.max(0, Math.min(99, Math.round(Number(value) || 0)));
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)_28px] items-center gap-2">
      <span className="text-[10px] font-medium truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{label}</span>
      <div className="h-1.5 rounded-full min-w-0 overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${safeValue}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] font-mono text-right tabular-nums" style={{ color: 'rgba(255,255,255,0.35)' }}>{safeValue}</span>
    </div>
  );
}

function ChatComposer({
  models,
  chatModelId,
  onChatModelChange,
  value,
  onChange,
  onSubmit,
  loading,
  session,
  onLoginRequired,
}) {
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const rootRef = useRef(null);
  const chatModels = useMemo(
    () => models.filter((model) => model.category === 'text'),
    [models],
  );
  const selected = chatModels.find((model) => model.id === chatModelId) || chatModels[0] || null;

  useEffect(() => {
    function handleClickOutside(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setModelMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = () => {
    if (!value.trim()) return;
    if (!session) {
      onLoginRequired();
      return;
    }
    if (!selected) return;
    onSubmit();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div ref={rootRef} className="relative w-full max-w-3xl mx-auto">
      <div
        className="rounded-3xl px-4 py-4 sm:px-5 sm:py-5 transition-all"
        style={{
          backgroundColor: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.28)',
        }}
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          disabled={loading}
          placeholder={loading ? 'Загружаем модели...' : 'Задайте вопрос — чат начнётся с выбранной моделью...'}
          className="w-full bg-transparent outline-none resize-none text-white text-sm sm:text-base placeholder-white/25 leading-relaxed min-h-[84px]"
        />

        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setModelMenuOpen((open) => !open)}
              disabled={!selected || loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium cursor-pointer transition-colors"
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: selected ? selected.color : 'rgba(255,255,255,0.6)',
              }}
            >
              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: selected?.color || '#10B981' }} />
              <span className="text-white/85 truncate max-w-[180px] sm:max-w-[240px]">{selected?.name || 'Модель'}</span>
              <ChevronDown size={14} className="text-white/35 shrink-0" />
            </button>

            {modelMenuOpen && chatModels.length > 0 && (
              <div
                className="absolute left-0 bottom-[calc(100%+8px)] z-50 w-[min(100vw-2rem,360px)] rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: '#101010',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
                }}
              >
                <div className="max-h-[280px] overflow-y-auto py-2">
                  {chatModels.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => {
                        onChatModelChange(model.id);
                        setModelMenuOpen(false);
                      }}
                      className="relative w-full px-4 py-2.5 text-left transition-colors cursor-pointer overflow-hidden"
                      style={{
                        backgroundColor: chatModelId === model.id ? 'rgba(255,255,255,0.06)' : 'transparent',
                      }}
                    >
                      {isFreeTierModel(model) && (
                        <div className="absolute inset-0 pointer-events-none" style={freeTierGlowStyle()} />
                      )}
                      <div className="relative flex items-center gap-2 min-w-0">
                        <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: model.color }} />
                        <span className="text-white text-sm truncate">{model.name}</span>
                        {model.badge && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: `${model.color}15`, color: model.color }}>
                            {model.badge}
                          </span>
                        )}
                      </div>
                      <div className="relative text-white/30 text-[11px] font-mono truncate mt-1 pl-4">{model.id}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex-1 hidden sm:block text-white/25 text-[11px] font-mono">
            Enter — отправить · Shift+Enter — новая строка
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!value.trim() || loading || !selected}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
            style={{ backgroundColor: '#ffffff', color: '#000000' }}
          >
            <Send size={15} />
            Начать чат
          </button>
        </div>
      </div>
    </div>
  );
}

function ModelCard({ model, onSelect, onApiKey, active = false }) {
  const isFree = isFreeTierModel(model);

  return (
    <div
      className="group relative rounded-2xl transition-all duration-300 hover:-translate-y-0.5 cursor-pointer min-w-0 overflow-hidden"
      style={{
        backgroundColor: active ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
        border: active
          ? `1px solid ${model.color}55`
          : isFree
            ? '1px solid rgba(16,185,129,0.16)'
            : '1px solid rgba(255,255,255,0.06)',
        boxShadow: active ? `0 0 0 1px ${model.color}22` : isFree ? '0 0 24px rgba(16,185,129,0.06)' : 'none',
      }}
      onClick={() => onSelect(model)}
    >
      {isFree && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={freeTierGlowStyle()}
        />
      )}
      <div className="relative z-10 p-5 sm:p-6 flex flex-col h-full">
      {/* Header: name + badge */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <h3 className="text-white text-base font-semibold truncate">{model.name}</h3>
          {model.provider && (
            <span className="text-white/30 text-xs font-mono">{model.provider} · {model.id.split('/')[1]}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {model.badge && (
            <span
              className="text-[11px] font-medium px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${model.color}15`, color: model.color, border: `1px solid ${model.color}20` }}
            >
              {model.badge}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onApiKey(model); }}
            className="text-white/20 hover:text-white/60 transition-colors"
            title="API ключ"
          >
            <Key size={14} />
          </button>
        </div>
      </div>

      {/* Price + stats row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm mt-1">
        <div className="flex items-center gap-1">
          <Banknote size={13} className="text-white/40" />
          <span className="text-white/90 font-semibold">{formatModelPrice(model)}</span>
        </div>
        {model.context > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-white/70 text-xs">{formatContext(model.context)}</span>
            <span className="text-white/30 text-[10px]">ctx</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Zap size={12} className="text-white/40" />
          <span className="text-white/70 text-xs">{model.speed}</span>
        </div>
      </div>

      {/* Strengths */}
      {model.strengths && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {model.strengths.split(',').slice(0, 4).map(function(s) {
            var t = s.trim();
            if (!t) return null;
            return (
              <span
                key={t}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md"
                style={{ backgroundColor: `${model.color}12`, color: model.color + 'cc' }}
              >
                {t}
              </span>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
}

function ApiKeyModal({ model, onClose }) {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const session = JSON.parse(localStorage.getItem('velorix_session') || 'null');
  const apiKey = session?.api_key || '';
  const curlExample = `curl https://justrouter.ru/api/v1/chat \\
  -H "X-Api-Key: ${apiKey ? `${apiKey.slice(0, 16)}...` : 'jr_<ваш_ключ>'}" \\
  -H "Content-Type: application/json" \\
  -d '{"model_id": "${model.id}", "content": "Привет"}'`;

  const handleCopy = () => {
    if (!apiKey) {
      navigate('/');
      return;
    }

    navigator.clipboard.writeText(apiKey).then(() => {
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
          Ваш API-ключ для модели <strong className="text-white">{model.name}</strong>. Используйте его в заголовке <code className="text-white/70">X-Api-Key</code>.
        </p>

        <div
          className="rounded-xl p-4 mb-4 font-mono text-xs break-all select-all"
          style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {apiKey || 'Войдите или зарегистрируйтесь, чтобы получить API-ключ'}
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
          {copied ? 'Скопировано!' : (apiKey ? 'Копировать ключ' : 'Войти и получить ключ')}
        </button>
      </div>
    </div>
  );
}

export default function ModelsPage() {
  var navigate = useNavigate();
  var modelSearchState = useState('');
  var modelSearch = modelSearchState[0];
  var setModelSearch = modelSearchState[1];
  var chatDraftState = useState('');
  var chatDraft = chatDraftState[0];
  var setChatDraft = chatDraftState[1];
  var chatModelIdState = useState('');
  var chatModelId = chatModelIdState[0];
  var setChatModelId = chatModelIdState[1];
  var modalInitialMessageState = useState('');
  var modalInitialMessage = modalInitialMessageState[0];
  var setModalInitialMessage = modalInitialMessageState[1];
  var categoryState = useState('all');
  var category = categoryState[0];
  var setCategory = categoryState[1];
  var providerState = useState('Все');
  var provider = providerState[0];
  var setProvider = providerState[1];
  var sortState = useState('default');
  var sort = sortState[0];
  var setSort = sortState[1];
  var sessionState = useState(null);
  var session = sessionState[0];
  var setSession = sessionState[1];
  var balanceState = useState(0);
  var balance = balanceState[0];
  var setBalance = balanceState[1];
  var selectedModelState = useState(null);
  var selectedModel = selectedModelState[0];
  var setSelectedModel = selectedModelState[1];
  var dbModelsState = useState([]);
  var dbModels = dbModelsState[0];
  var setDbModels = dbModelsState[1];
  var modelsLoadingState = useState(true);
  var modelsLoading = modelsLoadingState[0];
  var setModelsLoading = modelsLoadingState[1];
  var apiKeyModelState = useState(null);
  var apiKeyModel = apiKeyModelState[0];
  var setApiKeyModel = apiKeyModelState[1];
  var pickedModelIdState = useState('');
  var pickedModelId = pickedModelIdState[0];
  var setPickedModelId = pickedModelIdState[1];
  var authValidatedState = useState(false);
  var authValidated = authValidatedState[0];
  var setAuthValidated = authValidatedState[1];
  var imageToolModelIdState = useState('');
  var imageToolModelId = imageToolModelIdState[0];
  var setImageToolModelId = imageToolModelIdState[1];
  var videoToolModelIdState = useState('');
  var videoToolModelId = videoToolModelIdState[0];
  var setVideoToolModelId = videoToolModelIdState[1];

  useEffect(function() {
    var token = getToken();
    if (!token) {
      clearAuth();
      setSession(null);
      setBalance(0);
      setAuthValidated(true);
    } else {
      var s = JSON.parse(localStorage.getItem('velorix_session') || 'null');
      setSession(s);
      if (s) setBalance(s.balance);

      if (s) {
        api.me().then(function(u) {
          setBalance(u.balance);
          localStorage.setItem('velorix_session', JSON.stringify(u));
        }).catch(function() {});
      }
      setAuthValidated(true);
    }

    // Load models regardless of auth status
    api.getModels()
      .then(setDbModels)
      .catch(function() {})
      .finally(function() { setModelsLoading(false); });
  }, []);

  var models = useMemo(function() { return dbModels.map(enrichModel); }, [dbModels]);

  useEffect(function() {
    if (chatModelId || models.length === 0) return;
    var preferred = models.find(function(m) { return m.id === 'openai/gpt-4o'; })
      || models.find(function(m) { return m.category === 'text'; })
      || models[0];
    if (preferred) setChatModelId(preferred.id);
  }, [models, chatModelId]);

  useEffect(function() {
    if (category === 'image' && models.length > 0) {
      var imgs = models.filter(function(m) { return m.category === 'image'; });
      if (imgs.length > 0 && !imgs.some(function(m) { return m.id === imageToolModelId; })) {
        imgs.sort(function(a, b) { return a.price - b.price; });
        setImageToolModelId(imgs[0].id);
      }
    } else if (category !== 'image') {
      setImageToolModelId('');
    }
  }, [category, models]);

  var providerOptions = useMemo(function() {
    var names = [...new Set(models.map(function(m) { return m.provider; }))].sort(function(a, b) { return a.localeCompare(b, 'ru'); });
    return ['Все', ...names];
  }, [models]);

  var filtered = useMemo(function() {
    var result = [...models];

    if (modelSearch) {
      var q = modelSearch.toLowerCase();
      result = result.filter(function(m) { return m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q); });
    }

    if (category !== 'all') result = result.filter(function(m) { return m.category === category; });
    if (provider !== 'Все') result = result.filter(function(m) { return m.provider === provider; });

    if (sort === 'price-asc') result.sort(function(a, b) { return a.price - b.price; });
    else if (sort === 'price-desc') result.sort(function(a, b) { return b.price - a.price; });
    else if (sort === 'speed') result.sort(function(a, b) { return b.speed - a.speed; });
    else if (sort === 'context') result.sort(function(a, b) { return b.context - a.context; });

    return result;
  }, [modelSearch, category, provider, sort, models]);

  const startChat = () => {
    const model = models.find((item) => item.id === chatModelId);
    if (!model || !chatDraft.trim()) return;
    setModalInitialMessage(chatDraft.trim());
    setPickedModelId(model.id);
    setSelectedModel(model);
    setChatDraft('');
  };

  const closeModelModal = () => {
    setSelectedModel(null);
    setModalInitialMessage('');
  };

  return (
    <div className="min-h-screen flex overflow-x-hidden" style={{ backgroundColor: pageBg }}>
      {selectedModel && (
        <ModelModal
          model={selectedModel}
          initialMessage={modalInitialMessage}
          onClose={closeModelModal}
          onApiKey={(m) => setApiKeyModel(m)}
        />
      )}
      {apiKeyModel && (
        <ApiKeyModal model={apiKeyModel} onClose={() => setApiKeyModel(null)} />
      )}

      <AppSidebar activeItem="models" />

      {/* Main content */}
      <div className="flex-1 min-w-0 overflow-x-hidden">
        {/* Top bar */}
        <div
          className="sticky top-0 z-40 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 min-w-0"
          style={{
            backgroundColor: panelBg,
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/')}
              className="text-white/30 hover:text-white/60 transition-colors p-1 cursor-pointer md:hidden"
            >
              <ArrowLeft size={18} />
            </button>
            <span className="text-white text-lg font-semibold tracking-tight truncate">Модели</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-medium"
              style={{ backgroundColor: softPanelBg, border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Coins size={13} style={{ color: '#F59E0B' }} />
              <span className="text-white/70 whitespace-nowrap">{balance.toFixed(2)} ₽</span>
            </div>
            {session ? (
              <button
                onClick={() => navigate('/account')}
                className="hidden sm:inline-flex text-xs font-medium px-3 py-1.5 rounded-full text-white/80 hover:text-white transition-all duration-200 cursor-pointer whitespace-nowrap"
              >
                Личный кабинет
              </button>
            ) : (
              <button
                onClick={() => navigate('/')}
                className="text-xs font-medium px-3 py-1.5 rounded-full text-black transition-all duration-200 cursor-pointer hover:opacity-80 whitespace-nowrap"
                style={{ backgroundColor: '#ffffff' }}
              >
                Войти
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div
          className="sticky top-[52px] z-30 px-5 sm:px-8 md:pl-6 py-3"
          style={{
            backgroundColor: panelBg,
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

            {/* Provider + Sort + Search */}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative min-w-[220px]">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.25)' }} />
                <input
                  type="text"
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  placeholder="Поиск моделей..."
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg outline-none font-mono"
                  style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)' }}
                />
              </div>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-lg outline-none cursor-pointer font-mono"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' }}
              >
                {providerOptions.map((p) => (
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

        {/* Chat composer + grid */}
        <div className="px-5 sm:px-8 md:pl-6 py-8">
          <div className="max-w-7xl mx-auto">
            {category === 'image' || category === 'video' ? (function() {
              var catModels = models.filter(function(m) { return m.category === category; }).sort(function(a, b) { return a.price - b.price; });
              var active = catModels.find(function(m) { return m.id === (category === 'image' ? imageToolModelId : videoToolModelId); }) || catModels[0] || null;
              if (!active) return null;
              if (category === 'image') {
                return <ImageTool model={active} balance={balance} onBalanceChange={setBalance} onLoginRequired={function() { navigate('/', { state: { auth: 'login' } }); }} />;
              }
              return <VideoTool model={active} balance={balance} onBalanceChange={setBalance} onLoginRequired={function() { navigate('/', { state: { auth: 'login' } }); }} />;
            })() : (
            <div className="mb-8">
              <ChatComposer
                models={models}
                chatModelId={chatModelId}
                onChatModelChange={setChatModelId}
                value={chatDraft}
                onChange={setChatDraft}
                onSubmit={startChat}
                loading={modelsLoading}
                session={session}
                onLoginRequired={() => navigate('/')}
              />
            </div>
            )}

            <div className="flex items-center justify-between mb-4 gap-3">
              <span className="text-white/30 text-xs font-mono">Найдено {filtered.length} моделей</span>
              {modelSearch && (
                <button
                  type="button"
                  onClick={() => setModelSearch('')}
                  className="text-xs font-mono text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                >
                  Очистить поиск
                </button>
              )}
            </div>

            {modelsLoading ? (
              <div className="text-center py-20">
                <Cpu size={32} style={{ color: 'rgba(255,255,255,0.1)' }} className="mx-auto mb-4 animate-pulse" />
                <p className="text-white/20 text-sm font-mono">Загружаем модели OpenRouter...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <Cpu size={32} style={{ color: 'rgba(255,255,255,0.1)' }} className="mx-auto mb-4" />
                <p className="text-white/20 text-sm font-mono">Модели не найдены</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
                {filtered.map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    active={pickedModelId === model.id}
                    onSelect={(m) => {
                      setPickedModelId(m.id);
                      setChatModelId(m.id);
                      setSelectedModel(m);
                    }}
                    onApiKey={(m) => setApiKeyModel(m)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
