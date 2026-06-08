import { useEffect, useRef, useState } from 'react';
import { gsap, ScrollTrigger } from './gsap-setup';
import { registerParallax } from './perf';

type ScrollVideoProps = {
  src: string;
  className?: string;
};

const SEEK_THRESHOLD = 0.045;
const LOADING_TIMEOUT_MS = 6000;

function isMobileDevice() {
  return (
    typeof window !== 'undefined' &&
    (window.matchMedia('(max-width: 768px)').matches ||
      window.matchMedia('(pointer: coarse)').matches)
  );
}

export default function ScrollVideo({ src, className = '' }: ScrollVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    const parallax = parallaxRef.current;
    if (!video) return undefined;

    let hls: import('hls.js').default | null = null;
    let disposed = false;
    let currentTarget = 0;
    let seekPending = false;
    let scrollRaf = 0;
    let latestProgress = 0;
    let lastSeekAt = -1;
    let loadingDone = false;

    const dismissLoading = () => {
      if (loadingDone || disposed) return;
      loadingDone = true;
      setLoading(false);
    };

    const updateProgress = () => {
      const dur = video.duration;
      if (!dur || !video.buffered.length) return;
      const pct = Math.min(
        100,
        Math.round((video.buffered.end(video.buffered.length - 1) / dur) * 100),
      );
      if (progressRef.current) progressRef.current.textContent = `${pct}%`;
      if (video.readyState >= 2) dismissLoading();
    };

    const doSeek = () => {
      if (!video.duration || Number.isNaN(video.duration)) return;
      if (Math.abs(video.currentTime - currentTarget) < SEEK_THRESHOLD) return;
      if (!video.seeking) {
        lastSeekAt = currentTarget;
        video.currentTime = currentTarget;
      }
    };

    const onSeeked = () => {
      if (seekPending) {
        seekPending = false;
        doSeek();
      }
    };

    const scheduleSeek = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        const duration = video.duration;
        if (!duration || Number.isNaN(duration)) return;
        currentTarget = latestProgress * duration;
        if (Math.abs(lastSeekAt - currentTarget) < SEEK_THRESHOLD) return;
        if (video.seeking) {
          seekPending = true;
        } else {
          doSeek();
        }
      });
    };

    const onLoadedMetadata = () => {
      updateProgress();
      dismissLoading();
    };

    const onLoadedData = () => dismissLoading();
    const onCanPlay = () => dismissLoading();
    const onProgress = () => updateProgress();

    video.addEventListener('seeked', onSeeked);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('canplaythrough', onCanPlay);
    video.addEventListener('progress', onProgress);

    const fallbackTimer = window.setTimeout(dismissLoading, LOADING_TIMEOUT_MS);

    const initHls = async () => {
      const useNativeHls = video.canPlayType('application/vnd.apple.mpegurl') !== '';

      if (useNativeHls) {
        video.removeAttribute('crossorigin');
        video.src = src;
        video.load();
        return;
      }

      video.crossOrigin = 'anonymous';

      const { default: Hls } = await import('hls.js');
      if (disposed || !Hls.isSupported()) {
        video.src = src;
        video.load();
        return;
      }

      const mobile = isMobileDevice();

      hls = new Hls({
        maxBufferLength: mobile ? 30 : 120,
        maxMaxBufferLength: mobile ? 60 : 600,
        maxBufferSize: mobile ? 60 * 1024 * 1024 : 200 * 1024 * 1024,
        startPosition: 0,
        capLevelToPlayerSize: false,
        startLevel: -1,
        autoStartLoad: true,
        enableWorker: !mobile,
      });

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!hls || !hls.levels.length) return;
        const maxLevel = hls.levels.length - 1;
        hls.currentLevel = maxLevel;
        hls.startLevel = maxLevel;
      });

      let lastProgress = -1;
      hls.on(Hls.Events.FRAG_BUFFERED, () => {
        const dur = video.duration;
        if (!dur || !video.buffered.length) return;
        const pct = Math.round((video.buffered.end(video.buffered.length - 1) / dur) * 100);
        if (pct === lastProgress) return;
        lastProgress = pct;
        if (progressRef.current) progressRef.current.textContent = `${pct}%`;
        dismissLoading();
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) dismissLoading();
      });
    };

    void initHls();

    const scrollTrigger = ScrollTrigger.create({
      trigger: document.documentElement,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      fastScrollEnd: true,
      onUpdate: (self) => {
        latestProgress = self.progress;
        scheduleSeek();
      },
    });

    const unregisterParallax =
      parallax &&
      registerParallax({
        el: parallax,
        xFactor: -30,
        yFactor: -30,
        duration: 1.5,
      });

    return () => {
      disposed = true;
      clearTimeout(fallbackTimer);
      unregisterParallax?.();
      if (scrollRaf) cancelAnimationFrame(scrollRaf);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('loadeddata', onLoadedData);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('canplaythrough', onCanPlay);
      video.removeEventListener('progress', onProgress);
      scrollTrigger.kill();
      hls?.destroy();
    };
  }, [src]);

  return (
    <>
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
          <p className="text-2xl font-sans text-white">
            Loading... <span ref={progressRef}>0%</span>
          </p>
        </div>
      )}
      <div
        className={`video-layer fixed top-0 left-0 w-full h-full z-0 scale-[1.05] origin-center ${className}`}
      >
        <div ref={parallaxRef} className="w-full h-full gpu-layer">
          <video
            ref={videoRef}
            className="w-full h-full object-cover scale-[1.35] gpu-layer"
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
          />
        </div>
      </div>
    </>
  );
}
