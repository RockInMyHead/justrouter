import { useEffect, useState } from 'react';

function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : 'auto';
  }, [menuOpen]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 768) setMenuOpen(false);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const cards = [
    {
      img: 'https://images.pexels.com/photos/5212675/pexels-photo-5212675.jpeg',
      alt: 'Editing Specialist',
      label: 'Editing',
      titleTop: 'Editing',
      titleBottom: 'Module',
      num: 100,
    },
    {
      img: 'https://images.pexels.com/photos/8617763/pexels-photo-8617763.jpeg',
      alt: 'Editing Primer',
      label: 'Editing',
      titleTop: 'Editing',
      titleBottom: 'Module',
      num: 45,
    },
    {
      img: 'https://images.pexels.com/photos/6333648/pexels-photo-6333648.jpeg',
      alt: 'Commerce Journey',
      label: 'Commerce',
      titleTop: 'Commerce',
      titleBottom: 'Journey',
      num: 82,
    },
  ];

  return (
    <div className="c6-hero">
      <nav className="c6-nav">
        <div className="c6-logo">
          Learnly<span>.</span>
        </div>

        <div className="c6-menu">
          <a href="#">Chase dreams</a>
          <a href="#">Collection</a>
          <a href="#">Trades</a>
          <a href="#">Students</a>
        </div>

        <div className="c6-actions">
          <a href="#" className="c6-login">
            Enter
          </a>
          <a href="#" className="c6-trial">
            Try It Now
          </a>
        </div>

        <button
          type="button"
          className={`c6-hamburger ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>

        <div className={`c6-mobile-nav ${menuOpen ? 'open' : ''}`}>
          <a href="#" onClick={closeMenu}>
            Chase dreams
          </a>
          <a href="#" onClick={closeMenu}>
            Collection
          </a>
          <a href="#" onClick={closeMenu}>
            Trades
          </a>
          <a href="#" onClick={closeMenu}>
            Students
          </a>
          <a href="#" onClick={closeMenu} style={{ marginTop: 20, color: 'var(--accent)' }}>
            Enter
          </a>
          <a
            href="#"
            onClick={closeMenu}
            className="c6-trial"
            style={{ textAlign: 'center', color: 'white' }}
          >
            Try It Now
          </a>
        </div>
      </nav>

      <main className="c6-main">
        <div className="c6-left">
          <h1 className="c6-title">
            Study.
            <br />
            Train.
            <br />
            Rise.
          </h1>
          <div className="c6-search-container">
            <div className="c6-search">
              <input type="text" placeholder="Chase your dreams" />
              <button type="button">Up</button>
            </div>
          </div>
        </div>

        <div className="c6-right">
          {cards.map((card, i) => (
            <div className="c6-card" key={i}>
              <img src={card.img} alt={card.alt} />
              <div className="c6-card-side-content">
                <div className="c6-vertical-text">{card.label}</div>
              </div>
              <div className="c6-card-content">
                <div className="c6-card-title">
                  {card.titleTop}
                  <br />
                  {card.titleBottom}
                </div>
                <div className="c6-card-topics">
                  <span className="num">{card.num}</span>
                  <span className="label">Topics</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="c6-bottom-info">
        <h3>Boundless passes to 100+ mentorships.</h3>
      </footer>
    </div>
  );
}

export default App;
