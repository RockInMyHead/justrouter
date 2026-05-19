import { ArrowRight, Menu, X, Zap, Cpu, Network, Globe, Layers, Shield, TrendingUp, CheckCircle, Mail, Lock, User, X as XIcon, Bot, Coins } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './api.js';

const BG_VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_155101_f2540600-6fe9-433e-8e48-b3f4b72f0727.mp4";

const NAV_ITEMS = ['Платформа', 'Как работает', 'AI Security', 'Интеграции', 'Аналитика'];

function HamburgerButton({ open, onClick }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden relative w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300"
      style={{ backgroundColor: open ? '#1a1a1a' : 'transparent' }}
      aria-label="Toggle menu"
    >
      <span
        className="absolute transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
        style={{ opacity: open ? 0 : 1, transform: open ? 'rotate(-90deg) scale(0.5)' : 'rotate(0deg) scale(1)' }}
      >
        <Menu size={20} color="white" strokeWidth={1.5} />
      </span>
      <span
        className="absolute transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
        style={{ opacity: open ? 1 : 0, transform: open ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0.5)' }}
      >
        <X size={20} color="white" strokeWidth={1.5} />
      </span>
    </button>
  );
}

function MobileMenu({ open, onClose, onLoginClick, onRegisterClick, userName, onLogout, balance }) {
  const navigate = useNavigate();
  return (
    <>
      <div
        className="fixed inset-0 z-30 lg:hidden transition-all duration-500"
        style={{
          backdropFilter: open ? 'blur(12px)' : 'blur(0px)',
          backgroundColor: open ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0)',
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={onClose}
      />
      <div
        className="fixed top-0 left-0 right-0 z-40 lg:hidden overflow-hidden"
        style={{
          maxHeight: open ? '420px' : '0px',
          transition: 'max-height 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      >
        <div
          className="pt-20 pb-6 px-5"
          style={{ backgroundColor: 'rgba(8,8,8,0.97)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex flex-col gap-1">
            {NAV_ITEMS.map((item, i) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={(e) => { e.preventDefault(); document.getElementById(item.toLowerCase().replace(/\s+/g, '-'))?.scrollIntoView({ behavior: 'smooth' }); onClose(); }}
                className="text-white/70 hover:text-white text-base py-3 px-3 rounded-xl hover:bg-white/5 transition-all duration-200 flex items-center justify-between group"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  transitionDelay: open ? `${i * 50 + 80}ms` : '0ms',
                  opacity: open ? 1 : 0,
                  transform: open ? 'translateY(0)' : 'translateY(-8px)',
                  transition: `opacity 0.4s cubic-bezier(0.23,1,0.32,1) ${i * 50 + 80}ms, transform 0.4s cubic-bezier(0.23,1,0.32,1) ${i * 50 + 80}ms, color 0.2s, background 0.2s`,
                }}
              >
                {item}
                <ArrowRight size={14} className="opacity-0 group-hover:opacity-40 -translate-x-1 group-hover:translate-x-0 transition-all duration-200" />
              </a>
            ))}
            {/* <button
              onClick={() => { navigate('/agents'); onClose(); }}
              className="text-white/70 hover:text-white text-base py-3 px-3 rounded-xl hover:bg-white/5 transition-all duration-200 flex items-center justify-between group"
              style={{
                fontFamily: 'Inter, sans-serif',
                transitionDelay: open ? `${NAV_ITEMS.length * 50 + 80}ms` : '0ms',
                opacity: open ? 1 : 0,
                transform: open ? 'translateY(0)' : 'translateY(-8px)',
                transition: `opacity 0.4s cubic-bezier(0.23,1,0.32,1) ${NAV_ITEMS.length * 50 + 80}ms, transform 0.4s cubic-bezier(0.23,1,0.32,1) ${NAV_ITEMS.length * 50 + 80}ms, color 0.2s, background 0.2s`,
              }}
            >
              <div className="flex items-center gap-2">
                <Bot size={16} />
                Агенты
              </div>
              <ArrowRight size={14} className="opacity-0 group-hover:opacity-40 -translate-x-1 group-hover:translate-x-0 transition-all duration-200" />
            </button> */}
          </div>
          <div
            className="mt-5 pt-5"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.07)',
              transitionDelay: open ? '360ms' : '0ms',
              opacity: open ? 1 : 0,
              transform: open ? 'translateY(0)' : 'translateY(-8px)',
              transition: `opacity 0.4s cubic-bezier(0.23,1,0.32,1) 360ms, transform 0.4s cubic-bezier(0.23,1,0.32,1) 360ms`,
            }}
          >
            {userName ? (
              <div className="flex flex-col gap-2">
                <div
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <Coins size={13} style={{ color: '#F59E0B' }} />
                  <span className="text-white/70">{balance.toFixed(2)} ₽</span>
                </div>
                <button
                  onClick={() => { navigate('/account'); onClose(); }}
                  className="w-full py-3 rounded-full text-white text-sm font-medium transition-all duration-200 "
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Личный кабинет
                </button>
                <button
                  onClick={() => { onLogout(); onClose(); }}
                  className="w-full py-3 rounded-full text-white/80 text-sm font-medium transition-all duration-200 border border-white/10 hover:border-white/30"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Выйти
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => { onLoginClick(); onClose(); }}
                  className="flex-1 py-3 rounded-full text-white/80 text-sm font-medium transition-all duration-200 border border-white/10 hover:border-white/30 cursor-pointer "
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Вход
                </button>
                <button
                  onClick={() => { onRegisterClick(); onClose(); }}
                  className="flex-1 py-3 rounded-full text-black text-sm font-medium transition-all duration-300 hover:opacity-80 cursor-pointer "
                  style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#ffffff' }}
                >
                  Регистрация
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Navbar({ onLoginClick, onRegisterClick, userName, onLogout, balance }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <>
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-4 lg:px-10 lg:py-6 transition-all duration-300"
        style={{
          backgroundColor: scrolled ? 'rgba(0,0,0,0.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        }}
      >
        <span className="text-white text-xl font-semibold tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
          JustRouter
        </span>
        <div className="hidden lg:flex items-center gap-1 rounded-full px-2 py-1.5" style={{ backgroundColor: scrolled ? 'rgba(255,255,255,0.05)' : '#0C0C0C' }}>
          {NAV_ITEMS.map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-white/80 hover:text-white text-sm px-4 py-1.5 rounded-full hover:bg-white/10 transition-all duration-200"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {item}
            </a>
          ))}
          <button
            onClick={() => navigate('/agents')}
            className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm px-4 py-1.5 rounded-full hover:bg-white/10 transition-all duration-200 cursor-pointer "
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            <Bot size={14} />
            Агенты
          </button>
        </div>
        <div className="flex items-center gap-2">
          <HamburgerButton open={open} onClick={() => setOpen((v) => !v)} />
          <div className="hidden lg:flex items-center gap-1.5">
            {userName ? (
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <Coins size={13} style={{ color: '#F59E0B' }} />
                  <span className="text-white/70">{balance.toFixed(2)} ₽</span>
                </div>
                <button
                  onClick={() => navigate('/account')}
                  className="text-sm font-medium px-4 py-2 rounded-full text-white/80 hover:text-white transition-all duration-200 cursor-pointer "
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Личный кабинет
                </button>
                <button
                  onClick={onLogout}
                  className="text-sm font-medium px-4 py-2 rounded-full text-white/60 hover:text-white transition-all duration-200"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Выйти
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={onLoginClick}
                  className="text-sm font-medium px-4 py-2 rounded-full text-white/80 hover:text-white transition-all duration-200 cursor-pointer "
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Вход
                </button>
                <button
                  onClick={onRegisterClick}
                  className="text-sm font-medium px-5 py-2 rounded-full text-black transition-all duration-300 hover:opacity-80 cursor-pointer "
                  style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#ffffff' }}
                >
                  Регистрация
                </button>
              </>
            )}
          </div>
        </div>
      </nav>
      <MobileMenu open={open} onClose={() => setOpen(false)} onLoginClick={onLoginClick} onRegisterClick={onRegisterClick} userName={userName} onLogout={onLogout} balance={balance} />
    </>
  );
}

function AnimatedCounter({ target, suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const counted = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true;
          const duration = 2000;
          const steps = 60;
          const increment = target / steps;
          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref} className="tabular-nums">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

function PlatformSection() {
  const features = [
    { icon: Cpu, title: 'Единый API', desc: 'Один эндпоинт для всех моделей и провайдеров. OpenAI SDK работает из коробки.', accent: '#3B82F6' },
    { icon: Zap, title: 'Мгновенный failover', desc: 'При падении провайдера запрос автоматически перенаправляется на резервный — вы не заметите сбоя.', accent: '#F59E0B' },
    { icon: Globe, title: 'Глобальная маршрутизация', desc: 'Запросы обрабатываются на ближайшем edge-сервере. Минимальная задержка где бы вы ни находились.', accent: '#10B981' },
    { icon: Shield, title: 'Политики данных', desc: 'Тонкая настройка: выбирайте конкретных провайдеров для конкретных промптов. Никакой утечки данных.', accent: '#8B5CF6' },
    { icon: TrendingUp, title: 'Оптимизация цены', desc: 'Автоматически выбираем самого дешёвого провайдера для каждой модели. Экономия до 40% по сравнению с прямым API.', accent: '#EC4899' },
    { icon: Layers, title: 'Мультимодальность', desc: 'Текст, изображения, аудио, видео — все форматы через единый интерфейс. Один SDK для всего.', accent: '#14B8A6' },
  ];

  return (
    <section id="платформа" className="relative py-24 md:py-32 px-5 sm:px-8" style={{ backgroundColor: '#0a0a0a' }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Zap size={12} />
            Platform
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-white">
            Единый интерфейс для всех LLM
          </h2>
          <p className="mt-4 text-white/40 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            Russian AI gateway — uniting dozens of AI providers into one simple endpoint with smart routing and data protection.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div
              key={i}
              className="group rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
              style={{
                backgroundColor: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                className="size-10 rounded-xl flex items-center justify-center mb-4 transition-all duration-300 group-hover:scale-110"
                style={{ backgroundColor: `${f.accent}15` }}
              >
                <f.icon size={20} style={{ color: f.accent }} />
              </div>
              <h3 className="text-white text-base font-semibold mb-2">{f.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>


      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      num: '01',
      title: 'Подключаете API',
      desc: 'Один ключ — доступ ко всем моделям. Просто замените base_url на api.velorix.ai.',
      gradient: 'from-blue-500/20 to-blue-600/10',
      icon: Network,
    },
    {
      num: '02',
      title: 'Выбираете модель',
      desc: 'Все популярные LLM-модели на любой вкус — от лёгких до самых мощных.',
      gradient: 'from-purple-500/20 to-purple-600/10',
      icon: Cpu,
    },
    {
      num: '03',
      title: 'Мы маршрутизируем',
      desc: 'Автоматически направляем запрос к самому быстрому, дешёвому или надёжному провайдеру.',
      gradient: 'from-emerald-500/20 to-emerald-600/10',
      icon: Globe,
    },
    {
      num: '04',
      title: 'Получаете результат',
      desc: 'Ответ приходит за миллисекунды. Платёж списывается — вы платите только за использованные токены.',
      gradient: 'from-amber-500/20 to-amber-600/10',
      icon: CheckCircle,
    },
  ];

  return (
    <section id="как-работает" className="relative py-24 md:py-32 px-5 sm:px-8" style={{ backgroundColor: '#0a0a0a' }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Network size={12} />
            How it works
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-white">
            От запроса к ответу за 4 шага
          </h2>
          <p className="mt-4 text-white/40 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            Всё, что нужно — один API-ключ. Всю магию маршрутизации мы берём на себя.
          </p>
        </div>

        {/* Flow diagram */}
        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-4">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              <div
                className="relative rounded-2xl p-6 h-full transition-all duration-300 hover:-translate-y-1"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="size-10 rounded-xl flex items-center justify-center font-mono text-sm font-bold"
                    style={{
                      background: `linear-gradient(135deg, ${step.gradient.split(' ')[0].replace('from-', '')}, ${step.gradient.split(' ')[1].replace('to-', '')})`,
                      color: 'rgba(255,255,255,0.8)',
                    }}
                  >
                    {step.num}
                  </div>
                  <div className="h-px flex-1" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} />
                  <step.icon size={16} style={{ color: 'rgba(255,255,255,0.2)' }} />
                </div>
                <h3 className="text-white text-base font-semibold mb-2">{step.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{step.desc}</p>
              </div>

              {/* Arrow between steps */}
              {i < steps.length - 1 && (
                <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                  <ArrowRight size={16} style={{ color: 'rgba(255,255,255,0.15)' }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Code example */}
        <div
          className="mt-12 rounded-2xl p-5 md:p-6 font-mono text-xs md:text-sm leading-relaxed"
          style={{
            backgroundColor: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="flex items-center gap-2 mb-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex gap-1.5">
              <div className="size-2.5 rounded-full bg-red-500/60" />
              <div className="size-2.5 rounded-full bg-yellow-500/60" />
              <div className="size-2.5 rounded-full bg-green-500/60" />
            </div>
            <span className="text-white/20 text-[10px]">terminal</span>
          </div>
          <div className="text-white/60">
            <span className="text-white/30">$</span> curl https://api.velorix.ai/v1/chat/completions \<br />
            <span className="text-white/30 ml-4">-H</span>{' '}
            <span style={{ color: '#10B981' }}>"Authorization: Bearer $VELORIX_API_KEY"</span> \<br />
            <span className="text-white/30 ml-4">-H</span>{' '}
            <span style={{ color: '#10B981' }}>"Content-Type: application/json"</span> \<br />
            <span className="text-white/30 ml-4">-d</span> {'{'}<br />
            <span className="ml-10" style={{ color: '#F59E0B' }}>"model"</span>: <span style={{ color: '#10B981' }}>"openai/gpt-5.5"</span>,<br />
            <span className="ml-10" style={{ color: '#F59E0B' }}>"messages"</span>: [<br />
            <span className="ml-14" style={{ color: '#F59E0B' }}>"role"</span>: <span style={{ color: '#10B981' }}>"user"</span>,<br />
            <span className="ml-14" style={{ color: '#F59E0B' }}>"content"</span>: <span style={{ color: '#10B981' }}>"Напиши код на Python"</span><br />
            <span className="ml-10">]</span><br />
            {'}'}
          </div>
        </div>
      </div>
    </section>
  );
}

function AuthModal({ mode, onClose, onSuccess }) {
  const [isLogin, setIsLogin] = useState(mode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password || (!isLogin && !name)) {
      setError('Заполните все поля');
      return;
    }

    if (password.length < 4) {
      setError('Пароль должен быть минимум 4 символа');
      return;
    }

    setLoading(true);
    try {
      const result = isLogin
        ? await api.login(email, password)
        : await api.register(email, password, name);

      localStorage.setItem('velorix_token', result.token);
      localStorage.setItem('velorix_session', JSON.stringify(result.user));
      onSuccess(result.user.name);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
        className="w-full max-w-sm rounded-2xl p-6 sm:p-8"
        style={{
          backgroundColor: '#0a0a0a',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-lg font-semibold">
            {isLogin ? 'Вход' : 'Регистрация'}
          </h2>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors p-1">
            <XIcon size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isLogin && (
            <div>
              <label className="block text-white/40 text-xs font-mono mb-1 ml-1">Имя</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Иван Иванов"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 transition-all font-mono"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-white/40 text-xs font-mono mb-1 ml-1">Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-white/40 text-xs font-mono mb-1 ml-1">Пароль</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/[0.03] border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white text-sm placeholder-white/20 outline-none focus:border-white/30 transition-all font-mono"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-400/80 text-xs font-mono text-center bg-red-500/5 border border-red-500/10 rounded-xl px-4 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-white text-black text-sm font-medium hover:opacity-80 transition-all duration-200 disabled:opacity-50 "
          >
            {loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Создать аккаунт')}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-white/30 hover:text-white/60 text-xs font-mono transition-colors"
          >
            {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
          </button>
        </div>

        <div className="mt-3 text-center">
          <button
            onClick={() => { onClose(); navigate('/admin'); }}
            className="text-white/20 hover:text-white/40 text-[10px] font-mono transition-colors"
          >
            Вход для администратора
          </button>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer style={{ backgroundColor: '#0a0a0a', borderTop: '1px solid rgba(255,255,255,0.06)' }} className="py-12 px-5 sm:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="text-white/20 text-xs">© 2026 JustRouter. Один API для всех AI-моделей.</span>
        <div className="flex gap-4">
          <a href="/agents" className="text-white/30 hover:text-white/60 text-xs transition-colors">Агенты</a>
          <a href="/api-docs" className="text-white/30 hover:text-white/60 text-xs transition-colors">API для агентов</a>
          <a href="#" className="text-white/30 hover:text-white/60 text-xs transition-colors">Документация</a>
          <a href="#" className="text-white/30 hover:text-white/60 text-xs transition-colors">Telegram</a>
          <a href="#" className="text-white/30 hover:text-white/60 text-xs transition-colors">Статус</a>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  const [authModal, setAuthModal] = useState(null); // 'login' | 'register' | null
  const [userName, setUserName] = useState('');
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    const session = JSON.parse(localStorage.getItem('velorix_session') || 'null');
    if (session) {
      setUserName(session.name);
      if (session.balance !== undefined) setBalance(session.balance);
      api.me().then((u) => {
        localStorage.setItem('velorix_session', JSON.stringify(u));
        setUserName(u.name);
        if (u.balance !== undefined) setBalance(u.balance);
      }).catch(() => {
        localStorage.removeItem('velorix_token');
        localStorage.removeItem('velorix_session');
        setUserName('');
      });
    }
  }, []);

  const handleLogout = async () => {
    await api.logout().catch(() => {});
    localStorage.removeItem('velorix_token');
    localStorage.removeItem('velorix_session');
    setUserName('');
    setBalance(0);
  };

  const handleAuthSuccess = (name) => {
    setUserName(name);
    const session = JSON.parse(localStorage.getItem('velorix_session') || '{}');
    if (session.balance !== undefined) setBalance(session.balance);
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#0a0a0a' }}>
      {authModal && (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* Hero Section */}
      <section className="relative w-full h-screen overflow-hidden">
        <video
          className="absolute inset-0 w-full h-full object-cover"
          src={BG_VIDEO}
          autoPlay
          loop
          muted
          playsInline
        />
        {/* Overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)' }} />

        <Navbar
          onLoginClick={() => setAuthModal('login')}
          onRegisterClick={() => setAuthModal('register')}
          userName={userName}
          onLogout={handleLogout}
          balance={balance}
        />

        <div style={{ position: 'relative', zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: '100%', paddingLeft: '1.25rem', paddingRight: '1.25rem', paddingTop: '100px' }} className="sm:px-8">
          <div>
            {/* Badge */}
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-6"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <Zap size={12} />
              Один API для всех AI-моделей
            </div>

            <h1
              className="text-white font-normal leading-[1.12] tracking-tight max-w-3xl"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 'clamp(1.75rem, 5vw, 2.6rem)',
              }}
            >
              Один API для всех AI-моделей.
              <br className="hidden sm:block" />
              {' '}Быстро. Просто. Надёжно.
            </h1>

            <p
              className="mt-5 md:mt-6 text-white/60 text-sm md:text-base leading-relaxed max-w-xs sm:max-w-sm md:max-w-md mx-auto"
              style={{ fontFamily: "'Courier New', Courier, monospace", letterSpacing: '0.01em' }}
            >
              Все популярные LLM-модели
              <br className="hidden sm:block" />
              {' '}через единый API. Без сложностей и переплат.
            </p>

            <button
              className="mt-7 md:mt-8 inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-black text-sm font-medium transition-all duration-300 hover:opacity-80 group cursor-pointer "
              style={{ fontFamily: 'Inter, sans-serif', backgroundColor: '#ffffff' }}
              onClick={() => document.getElementById('платформа')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Изучить платформу
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-200" />
            </button>
          </div>
        </div>
      </section>

      {/* Platform Section */}
      <PlatformSection />

      {/* How It Works Section */}
      <HowItWorksSection />

      {/* AI Defense Section placeholder */}
      <section id="ai-security" className="relative py-24 md:py-32 px-5 sm:px-8" style={{ backgroundColor: '#0a0a0a' }}>
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Shield size={12} />
            AI Security
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-white">Скоро</h2>
          <p className="mt-4 text-white/40 text-sm md:text-base max-w-xl mx-auto">Защита промптов, фильтрация PII и контроль доступа к моделям.</p>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
