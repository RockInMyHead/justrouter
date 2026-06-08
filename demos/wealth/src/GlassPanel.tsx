import { useEffect, useRef, type RefObject } from 'react';
import { gsap } from './gsap-setup';
import { isFinePointer, registerParallax } from './perf';

const BRANDS = ['VOICEFLOW', 'ZENDESK', 'PENDO', 'GLIDE', 'CANVA'];

type GlassPanelProps = {
  containerRef: RefObject<HTMLDivElement | null>;
};

export default function GlassPanel({ containerRef }: GlassPanelProps) {
  const panelWrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const wrapper = panelWrapRef.current;
    const panel = panelRef.current;
    if (!container || !wrapper) return undefined;

    const tween = gsap.fromTo(
      wrapper,
      { y: '100%', force3D: true },
      {
        y: '0%',
        ease: 'none',
        force3D: true,
        scrollTrigger: {
          trigger: container,
          start: 'top bottom',
          end: 'bottom bottom',
          scrub: 1.5,
          fastScrollEnd: true,
        },
      },
    );

    const unregisterParallax =
      panel && isFinePointer()
        ? registerParallax({
            el: panel,
            xFactor: 20,
            yFactor: 20,
            rotY: 4,
            rotX: 4,
            duration: 1,
          })
        : undefined;

    return () => {
      unregisterParallax?.();
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [containerRef]);

  return (
    <div className="absolute bottom-0 left-0 w-full h-screen flex items-end justify-center px-4 pb-4 md:pb-8 pointer-events-none">
      <div
        ref={panelWrapRef}
        className="w-full max-w-[1250px] h-[900px] max-h-[85vh] pointer-events-auto gpu-layer"
        style={{ perspective: '1000px' }}
      >
        <div
          ref={panelRef}
          className="glass-panel w-full h-full flex flex-col justify-between rounded-3xl relative overflow-hidden"
          style={{
            transformStyle: 'preserve-3d',
          }}
        >
          <div className="flex flex-col items-center justify-center flex-1 px-6 md:px-12 text-center">
            <p className="font-serif italic text-white/70 text-base md:text-lg mb-4 md:mb-6">
              About Us
            </p>
            <h2 className="font-serif text-white text-4xl md:text-6xl lg:text-[96px] leading-[1.1] lg:leading-[92.6px] tracking-tight w-full max-w-[1000px] mx-auto">
              We transform sterile concrete into thriving{' '}
              <span className="italic">urban</span> jungles. Our innovative designs bring wild{' '}
              <span className="italic">nature</span> back to modern cities. Experience the{' '}
              <span className="italic">bloom</span>
            </h2>
          </div>

          <div className="border-t border-white/10 py-6 overflow-hidden">
            <div className="marquee-track flex animate-marquee w-max">
              {[0, 1].map((group) => (
                <div key={group} className="flex shrink-0">
                  {BRANDS.map((name) => (
                    <span
                      key={`${group}-${name}`}
                      className="mx-8 uppercase font-sans font-semibold text-sm tracking-widest text-white opacity-40 hover:opacity-100 transition-opacity duration-300 shrink-0"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
