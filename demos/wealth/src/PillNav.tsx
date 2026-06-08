import { useEffect, useRef, useState } from 'react';
import { gsap } from './gsap-setup';
import './PillNav.css';

const NAV_ITEMS = [
  { label: 'HOME', action: () => gsap.to(window, { duration: 3, scrollTo: 0, ease: 'power3.inOut' }) },
  {
    label: 'ABOUT',
    action: () =>
      gsap.to(window, { duration: 3, scrollTo: document.body.scrollHeight, ease: 'power3.inOut' }),
  },
  { label: 'SERVICES', action: () => {} },
  { label: 'CONTACT', action: () => {} },
];

function LogoIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 100 100" fill="white" aria-hidden>
      <path d="m50,50c0,18.2,14.77,32.98,32.97,32.98,0-18.2-14.77-32.98-32.97-32.98Z" />
      <path d="m17.02,82.98c18.2,0,32.98-14.77,32.98-32.98-18.2,0-32.98,14.77-32.98,32.98Z" />
      <path d="m82.98,17.02c-18.2,0-32.97,14.77-32.97,32.97,18.2,0,32.97-14.77,32.97-32.97Z" />
      <path d="m17.02,17.02c0,18.2,14.77,32.97,32.98,32.97,0-18.2-14.77-32.97-32.98-32.97Z" />
    </svg>
  );
}

type NavPillProps = {
  label: string;
  onClick: () => void;
  isActive?: boolean;
};

function NavPill({ label, onClick, isActive = false }: NavPillProps) {
  const pillRef = useRef<HTMLButtonElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const hoverLabelRef = useRef<HTMLSpanElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => {
    const pill = pillRef.current;
    const circle = circleRef.current;
    const label = labelRef.current;
    const hoverLabel = hoverLabelRef.current;
    if (!pill || !circle || !label || !hoverLabel) return undefined;

    const w = pill.offsetWidth;
    const h = pill.offsetHeight;
    const R = (w * w) / 4 + (h * h) / (2 * h);
    const D = 2 * R + 2;
    const delta = R - Math.sqrt(R * R - (w * w) / 4) + 1;

    gsap.set(circle, {
      width: D,
      height: D,
      xPercent: -50,
      bottom: -delta,
      transformOrigin: `50% ${D - delta}px`,
      scale: 0,
    });

    timelineRef.current = gsap
      .timeline({ paused: true })
      .to(circle, { scale: 3, duration: 0.3, ease: 'power2.out' }, 0)
      .to(label, { yPercent: -100, duration: 0.3, ease: 'power2.out' }, 0)
      .fromTo(hoverLabel, { yPercent: 100 }, { yPercent: 0, duration: 0.3, ease: 'power2.out' }, 0);

    const onEnter = () => timelineRef.current?.tweenTo(timelineRef.current.duration(), { duration: 0.3 });
    const onLeave = () => timelineRef.current?.tweenTo(0, { duration: 0.2 });

    pill.addEventListener('mouseenter', onEnter);
    pill.addEventListener('mouseleave', onLeave);

    return () => {
      pill.removeEventListener('mouseenter', onEnter);
      pill.removeEventListener('mouseleave', onLeave);
      timelineRef.current?.kill();
    };
  }, []);

  return (
    <li>
      <button
        ref={pillRef}
        type="button"
        className={`pill${isActive ? ' is-active' : ''}`}
        onClick={onClick}
      >
        <div ref={circleRef} className="hover-circle" />
        <span className="label-stack">
          <span ref={labelRef} className="pill-label">
            {label}
          </span>
          <span ref={hoverLabelRef} className="pill-label-hover">
            {label}
          </span>
        </span>
      </button>
    </li>
  );
}

export default function PillNav() {
  const logoRef = useRef<HTMLButtonElement>(null);
  const logoSvgRef = useRef<HTMLDivElement>(null);
  const navItemsRef = useRef<HTMLDivElement>(null);
  const line1Ref = useRef<HTMLSpanElement>(null);
  const line2Ref = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const logo = logoRef.current;
    const navItems = navItemsRef.current;
    if (!logo || !navItems) return undefined;

    gsap.fromTo(logo, { scale: 0 }, { scale: 1, duration: 0.6, ease: 'power2.out' });
    gsap.fromTo(
      navItems,
      { width: 0, opacity: 0 },
      { width: 'auto', opacity: 1, duration: 0.6, ease: 'power2.out', delay: 0.1 },
    );

    return undefined;
  }, []);

  useEffect(() => {
    const svg = logoSvgRef.current;
    if (!svg) return undefined;

    const onEnter = () => gsap.to(svg, { rotation: 360, duration: 0.2, ease: 'power2.out' });
    const onLeave = () => gsap.set(svg, { rotation: 0 });

    const logo = logoRef.current;
    logo?.addEventListener('mouseenter', onEnter);
    logo?.addEventListener('mouseleave', onLeave);

    return () => {
      logo?.removeEventListener('mouseenter', onEnter);
      logo?.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  useEffect(() => {
    const line1 = line1Ref.current;
    const line2 = line2Ref.current;
    const popover = popoverRef.current;
    if (!line1 || !line2 || !popover) return undefined;

    if (menuOpen) {
      gsap.to(line1, { rotation: 45, y: 3, duration: 0.25 });
      gsap.to(line2, { rotation: -45, y: -3, duration: 0.25 });
      gsap.to(popover, { autoAlpha: 1, y: 0, duration: 0.25, visibility: 'visible' });
    } else {
      gsap.to(line1, { rotation: 0, y: 0, duration: 0.25 });
      gsap.to(line2, { rotation: 0, y: 0, duration: 0.25 });
      gsap.to(popover, { autoAlpha: 0, y: -8, duration: 0.2, visibility: 'hidden' });
    }

    return undefined;
  }, [menuOpen]);

  const handleNav = (action: () => void) => {
    setMenuOpen(false);
    action();
  };

  return (
    <nav className="pill-nav-container">
      <div className="pill-nav">
        <button ref={logoRef} type="button" className="pill-logo" aria-label="Home">
          <div ref={logoSvgRef} className="logo-svg-container">
            <LogoIcon />
          </div>
        </button>

        <div ref={navItemsRef} className="pill-nav-items desktop-only ml-2">
          <ul className="pill-list">
            {NAV_ITEMS.map((item) => (
              <NavPill key={item.label} label={item.label} onClick={item.action} />
            ))}
          </ul>
        </div>

        <div className="mobile-only relative ml-2">
          <button
            type="button"
            className="mobile-menu-button pill-logo"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span ref={line1Ref} className="hamburger-line" />
            <span ref={line2Ref} className="hamburger-line" />
          </button>
          <div ref={popoverRef} className="mobile-menu-popover">
            <ul className="mobile-menu-list">
              {NAV_ITEMS.map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    className="mobile-menu-link"
                    onClick={() => handleNav(item.action)}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </nav>
  );
}
