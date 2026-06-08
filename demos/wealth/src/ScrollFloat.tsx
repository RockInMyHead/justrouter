import { useEffect, useRef } from 'react';
import { gsap } from './gsap-setup';
import './ScrollFloat.css';

type ScrollFloatProps = {
  children: string;
};

export default function ScrollFloat({ children }: ScrollFloatProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const chars = el.querySelectorAll('.char');
    const anim = gsap.fromTo(
      chars,
      {
        opacity: 1,
        yPercent: 0,
        scaleY: 1,
        scaleX: 1,
        transformOrigin: '50% 0%',
        force3D: true,
      },
      {
        opacity: 0,
        yPercent: 250,
        scaleY: 1.2,
        scaleX: 0.9,
        stagger: 0.05,
        ease: 'power2.inOut',
        duration: 1,
        force3D: true,
        scrollTrigger: {
          trigger: document.body,
          start: 'top top',
          end: '+=1000',
          scrub: 1.5,
          fastScrollEnd: true,
        },
      },
    );

    return () => {
      anim.scrollTrigger?.kill();
      anim.kill();
    };
  }, [children]);

  const lines = children.split('\n');

  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-end p-4 md:p-8 pointer-events-none">
      <div
        ref={containerRef}
        className="scroll-float-text font-dirtyline text-white gpu-layer"
        style={{
          fontSize: 'clamp(4rem, 15vw, 317px)',
          lineHeight: 0.85,
          letterSpacing: '0%',
        }}
      >
        {lines.map((line, lineIndex) => (
          <span key={lineIndex} style={{ display: 'block' }}>
            {line.split(' ').map((word, wordIndex, words) => (
              <span
                key={wordIndex}
                style={{ display: 'inline-block', whiteSpace: 'nowrap' }}
              >
                {word.split('').map((char, charIndex) => (
                  <span key={charIndex} className="char">
                    {char}
                  </span>
                ))}
                {wordIndex < words.length - 1 && '\u00A0'}
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
