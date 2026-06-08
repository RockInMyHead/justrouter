import { ArrowDown, ArrowUpRight } from 'lucide-react';

const ORANGE = '#FF4D00';
const NAV_LINKS = [
  { label: 'Работы', href: '#work' },
  { label: 'Услуги', href: '#services' },
  { label: 'О нас', href: '#about' },
  { label: 'Контакт', href: '#contact' },
];

function FloatingNav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 px-4 md:px-8 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <a href="#top" className="font-display text-lg md:text-xl text-black">
          КИНЕТИК
        </a>

        <nav className="hidden md:flex items-center gap-0 bg-black rounded-full px-1 py-1 shadow-[0_8px_32px_rgba(0,0,0,0.35)]">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-mono-label text-white text-sm px-4 py-2 rounded-full transition-colors duration-200 hover:bg-white hover:text-black"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3 text-black font-mono-label text-xs uppercase">
          <a href="#" className="hover:scale-110 transition-transform">Ig</a>
          <a href="#" className="hover:scale-110 transition-transform">In</a>
          <a href="#" className="hover:scale-110 transition-transform">Gh</a>
        </div>
      </div>
    </header>
  );
}

function ScrollIndicator() {
  const label = 'Листай • '.repeat(5);
  return (
    <div className="relative w-28 h-28 md:w-32 md:h-32 shrink-0">
      <svg className="spin-indicator absolute inset-0 w-full h-full" viewBox="0 0 144 144">
        <defs>
          <path id="scrollCircle" d="M 72,72 m -60,0 a 60,60 0 1,1 120,0 a 60,60 0 1,1 -120,0" fill="none" />
        </defs>
        <text className="font-mono-label uppercase" fill="#000" fontSize="9" fontWeight="700">
          <textPath href="#scrollCircle" startOffset="0">
            {label}
          </textPath>
        </text>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <ArrowDown size={22} strokeWidth={2.5} />
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section id="top" className="min-h-screen flex flex-col justify-center pt-20 pb-8 px-4 md:px-8" style={{ backgroundColor: ORANGE }}>
      <h1 className="font-display text-center text-black leading-[0.92] tracking-[-0.04em] max-w-[96vw] mx-auto text-[clamp(3.5rem,16vw,11rem)]">
        БРУТАЛЬНО
        <br />
        ПО ДИЗАЙНУ
      </h1>

      <div className="mt-10 md:mt-14 border-t-2 border-black max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4 items-center py-6 md:py-8 px-2">
          <p className="font-mono-label text-base md:text-lg text-black/80 uppercase">
            Москва, Россия
          </p>
          <div className="flex justify-center">
            <ScrollIndicator />
          </div>
          <div id="about" className="md:text-right font-mono-label text-base md:text-lg leading-relaxed uppercase">
            <div>Креативный директор</div>
            <div>Цифровой брутализм</div>
            <div>AI-студия</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MarqueeSection() {
  const row1 = 'КИНЕТИК ОРАНЖ • ЦИФРОВОЙ БРУТАЛИЗМ • ';
  const row2 = 'МОУШН • ТИПОГРАФИКА • ИМПАКТ • ';

  return (
    <section className="relative py-12 md:py-16 overflow-hidden bg-black -skew-y-2 my-6 md:my-10">
      <div className="skew-y-2 py-3">
        <div className="overflow-hidden whitespace-nowrap mb-3">
          <div className="marquee-track">
            {[0, 1].map((k) => (
              <span
                key={k}
                className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl px-4"
                style={{ color: ORANGE }}
              >
                {row1.repeat(3)}
              </span>
            ))}
          </div>
        </div>
        <div className="overflow-hidden whitespace-nowrap">
          <div className="marquee-track-reverse">
            {[0, 1].map((k) => (
              <span
                key={k}
                className="font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-white/80 px-4"
              >
                {row2.repeat(3)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const SERVICES = [
  { n: '01', title: 'Бренд-системы', tags: ['Айдентика', 'Гайдлайны', 'Моушн'] },
  { n: '02', title: 'Веб-брутализм', tags: ['React', 'Tailwind', 'Marquee'] },
  { n: '03', title: 'AI-интерфейсы', tags: ['LLM UX', 'Дашборды', 'API'] },
  { n: '04', title: 'Кампании', tags: ['Запуск', 'Hype', 'Конверсия'] },
];

function ServiceList() {
  return (
    <section id="services" className="bg-black text-white py-2 md:py-4">
      {SERVICES.map((item) => (
        <article
          key={item.n}
          className="group relative border-t border-white/20 px-4 md:px-8 py-6 md:py-10 transition-colors hover:bg-white/[0.05]"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8 max-w-6xl mx-auto">
            <span className="font-mono-label text-sm shrink-0" style={{ color: ORANGE }}>
              {item.n}
            </span>
            <div className="flex-1 transition-transform duration-300 group-hover:translate-x-4">
              <h3 className="font-display text-2xl sm:text-3xl md:text-4xl leading-[0.95] tracking-[-0.04em]">
                {item.title}
              </h3>
              <div className="flex flex-wrap gap-2 mt-3 md:mt-4">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="font-mono-label text-xs px-3 py-1 border border-white/30 rounded-full uppercase"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <ArrowUpRight
              size={40}
              strokeWidth={2}
              className="hidden md:block shrink-0 opacity-0 scale-90 transition-all duration-300 group-hover:opacity-100 group-hover:rotate-45 group-hover:scale-110"
              style={{ color: ORANGE }}
            />
          </div>
        </article>
      ))}
      <div className="border-t border-white/20" />
    </section>
  );
}

function CtaFooter() {
  return (
    <>
      <section id="contact" className="py-16 md:py-24 px-4 text-center" style={{ backgroundColor: ORANGE }}>
        <h2 className="font-display text-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-[0.92] mb-8 md:mb-10 max-w-4xl mx-auto">
          ДАВАЙТЕ СОЗДАДИМ
        </h2>
        <a
          href="https://justrouter.ru"
          className="inline-flex items-center justify-center font-mono-label text-sm uppercase px-10 py-4 bg-black text-white rounded-full border-2 border-black transition-transform duration-300 hover:scale-105"
        >
          Начать проект
        </a>
      </section>

      <footer className="border-t-2 border-black px-4 md:px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-4 max-w-6xl mx-auto w-full" style={{ backgroundColor: ORANGE }}>
        <span className="font-mono-label text-xs uppercase">© 2026 Кинетик Studio</span>
        <div className="flex gap-5 font-mono-label text-xs uppercase">
          <a href="#" className="hover:translate-x-1 transition-transform">Twitter</a>
          <a href="#" className="hover:translate-x-1 transition-transform">Dribbble</a>
          <a href="https://justrouter.ru" className="hover:translate-x-1 transition-transform">JustRouter</a>
        </div>
      </footer>
    </>
  );
}

export default function App() {
  return (
    <div id="work">
      <FloatingNav />
      <HeroSection />
      <MarqueeSection />
      <ServiceList />
      <CtaFooter />
    </div>
  );
}
