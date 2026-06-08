import { useEffect, useRef } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import Hls from 'hls.js';

const VIDEO_SRC =
  'https://stream.mux.com/T6oQJQ02cQ6N01TR6iHwZkKFkbepS34dkkIc9iukgy400g.m3u8';
const POSTER =
  'https://images.unsplash.com/photo-1647356191320-d7a1f80ca777?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGRhcmslMjB0ZWNobm9sb2d5JTIwbmV1cmFsJTIwbmV0d29ya3xlbnwxfHx8fDE3Njg5NzIyNTV8MA&ixlib=rb-4.1.0&q=80&w=1080';

function SunburstIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      {[0, 45, 90, 135].map((deg) => (
        <line
          key={deg}
          x1="12"
          y1="12"
          x2="12"
          y2="3"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${deg} 12 12)`}
        />
      ))}
      <circle cx="12" cy="12" r="2.5" fill="white" />
    </svg>
  );
}

function Navbar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-transparent px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <a href="#" className="shrink-0" aria-label="Home">
          <SunburstIcon />
        </a>

        <nav className="hidden md:flex items-center gap-8">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm font-medium text-white/80 hover:text-white transition-colors"
            style={{ fontFamily: 'Instrument Sans, sans-serif' }}
          >
            Products
            <ChevronDown size={16} />
          </button>
          {['Customer Stories', 'Resources', 'Pricing'].map((link) => (
            <a
              key={link}
              href="#"
              className="text-sm font-medium text-white/80 hover:text-white transition-colors"
              style={{ fontFamily: 'Instrument Sans, sans-serif' }}
            >
              {link}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4 shrink-0">
          <a
            href="#"
            className="hidden sm:block text-sm font-medium text-white/80 hover:text-white transition-colors"
            style={{ fontFamily: 'Instrument Sans, sans-serif' }}
          >
            Book A Demo
          </a>
          <button
            type="button"
            className="rounded-full bg-white text-black px-5 py-2.5 text-sm font-semibold hover:bg-white/90 transition-colors"
            style={{ fontFamily: 'Instrument Sans, sans-serif' }}
          >
            Get Started
          </button>
        </div>
      </div>
    </header>
  );
}

function HeroVideo() {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(VIDEO_SRC);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((e) => console.log('Auto-play prevented:', e));
      });
      return () => {
        hls.destroy();
      };
    }

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = VIDEO_SRC;
      const onMeta = () => {
        video.play().catch((e) => console.log('Auto-play prevented:', e));
      };
      video.addEventListener('loadedmetadata', onMeta);
      return () => video.removeEventListener('loadedmetadata', onMeta);
    }

    return undefined;
  }, []);

  return (
    <video
      ref={videoRef}
      className="absolute inset-0 w-full h-full object-cover opacity-60"
      muted
      loop
      playsInline
      poster={POSTER}
      aria-hidden
    />
  );
}

function HeroSection() {
  return (
    <section className="relative w-full min-h-screen bg-black text-white overflow-hidden">
      <div className="absolute inset-0">
        <HeroVideo />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" aria-hidden />
        <div
          className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] bg-blue-900/20 blur-[120px] mix-blend-screen pointer-events-none"
          aria-hidden
        />
        <div
          className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] bg-indigo-900/20 blur-[120px] mix-blend-screen pointer-events-none"
          aria-hidden
        />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-5xl mx-auto px-6 mt-20 pt-24 pb-20 space-y-12 min-h-screen justify-center">
        <motion.p
          className="font-serif-display text-3xl sm:text-5xl lg:text-[48px] leading-[1.1] text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Design at the speed of thought
        </motion.p>

        <motion.h1
          className="text-6xl sm:text-8xl lg:text-[136px] font-semibold leading-[0.9] tracking-tighter bg-gradient-to-b from-white via-white to-[#b4c0ff] bg-clip-text text-transparent"
          style={{ fontFamily: 'Instrument Sans, sans-serif' }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          Build Faster
        </motion.h1>

        <motion.p
          className="text-lg sm:text-[20px] leading-[1.65] text-white max-w-xl"
          style={{ fontFamily: 'Instrument Sans, sans-serif' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          Create fully functional, SEO-optimized websites in seconds with our advanced AI engine.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row items-center gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <button
            type="button"
            className="group inline-flex items-center gap-3 pl-6 pr-2 py-2 rounded-full bg-white hover:scale-105 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all duration-300"
          >
            <span
              className="text-lg font-medium"
              style={{ fontFamily: 'Instrument Sans, sans-serif', color: '#0a0400' }}
            >
              Start Building Free
            </span>
            <span className="w-10 h-10 rounded-full bg-[#3054ff] group-hover:bg-[#2040e0] flex items-center justify-center transition-colors">
              <ArrowRight size={20} className="text-white" />
            </span>
          </button>

          <a
            href="#"
            className="group inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white/70 hover:text-white backdrop-blur-sm hover:bg-white/5 transition-all"
            style={{ fontFamily: 'Instrument Sans, sans-serif' }}
          >
            See Examples
            <ArrowRight
              size={18}
              className="transition-transform group-hover:translate-x-1"
            />
          </a>
        </motion.div>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <>
      <Navbar />
      <HeroSection />
    </>
  );
}
