import { ArrowRight, Menu, X, Zap, Cpu, Network, Globe, Layers, Shield, TrendingUp, CheckCircle, Mail, Lock, User, X as XIcon, Coins } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { api, isAuthError, fetchCurrentUser } from './api.js';
import { clearAuth, getToken, getSession } from './auth.js';
import { getStoredReferralCode, clearStoredReferralCode } from './referral.js';
import ModelCategoryNav from './ModelCategoryNav.jsx';
import SubscriptionModal from './SubscriptionModal.jsx';
import HomeGallerySection from './HomeGallerySection.jsx';
import HomeSitesSection from './HomeSitesSection.jsx';
import { HOME_FAQ } from './seo.js';
import { reachGoal } from './metrica.js';

const BG_VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_155101_f2540600-6fe9-433e-8e48-b3f4b72f0727.mp4";

const pageBg = 'var(--page-bg)';
const surfaceBg = 'var(--surface-bg)';
const panelBg = 'var(--panel-bg)';
const softPanelBg = 'var(--soft-panel-bg)';

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[.,;]+$/g, '');
}

function isValidEmail(value) {
  const email = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function HeroBackgroundVideo({ src }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    const tryPlay = () => {
      if (!video.paused) return;
      const playPromise = video.play();
      if (playPromise?.catch) playPromise.catch(() => {});
    };

    tryPlay();
    video.addEventListener('loadeddata', tryPlay);
    video.addEventListener('canplay', tryPlay);

    const onVisibility = () => {
      if (!document.hidden) tryPlay();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const onGesture = () => tryPlay();
    window.addEventListener('pointerdown', onGesture, { once: true, passive: true });
    window.addEventListener('touchstart', onGesture, { once: true, passive: true });

    return () => {
      video.removeEventListener('loadeddata', tryPlay);
      video.removeEventListener('canplay', tryPlay);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointerdown', onGesture);
      window.removeEventListener('touchstart', onGesture);
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      className="hero-bg-video absolute inset-0 h-full w-full object-cover pointer-events-none"
      src={src}
      autoPlay
      loop
      muted
      playsInline
      preload="metadata"
      disablePictureInPicture
      tabIndex={-1}
      aria-hidden="true"
    />
  );
}

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

function MobileMenu({ open, onClose, onLoginClick, onRegisterClick, userName, onLogout, balance, onSubscriptionClick }) {
  const navigate = useNavigate();
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] lg:hidden transition-all duration-400"
        style={{
          backdropFilter: open ? 'blur(16px)' : 'blur(0px)',
          WebkitBackdropFilter: open ? 'blur(16px)' : 'blur(0px)',
          backgroundColor: open ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0)',
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 left-0 right-0 z-[70] lg:hidden"
        style={{
          transform: open ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'transform 0.45s cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      >
        <div
          className="relative overflow-y-auto"
          style={{
            backgroundColor: '#0a0a0f',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            maxHeight: '100dvh',
            paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))',
          }}
        >
          {/* Header with close */}
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <button
              type="button"
              onClick={() => { navigate('/'); onClose(); }}
              className="text-white text-xl font-semibold tracking-tight"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              JustRouter
            </button>
            <button
              onClick={onClose}
              className="size-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              aria-label="Закрыть меню"
            >
              <X size={20} color="white" strokeWidth={1.5} />
            </button>
          </div>

          {/* Main nav links */}
          <div className="px-4 pt-2 pb-3" style={{ opacity: open ? 1 : 0, transition: 'opacity 0.3s ease 0.15s' }}>
            <div className="flex flex-col gap-0.5">
              {[
                { label: 'Главная', path: '/' },
                { label: 'Модели', path: '/models' },
                { label: 'Тарифы', path: '/pricing' },
                { label: 'Документация', path: '/docs' },
                { label: 'Блог', path: '/blog' },
                { label: 'FAQ', path: '/faq' },
              ].map(function(item) {
                return (
                  <button
                    key={item.path}
                    onClick={() => { navigate(item.path); onClose(); }}
                    className="w-full text-left text-white/80 hover:text-white text-base py-3.5 px-4 rounded-2xl hover:bg-white/5 transition-all duration-200 font-medium"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category nav */}
          <div className="px-4 pb-2">
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
              <div className="px-4 pt-3 pb-1 text-white/30 text-[10px] font-mono uppercase tracking-wider">Категории моделей</div>
              <ModelCategoryNav layout="vertical" onSelect={() => onClose()} buttonClassName="text-white/70 hover:text-white text-base py-3 px-4 hover:bg-white/5 transition-all duration-200 text-left w-full" />
            </div>
          </div>

          {/* Auth / Account section */}
          <div className="px-4 pb-4">
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
              {userName ? (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-white/80 text-sm font-medium truncate mr-2">{userName}</span>
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer shrink-0"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                      onClick={() => { navigate('/account?tab=topup'); onClose(); }}
                    >
                      <Coins size={12} style={{ color: '#F59E0B' }} />
                      <span className="text-white/70">{Number(balance ?? 0).toFixed(2)} ₽</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { navigate('/account'); onClose(); }}
                      className="flex-1 py-3 rounded-xl text-sm font-medium text-white bg-white/10 hover:bg-white/15 transition-all cursor-pointer"
                    >
                      Личный кабинет
                    </button>
                    <button
                      onClick={onSubscriptionClick}
                      className="py-3 px-4 rounded-xl text-sm font-medium btn-liquid-glass cursor-pointer"
                    >
                      Подписка
                    </button>
                  </div>
                  <button
                    onClick={() => { onLogout(); onClose(); }}
                    className="w-full py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-white/80 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                  >
                    Выйти
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={() => { onSubscriptionClick(); onClose(); }}
                    className="w-full py-3 rounded-xl text-sm font-medium btn-liquid-glass cursor-pointer"
                  >
                    Подписка
                  </button>
                  <div className="flex gap-2.5">
                    <button
                      onClick={() => { onLoginClick(); onClose(); }}
                      className="flex-1 py-3 rounded-xl text-sm font-medium text-white/80 border border-white/15 hover:border-white/30 transition-all cursor-pointer"
                    >
                      Вход
                    </button>
                    <button
                      onClick={() => { onRegisterClick(); onClose(); }}
                      className="flex-1 py-3 rounded-xl text-sm font-medium btn-solid-light transition-all duration-300 hover:opacity-80 cursor-pointer"
                    >
                      Регистрация
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Navbar({ onLoginClick, onRegisterClick, userName, onLogout, balance, onSubscriptionClick }) {
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
        className="fixed top-0 left-0 right-0 z-50 px-5 py-4 lg:px-8 lg:py-4 transition-all duration-300"
        style={{
          backgroundColor: scrolled ? 'rgba(0,0,0,0.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="text-white text-xl font-semibold tracking-tight hover:opacity-80 transition-opacity shrink-0"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            JustRouter
          </button>

          <div
            className="hidden lg:flex items-center gap-1 rounded-full px-2 py-1.5 shrink min-w-0"
            style={{ backgroundColor: scrolled ? softPanelBg : surfaceBg }}
          >
            <ModelCategoryNav />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <HamburgerButton open={open} onClick={() => setOpen((v) => !v)} />
            <div className="hidden lg:flex items-center gap-1">
              {userName ? (
                <>
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-all duration-200"
                    style={{ backgroundColor: softPanelBg, border: '1px solid rgba(255,255,255,0.08)' }}
                    onClick={function (e) { e.stopPropagation(); navigate('/account?tab=topup'); }}
                    onMouseOver={function (e) { e.currentTarget.style.borderColor = 'rgba(251,191,36,0.4)'; }}
                    onMouseOut={function (e) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                  >
                    <Coins size={12} style={{ color: '#F59E0B' }} />
                    <span className="text-white/70">{Number(balance ?? 0).toFixed(2)} ₽</span>
                  </div>
                  <button
                    onClick={() => navigate('/account')}
                    className="text-sm px-3 py-1.5 rounded-full text-white/80 hover:text-white transition-all duration-200 cursor-pointer whitespace-nowrap"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Кабинет
                  </button>
                  <button
                    onClick={onSubscriptionClick}
                    className="text-sm px-3 py-1.5 rounded-full btn-liquid-glass"
                  >
                    Подписка
                  </button>
                  <button
                    onClick={onLogout}
                    className="text-sm px-2.5 py-1.5 rounded-full text-white/50 hover:text-white transition-all duration-200"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Выйти
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onSubscriptionClick}
                    className="text-sm px-3 py-1.5 rounded-full btn-liquid-glass"
                  >
                    Подписка
                  </button>
                  <button
                    onClick={onLoginClick}
                    className="text-sm px-3 py-1.5 rounded-full text-white/80 hover:text-white transition-all duration-200 cursor-pointer whitespace-nowrap"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Вход
                  </button>
                  <button
                    onClick={onRegisterClick}
                    className="text-sm px-4 py-1.5 rounded-full btn-solid-light transition-all duration-300 hover:opacity-80 cursor-pointer whitespace-nowrap"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    Регистрация
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      <MobileMenu open={open} onClose={() => setOpen(false)} onLoginClick={onLoginClick} onRegisterClick={onRegisterClick} userName={userName} onLogout={onLogout} balance={balance} onSubscriptionClick={onSubscriptionClick} />
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

function ModelsPreviewSection() {
  const navigate = useNavigate();
  const groups = [
    { title: 'GPT-4o и OpenAI', desc: 'GPT-4o, GPT-4.1, o-series — текст и мультимодальность', href: '/models/text' },
    { title: 'Claude 3.5', desc: 'Sonnet, Haiku — длинный контекст и качественный текст', href: '/models/text' },
    { title: 'DeepSeek R1', desc: 'Reasoning-модель для логики, математики и кода', href: '/models/text' },
    { title: 'Gemini и Google', desc: 'Быстрые ответы и мультимодальные задачи', href: '/models/text' },
    { title: 'Flux и DALL·E', desc: 'Генерация изображений через API', href: '/models/image' },
    { title: 'Wan и Kling', desc: 'Text-to-video и image-to-video', href: '/models/video' },
  ];

  return (
    <section id="models" className="relative py-24 md:py-32 px-5 sm:px-8" style={{ backgroundColor: pageBg }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 md:mb-20">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-white">
            150+ моделей — один API-ключ
          </h2>
          <p className="mt-4 text-white/40 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            GPT, Claude, DeepSeek, Gemini, Flux и видео-модели. Выберите категорию и начните за минуту.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <button
              key={g.title}
              type="button"
              onClick={() => navigate(g.href)}
              className="text-left rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 cursor-pointer"
              style={{ backgroundColor: softPanelBg, border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <h3 className="text-white text-base font-semibold mb-2">{g.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{g.desc}</p>
            </button>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            to="/models/text"
            className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:underline"
          >
            Полный каталог моделей
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function PricingPreviewSection() {
  const navigate = useNavigate();

  return (
    <section id="pricing" className="relative py-24 md:py-32 px-5 sm:px-8" style={{ backgroundColor: pageBg }}>
      <div className="max-w-4xl mx-auto text-center space-y-6">
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">
          Платите только за использование
        </h2>
        <p className="text-white/40 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
          Без абонентской платы. Бонус при регистрации, пополнение картой РФ. Pay-as-you-go для всех моделей.
        </p>
        <button
          type="button"
          onClick={() => navigate('/pricing')}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white text-black text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer"
        >
          Смотреть тарифы
          <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
}

function PlatformSection() {
  const features = [
    { icon: Cpu, title: 'Всё в одном месте', desc: 'Не нужно регистрироваться на десятках сайтов. Текст, фото, аудио и видео — в одном сервисе.', accent: '#3B82F6' },
    { icon: Zap, title: 'Работает без сбоев', desc: 'Если одна модель недоступна, мы сами переключим на другую. Вы просто получаете результат.', accent: '#F59E0B' },
    { icon: Globe, title: 'Быстрые ответы', desc: 'Генерация запускается сразу — без долгих ожиданий и лишних шагов.', accent: '#10B981' },
    { icon: Shield, title: 'Данные под защитой', desc: 'Ваши тексты и файлы не уходят туда, куда не нужно. Безопасность — по умолчанию.', accent: '#8B5CF6' },
    { icon: TrendingUp, title: 'Платите по факту', desc: 'Списываем только за реальное использование. Система сама подбирает выгодный вариант.', accent: '#EC4899' },
    { icon: Layers, title: 'Любой формат', desc: 'Напишите текст, создайте картинку, озвучьте фразу или сгенерируйте ролик — всё здесь.', accent: '#14B8A6' },
  ];

  return (
    <section id="платформа" className="relative py-24 md:py-32 px-5 sm:px-8" style={{ backgroundColor: pageBg }}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4" style={{ backgroundColor: softPanelBg, color: 'var(--milk-muted)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Zap size={12} />
            Возможности
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-white">
            ИИ без лишних сложностей
          </h2>
          <p className="mt-4 text-white/40 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            JustRouter объединяет лучшие нейросети в одном сервисе — просто выберите, что хотите создать, и начните.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div
              key={i}
              className="group rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
              style={{
                backgroundColor: softPanelBg,
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

function FaqSection() {
  return (
    <section id="faq" className="relative py-24 md:py-32 px-5 sm:px-8" style={{ backgroundColor: pageBg }}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">Частые вопросы</h2>
          <p className="mt-4 text-white/40 text-sm md:text-base">Ответы о сервисе JustRouter и работе с AI-моделями</p>
        </div>
        <div className="space-y-3">
          {HOME_FAQ.map((item) => (
            <details
              key={item.question}
              className="rounded-2xl px-5 py-4 group"
              style={{ backgroundColor: softPanelBg, border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <summary className="cursor-pointer list-none text-white text-sm md:text-base font-medium">
                {item.question}
              </summary>
              <p className="mt-3 text-white/45 text-sm leading-relaxed">{item.answer}</p>
            </details>
          ))}
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
  const [acceptedOffer, setAcceptedOffer] = useState(false);
  const [acceptedPersonalData, setAcceptedPersonalData] = useState(false);
  const [acceptedMarketing, setAcceptedMarketing] = useState(true);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [resendNotice, setResendNotice] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(null);
  const navigate = useNavigate();
  const [hoverBtn, setHoverBtn] = useState('');

  // Listen for OAuth popup callback
  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type === 'oauth-success') {
        const { token, user, referral_promo_active, referral_bonus_rub } = event.data.payload;
        localStorage.setItem('velorix_token', token);
        localStorage.setItem('velorix_session', JSON.stringify(user));
        window.dispatchEvent(new CustomEvent('velorix:auth-success'));
        reachGoal(isLogin ? 'login' : 'registration');
        onSuccess(user.name);
        onClose();
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [isLogin, onSuccess, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !password || (!isLogin && !name)) {
      setError('Заполните все поля');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Введите корректный email');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен быть минимум 6 символов');
      return;
    }

    if (!isLogin && (!acceptedOffer || !acceptedPersonalData)) {
      setError('Примите обязательные условия регистрации');
      return;
    }

    setLoading(true);
    try {
      if (!isLogin) {
        const result = await api.register(
          normalizedEmail,
          password,
          name,
          acceptedMarketing,
          getStoredReferralCode(),
        );

        setError('');
        setVerificationEmail(normalizedEmail);
        sessionStorage.setItem('velorix_pending_email', normalizedEmail);
        setResendNotice(result.message || 'Код отправлен на почту. Проверьте папку «Спам».');

        return;
      }

      const result = await api.login(normalizedEmail, password);

      localStorage.setItem('velorix_token', result.token);
      localStorage.setItem('velorix_session', JSON.stringify(result.user));
      window.dispatchEvent(new CustomEvent('velorix:auth-success'));
      reachGoal('login');
      onSuccess(result.user.name);
      onClose();
      setVerificationEmail('');
      setVerificationCode('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setError('');

    if (!verificationCode.trim()) {
      setError('Введите код подтверждения');
      return;
    }

    setLoading(true);
    try {
      const result = await api.verifyEmail(verificationEmail.trim().toLowerCase(), verificationCode.trim());
      localStorage.setItem('velorix_token', result.token);
      localStorage.setItem('velorix_session', JSON.stringify(result.user));
      sessionStorage.removeItem('velorix_pending_email');
      clearStoredReferralCode();
      window.dispatchEvent(new CustomEvent('velorix:auth-success'));
      reachGoal('registration');
      onSuccess(result.user.name);
      setVerificationEmail('');
      setVerificationCode('');
      setRegistrationSuccess({
        user: result.user,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!verificationEmail || loading) return;
    setError('');
    setLoading(true);
    try {
      await api.resendVerification(verificationEmail.trim().toLowerCase());
      setResendNotice('Новый код отправлен. Письмо может идти 1–2 минуты — проверьте «Спам».');
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openOauthPopup = (provider) => {
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      `/api/auth/oauth/${provider}`,
      `oauth-${provider}`,
      `width=${width},height=${height},left=${left},top=${top},popup=1`
    );
    if (!popup) {
      setError('Разрешите всплывающие окна для этого сайта');
    }
  };

  var GLASS_BORDER = '1px solid rgba(255,255,255,0.06)';
  var GLASS_BG = 'linear-gradient(135deg, rgba(20,20,30,0.88) 0%, rgba(15,15,25,0.94) 50%, rgba(25,25,35,0.88) 100%)';
  var ACCENT = '#FFFFFF';
  var INPUT_STYLE = {
    width: '100%',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '12px',
    padding: '12px 12px 12px 34px',
    color: 'white',
    fontSize: '16px',
    outline: 'none',
    fontFamily: 'monospace',
    WebkitAppearance: 'none',
    transition: 'border-color 0.3s, box-shadow 0.3s',
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[420px] rounded-3xl p-5 sm:p-8 overflow-y-auto max-h-[90dvh]"
        style={{
          background: GLASS_BG,
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 0 80px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient glow — стекло */}
        <div
          className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
            zIndex: 0,
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h2
              className="text-lg font-bold tracking-tight"
              style={{
                color: 'rgba(255,255,255,0.9)',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {isLogin ? 'Вход' : 'Регистрация'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full transition-all duration-300 cursor-pointer"
              style={{
                color: 'rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
              onMouseOver={function (e) { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseOut={function (e) { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            >
              <XIcon size={16} />
            </button>
          </div>

          {registrationSuccess ? (
            <div className="text-center py-4">
              <div
                className="size-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.05) 100%)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(16,185,129,0.15)',
                }}
              >
                <CheckCircle size={28} style={{ color: '#10B981' }} />
              </div>
              <h3 className="text-white text-xl font-semibold mb-4">Аккаунт создан!</h3>
              <p className="text-white/45 text-sm leading-relaxed mb-6">
                Добро пожаловать в JustRouter — можно выбрать модель и начать.
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    sessionStorage.removeItem('velorix_pending_email');
                    onClose();
                    navigate('/models/text', { state: { view: 'catalog', category: 'text' } });
                  }}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer"
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
                  }}
                  onMouseOver={function(e){ e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.background='rgba(255,255,255,0.12)' }}
                  onMouseOut={function(e){ e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.background='rgba(255,255,255,0.08)' }}
                >
                  Выбрать модель
                </button>
                <button
                  onClick={() => {
                    sessionStorage.removeItem('velorix_pending_email');
                    onClose();
                    navigate('/account');
                  }}
                  className="w-full py-3 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    color: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(8px)',
                  }}
                  onMouseOver={function(e){ e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.15)' }}
                  onMouseOut={function(e){ e.currentTarget.style.background='rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.08)' }}
                >
                  Перейти в личный кабинет
                </button>
              </div>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {!isLogin && (
              <div>
                <label className="block text-white/40 text-xs font-mono mb-1 ml-1">Имя</label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.2)' }} />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Иван Иванов"
                    style={INPUT_STYLE}
                    onFocus={function(e){ e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(255,255,255,0.06)'; }}
                    onBlur={function(e){ e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
                    className="w-full outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-white/40 text-xs font-mono mb-1 ml-1">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.2)' }} />
                <input
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => {
                    const cleaned = normalizeEmail(email);
                    if (cleaned !== email) setEmail(cleaned);
                  }}
                  placeholder="user@example.com"
                  style={INPUT_STYLE}
                    onFocus={function(e){ e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(255,255,255,0.06)'; }}
                    onBlur={function(e){ e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
                  className="w-full outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-white/40 text-xs font-mono mb-1 ml-1">Пароль</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.2)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={INPUT_STYLE}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                    onFocus={function(e){ e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(255,255,255,0.06)'; }}
                    onBlur={function(e){ e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
                  className="w-full outline-none"
                />
              </div>
            </div>

            {!isLogin && (
              <div
                className="rounded-xl px-4 py-3 space-y-2"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <label className="flex items-start gap-3 text-xs sm:text-[13px] leading-5 text-white/70 cursor-pointer min-h-[28px]">
                  <input
                    type="checkbox"
                    checked={acceptedOffer}
                    onChange={(e) => setAcceptedOffer(e.target.checked)}
                    className="mt-0.5 size-4 shrink-0"
                    style={{ accentColor: 'rgba(255,255,255,0.5)' }}
                  />
                  <span>
                    Принимаю{' '}
                    <a href="/legal/offer" target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                      условия оферты
                    </a>
                  </span>
                </label>

                <label className="flex items-start gap-3 text-xs sm:text-[13px] leading-5 text-white/70 cursor-pointer min-h-[28px]">
                  <input
                    type="checkbox"
                    checked={acceptedPersonalData}
                    onChange={(e) => setAcceptedPersonalData(e.target.checked)}
                    className="mt-0.5 size-4 shrink-0"
                    style={{ accentColor: 'rgba(255,255,255,0.5)' }}
                  />
                  <span>
                    Даю{' '}
                    <a href="/legal/personal-data-consent" target="_blank" rel="noreferrer" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                      согласие на обработку данных
                    </a>
                  </span>
                </label>

                <label className="flex items-start gap-3 text-xs sm:text-[13px] leading-5 text-white/70 cursor-pointer min-h-[28px]">
                  <input
                    type="checkbox"
                    checked={acceptedMarketing}
                    onChange={(e) => setAcceptedMarketing(e.target.checked)}
                    className="mt-0.5 size-4 shrink-0"
                    style={{ accentColor: 'rgba(255,255,255,0.5)' }}
                  />
                  <span>Согласен на рекламные материалы</span>
                </label>
              </div>
            )}

            {error && (
              <div
                className="text-center text-xs font-mono px-4 py-2 rounded-xl"
                style={{
                  color: '#F87171',
                  background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(239,68,68,0.03) 100%)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(239,68,68,0.12)',
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              onMouseEnter={function () { setHoverBtn('submit'); }}
              onMouseLeave={function () { setHoverBtn(''); }}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
                boxShadow: hoverBtn === 'submit' ? '0 0 30px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.12)' : '0 0 20px rgba(255,255,255,0.02), inset 0 1px 0 rgba(255,255,255,0.08)',
                transform: hoverBtn === 'submit' ? 'translateY(-1px)' : 'translateY(0)',
              }}
            >
              {loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Получить код')}
            </button>

            {/* OAuth divider */}
            <div className="flex items-center gap-3 my-3">
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>или</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            </div>

            {/* OAuth buttons */}
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => openOauthPopup('yandex')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  color: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
                onMouseOver={function(e){ e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
                onMouseOut={function(e){ e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
              >
                <YandexLogo size={16} />
                Яндекс
              </button>
              <button
                type="button"
                onClick={() => openOauthPopup('google')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  color: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
                onMouseOver={function(e){ e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
                onMouseOut={function(e){ e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
              >
                <GoogleLogo size={16} />
                Google
              </button>
              <button
                type="button"
                onClick={() => openOauthPopup('apple')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  color: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
                onMouseOver={function(e){ e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
                onMouseOut={function(e){ e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
              >
                <AppleLogo size={16} />
                Apple
              </button>
            </div>
          </form>
          )}

          {verificationEmail && !registrationSuccess && (
          <form onSubmit={handleVerifyEmail} className="space-y-4">
            <div className="text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>
              <div className="text-xs font-mono mb-1">
                Код отправлен на <span className="text-white/80">{verificationEmail}</span>
              </div>
            </div>
            <div>
              <label className="block text-white/40 text-xs font-mono mb-1 ml-1">Код из письма</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    color: 'white',
                    fontSize: '16px',
                    textAlign: 'center',
                    letterSpacing: '0.3em',
                    outline: 'none',
                    fontFamily: 'monospace',
                    transition: 'border-color 0.3s, box-shadow 0.3s',
                  }}
                    onFocus={function(e){ e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(255,255,255,0.06)'; }}
                    onBlur={function(e){ e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || verificationCode.length < 6}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.08)',
                backdropFilter: 'blur(12px)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
              }}
              onMouseOver={function(e){ e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={function(e){ e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {loading ? 'Проверка...' : 'Подтвердить'}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading}
                className="text-xs font-mono transition-colors cursor-pointer"
                style={{ color: 'rgba(255,255,255,0.3)' }}
                onMouseOver={function(e){ e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
                onMouseOut={function(e){ e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
              >
                Отправить код повторно
              </button>
            </div>
            {resendNotice && (
              <div
                className="text-xs font-mono text-center px-4 py-2 rounded-xl"
                style={{
                  color: 'rgba(255,255,255,0.5)',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                {resendNotice}
              </div>
            )}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setVerificationEmail('');
                  setVerificationCode('');
                  setResendNotice('');
                }}
                className="text-xs font-mono transition-colors cursor-pointer"
                style={{ color: 'rgba(255,255,255,0.2)' }}
                onMouseOver={function(e){ e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
                onMouseOut={function(e){ e.currentTarget.style.color = 'rgba(255,255,255,0.2)'; }}
              >
                Назад
              </button>
            </div>
          </form>
          )}

          {!verificationEmail && (
          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                if (isLogin) setVerificationEmail('');
              }}
              className="text-xs font-mono transition-colors cursor-pointer"
              style={{ color: 'rgba(255,255,255,0.3)' }}
              onMouseOver={function(e){ e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
              onMouseOut={function(e){ e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
            >
              {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
            </button>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Footer() {
  const legalLinks = [
    { href: '/legal/offer', label: 'Публичная оферта' },
    { href: '/legal/privacy', label: 'Политика конфиденциальности' },
    { href: '/legal/cookies', label: 'Политика Cookie' },
    { href: '/legal/personal-data-consent', label: 'Согласие на обработку персональных данных' },
  ];

  return (
    <footer style={{ backgroundColor: pageBg, borderTop: '1px solid rgba(255,255,255,0.06)' }} className="py-12 px-5 sm:px-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-white/20 text-xs">© 2026 JustRouter. Один API для всех AI-моделей.</span>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="/models/text" className="text-white/30 hover:text-white/60 text-xs transition-colors">Модели</a>
            <a href="/pricing" className="text-white/30 hover:text-white/60 text-xs transition-colors">Тарифы</a>
            <a href="/docs" className="text-white/30 hover:text-white/60 text-xs transition-colors">Документация API</a>
            <a href="/blog" className="text-white/30 hover:text-white/60 text-xs transition-colors">Блог</a>
            <a href="/faq" className="text-white/30 hover:text-white/60 text-xs transition-colors">FAQ</a>
            <a href="/agents" className="text-white/30 hover:text-white/60 text-xs transition-colors">Агенты</a>
            <a href="/neyroseti-bez-vpn" className="text-white/30 hover:text-white/60 text-xs transition-colors">Без VPN</a>
            <a href="/ai-api-rubli" className="text-white/30 hover:text-white/60 text-xs transition-colors">AI API в рублях</a>
            <a href="/generaciya-video-neyrosetyu" className="text-white/30 hover:text-white/60 text-xs transition-colors">Видео</a>
            <a href="/generaciya-izobrazheniy" className="text-white/30 hover:text-white/60 text-xs transition-colors">Изображения</a>
          </div>
        </div>

        <div
          className="rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-center gap-3 sm:gap-6 text-center"
          style={{ backgroundColor: softPanelBg, border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <span className="text-white/70 text-sm font-medium">ИП Афонькин Д.П.</span>
          <span className="text-white/40 text-xs font-mono">ИНН: 771412230143</span>
          <span className="text-white/40 text-xs font-mono">ОГРНИП: 324774600620948</span>
          <a href="mailto:info@justrouter.ru" className="text-white/50 hover:text-white text-xs font-mono transition-colors">info@justrouter.ru</a>
          <a href="mailto:support@justrouter.ru" className="text-white/50 hover:text-white text-xs font-mono transition-colors">support@justrouter.ru</a>
        </div>

        <div className="flex flex-col items-center gap-3 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="text-white/20 text-[10px] uppercase tracking-[0.2em]">Правовые документы</span>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
            {legalLinks.map((link) => (
              <a key={link.href} href={link.href} className="text-white/30 hover:text-white/60 text-xs transition-colors">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [authModal, _setAuthModal] = useState(null); // 'login' | 'register' | null
  const setAuthModal = (val) => {
    _setAuthModal(val)
  }
  const [userName, setUserName] = useState('');
  const [balance, setBalance] = useState(0);
  const [showSubscription, setShowSubscription] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState(null);

  useEffect(() => {
    document.body.classList.add('justrouter-home');
    return () => {
      document.body.classList.remove('justrouter-home');
    };
  }, []);

  useEffect(() => {
    if (location.state?.auth === 'login') setAuthModal('login');
    if (location.state?.auth === 'register') setAuthModal('register');
  }, [location.state]);

  useEffect(() => {
    const onAuthExpired = () => {
      setUserName('');
      setBalance(0);
    };
    window.addEventListener('velorix:auth-expired', onAuthExpired);
    return () => window.removeEventListener('velorix:auth-expired', onAuthExpired);
  }, []);

  useEffect(() => {
    document.body.classList.remove('light-theme');
    localStorage.removeItem('justrouter_theme');

    const token = getToken();
    if (token) {
      // Авторизованный пользователь — редирект на /models/text (текстовые модели)
      navigate('/models/text', { replace: true });
      return;
    }
    clearAuth();
  }, []);

  const handleLogout = async () => {
    await api.logout().catch(() => {});
    clearAuth();
    setUserName('');
    setBalance(0);
  };

  const handleAuthSuccess = (name) => {
    setUserName(name);
    const session = getSession();
    if (session?.balance != null) setBalance(Number(session.balance));
    setAuthModal(null);
    // Check subscription
    api.getSubscriptionStatus().then(function (s) {
      if (s?.active?.plan_type === 'tier' && s.active.tier) {
        setSubscriptionTier(s.active.tier);
      }
    }).catch(function () {});
  };

  // Re-fetch subscription status when userName changes (login/logout)
  useEffect(function () {
    if (userName) {
      api.getSubscriptionStatus().then(function (s) {
        if (s?.active?.plan_type === 'tier' && s.active.tier) {
          setSubscriptionTier(s.active.tier);
        } else {
          setSubscriptionTier(null);
        }
      }).catch(function () {});
    } else {
      setSubscriptionTier(null);
    }
  }, [userName]);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', backgroundColor: pageBg }}>
      {authModal && (
        <AuthModal
          mode={authModal}
          onClose={() => setAuthModal(null)}
          onSuccess={handleAuthSuccess}
        />
      )}

      <main>
      {/* Hero Section */}
      <section className="relative w-full h-screen overflow-hidden" aria-label="JustRouter — единый AI-сервис">
        <HeroBackgroundVideo src={BG_VIDEO} />
        {/* Overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)' }} />

        <Navbar
          onLoginClick={() => setAuthModal('login')}
          onRegisterClick={() => setAuthModal('register')}
          userName={userName}
          onLogout={handleLogout}
          balance={balance}
          onSubscriptionClick={function () { setShowSubscription(true); }}
        />

        <div className="relative z-20 flex h-full flex-col items-center justify-center px-5 sm:px-8 text-center">
          <div className="translate-y-[10vh] sm:translate-y-[12vh] max-w-3xl">
            <h1
              className="text-white font-normal leading-[1.12] tracking-tight"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 'clamp(1.75rem, 5vw, 2.6rem)',
              }}
            >
              Единый API для всех нейросетей
            </h1>
            <p className="mt-4 text-white/60 text-base md:text-lg max-w-xl mx-auto">
              Один ключ. Все модели. Без VPN.
            </p>

            <div className="mt-8 md:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full btn-solid-light text-sm font-medium transition-all duration-300 hover:opacity-80 group cursor-pointer"
              style={{ fontFamily: 'Inter, sans-serif' }}
              onClick={() => setAuthModal('register')}
            >
              Получить API-ключ
              <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform duration-200" />
            </button>
            <button
              className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 hover:bg-white/10 text-white/80 cursor-pointer"
              style={{ fontFamily: 'Inter, sans-serif', border: '1px solid rgba(255,255,255,0.15)' }}
              onClick={() => document.getElementById('платформа')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Узнать больше
            </button>
            </div>
          </div>
        </div>
      </section>

      {/* Generated sites */}
      <HomeSitesSection
        onAuthRequired={() => setAuthModal('register')}
        balance={balance}
        onBalanceChange={setBalance}
      />

      {/* Gallery */}
      <HomeGallerySection />

      {/* Platform Section */}
      <PlatformSection />

      <ModelsPreviewSection />

      <PricingPreviewSection />

      <FaqSection />

      {/* AI Defense Section placeholder */}
      <section id="ai-security" className="relative py-24 md:py-32 px-5 sm:px-8" style={{ backgroundColor: pageBg }}>
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4" style={{ backgroundColor: softPanelBg, color: 'var(--milk-muted)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Shield size={12} />
            AI Security
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-white">Скоро</h2>
          <p className="mt-4 text-white/40 text-sm md:text-base max-w-xl mx-auto">Защита промптов, фильтрация PII и контроль доступа к моделям.</p>
        </div>
      </section>

      </main>

      {/* Subscription Modal */}
      {showSubscription && (
        <SubscriptionModal
          onClose={function () { setShowSubscription(false); }}
          userTier={subscriptionTier}
          userName={userName}
          onLoginRequired={function () { setShowSubscription(false); setAuthModal('login'); }}
        />
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}

// ── OAuth Logo SVGs ──

function YandexLogo({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="12" fill="#FC3F1D"/>
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" fontFamily="sans-serif">Я</text>
    </svg>
  );
}

function GoogleLogo({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function AppleLogo({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.05 12.45c0-1.65.64-2.9 1.68-3.82-.84-1.1-2.1-1.7-3.62-1.7-1.48 0-2.66.84-3.46 1.87-.72 1.03-1.2 2.38-1.2 3.77 0 1.48.64 3.03 1.68 4.02.83.8 1.6 1.28 2.7 1.28 1.1 0 2.18-.58 2.7-1.28.68-.8 1.04-1.6 1.04-2.38 0-.16-.02-.32-.06-.48C17.11 13.3 17.05 12.9 17.05 12.45zM14.97 6.43c.6-.68 1.02-1.6 1.02-2.55 0-.1-.02-.22-.04-.32-.6.06-1.3.34-1.78.76-.5.42-.92 1.04-1.06 1.7-.02.12-.04.22-.04.32 0 .1.02.2.04.28C13.46 6.67 14.38 6.93 14.97 6.43z" />
    </svg>
  );
}
