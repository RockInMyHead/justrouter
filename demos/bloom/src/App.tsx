const BG_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260215_121759_424f8e9c-d8bd-4974-9567-52709dfb6842.mp4';

function LogoIpsum() {
  return (
    <svg
      width="134"
      height="25"
      viewBox="0 0 134 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 0H8.33333V8.33333H0V0ZM0 16.6667H8.33333V25H0V16.6667ZM16.6667 8.33333H25V16.6667H16.6667V8.33333Z"
        fill="white"
      />
      <path
        d="M32.5 17.5V7.5H35.3V15.2H41.1V17.5H32.5ZM43.2 7.5H45.9V17.5H43.2V7.5ZM48.5 7.5H51.8L57.1 17.5H54.1L53.1 15H47.2L46.2 17.5H43.2L48.5 7.5ZM52.2 12.8L50.15 8.2L48.1 12.8H52.2ZM59.5 7.5H62.3V15.2H68.1V17.5H59.5V7.5ZM70.2 7.5H73V17.5H70.2V7.5ZM75.5 7.5H81.8C84.5 7.5 86.2 9 86.2 11.5C86.2 13.4 85.1 14.7 83.3 15.2L86.5 17.5H83.2L80.3 14.2H78.3V17.5H75.5V7.5ZM78.3 9.7V12.2H81.5C82.8 12.2 83.5 11.5 83.5 10.4C83.5 9.3 82.8 8.6 81.5 8.6H78.3V9.7ZM88.5 7.5H96.5C99.5 7.5 101.5 9.4 101.5 12.5V14.5C101.5 17.6 99.5 19.5 96.5 19.5H88.5V7.5ZM91.3 9.7V17.3H96.3C97.8 17.3 98.7 16.3 98.7 14.5V12.5C98.7 10.7 97.8 9.7 96.3 9.7H91.3ZM103.5 7.5H111.8C114.5 7.5 116.2 9.1 116.2 11.8C116.2 14.5 114.5 16.1 111.8 16.1H106.3V17.5H103.5V7.5ZM106.3 9.7V13.9H111.5C112.7 13.9 113.4 13.2 113.4 11.8C113.4 10.4 112.7 9.7 111.5 9.7H106.3ZM118.5 7.5H126.5C129.5 7.5 131.5 9.4 131.5 12.5V14.5C131.5 17.6 129.5 19.5 126.5 19.5H118.5V7.5ZM121.3 9.7V17.3H126.3C127.8 17.3 128.7 16.3 128.7 14.5V12.5C128.7 10.7 127.8 9.7 126.3 9.7H121.3Z"
        fill="white"
      />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9l6 6 6-6"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function App() {
  return (
    <div className="page">
      <section className="hero-section">
        {/* z-index 0 — background video */}
        <div className="hero-video-wrap" aria-hidden>
          <video
            className="hero-video"
            src={BG_VIDEO}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
          />
        </div>

        {/* z-index 1 — blurred pill */}
        <div className="hero-blur" aria-hidden />

        {/* z-index 2 — all UI */}
        <div className="hero-ui">
          <header className="hero-nav-wrap">
            <div className="hero-nav-left">
              <a href="#" className="hero-logo-link" aria-label="Home">
                <LogoIpsum />
              </a>
              <nav className="hero-nav-links" aria-label="Main navigation">
                <a href="#" className="hero-nav-link">
                  Home
                </a>
                <button type="button" className="hero-nav-link hero-nav-link--dropdown">
                  Services
                  <ChevronDown />
                </button>
                <a href="#" className="hero-nav-link">
                  Reviews
                </a>
                <a href="#" className="hero-nav-link">
                  Contact us
                </a>
              </nav>
            </div>

            <div className="hero-nav-actions">
              <button type="button" className="btn-sign-in">
                Sign In
              </button>
              <button type="button" className="btn-nav-primary">
                Get Started
              </button>
            </div>
          </header>

          <div className="hero-content">
            <div className="hero-main">
              <div className="hero-heading-block">
                <h1 className="hero-line-inter">Automate repetitive.</h1>
                <p className="hero-line-serif">Focus on growth.</p>
                <p className="hero-subtitle">
                  The next-generation AI agent platform that handles lead generation, customer
                  support, and data entry while you build.
                </p>
              </div>

              <div className="hero-cta-row">
                <button type="button" className="btn-cta-primary">
                  Get Started Free
                </button>
                <button type="button" className="btn-cta-secondary">
                  Watch 2min Demo
                </button>
              </div>
            </div>

            <div className="hero-dashboard-wrap" aria-hidden="true">
              <div className="hero-dashboard-outer">
                <img src="/gallery/sites/bloom.svg" alt="" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
