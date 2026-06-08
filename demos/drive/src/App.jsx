const BG_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260213_051817_c7d8ccc6-bfaa-417c-8474-e5cefeea26b4.mp4';

const NAV_LINKS = ['Home', 'Shop', 'Blog', 'About Us', 'Contact Us'];

function PinwheelLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden>
      <path
        d="M14 2L16.5 11.5L26 14L16.5 16.5L14 26L11.5 16.5L2 14L11.5 11.5L14 2Z"
        fill="white"
      />
      <circle cx="14" cy="14" r="3.5" fill="#010101" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 6h15l-1.5 9h-12L6 6Z"
        stroke="#272835"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="20" r="1.5" fill="#272835" />
      <circle cx="18" cy="20" r="1.5" fill="#272835" />
      <path d="M6 6L5 3H2" stroke="#272835" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12h14" stroke="#272835" strokeWidth="2" strokeLinecap="round" />
      <path
        d="m13 6 6 6-6 6"
        stroke="#272835"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Navbar() {
  return (
    <header className="absolute inset-x-0 top-0 z-30 px-5 sm:px-8 lg:px-20">
      <div className="flex items-center justify-between h-[72px] md:h-[88px]">
        <a href="#" className="flex items-center gap-3 shrink-0">
          <PinwheelLogo />
          <span className="hidden sm:inline text-white text-2xl font-normal tracking-tight">
            Logoipsum
          </span>
        </a>

        <nav className="hidden lg:flex items-center gap-8 xl:gap-10">
          {NAV_LINKS.map((link) => (
            <a
              key={link}
              href="#"
              className="text-[#EEEFF2] text-sm font-normal tracking-[-0.32px] hover:text-white transition-colors"
            >
              {link}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4 md:gap-6 shrink-0">
          <a
            href="#"
            className="hidden sm:inline text-[#FBFBFD] text-sm font-normal hover:opacity-80 transition-opacity"
          >
            Sign In
          </a>
          <button
            type="button"
            className="inline-flex items-center gap-2 h-12 px-4 rounded-lg bg-white text-[#272835] text-sm font-medium shadow-[0_1px_2px_rgba(16,24,40,0.06),0_1px_3px_rgba(16,24,40,0.1)] hover:bg-white/95 transition-colors"
          >
            <CartIcon />
            Cart
          </button>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section
      className="relative w-full overflow-hidden bg-[#010101]"
      style={{ minHeight: '600px', maxHeight: '965px', height: 'min(100svh, 965px)' }}
    >
      <video
        className="absolute inset-0 z-0 w-full h-full object-cover"
        src={BG_VIDEO}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden
      />

      <div
        className="absolute inset-x-0 z-10 flex justify-center pointer-events-none select-none"
        style={{ top: '15%' }}
      >
        <h1 className="hero-deco-text font-bebas uppercase text-center leading-[0.88] tracking-[0.02em] w-[75%] max-w-[1073px] text-[clamp(4.5rem,18vw,11rem)]">
          NEW ERA
        </h1>
      </div>

      <div
        className="absolute inset-x-0 top-0 z-[15] pointer-events-none"
        style={{ height: '260px', background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), transparent)' }}
        aria-hidden
      />
      <div
        className="absolute inset-x-0 bottom-0 z-[15] pointer-events-none"
        style={{ height: '260px', background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)' }}
        aria-hidden
      />

      <Navbar />

      <div className="absolute inset-x-0 bottom-0 z-20 px-5 sm:px-8 lg:px-20 pb-8 md:pb-10 lg:pb-12">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 lg:gap-10">
          <div className="flex flex-col sm:flex-row sm:items-end gap-5 sm:gap-6 max-w-xl lg:max-w-none">
            <p className="text-white text-base sm:text-lg lg:text-xl leading-[1.5] max-w-[414px]">
              Choose from thousands of certified cars you can trust, transparently priced, because
              buying a car should feel exciting.
            </p>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-lg bg-white text-[#272835] text-sm font-medium border border-[#EEEFF2] shadow-[0_1px_2px_rgba(16,24,40,0.06),0_1px_3px_rgba(16,24,40,0.1)] hover:bg-white/95 transition-colors shrink-0 self-start sm:self-auto"
            >
              Shop Now
              <ArrowRightIcon />
            </button>
          </div>

          <p className="font-bebas text-white leading-none max-w-[466px] text-[clamp(3rem,5vw,4rem)] lg:text-[64px]">
            Find the perfect car that fits our journey
          </p>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  return <HeroSection />;
}
