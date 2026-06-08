import { gsap } from './gsap-setup';

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const isFinePointer = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

type ParallaxTarget = {
  el: HTMLElement;
  xFactor: number;
  yFactor: number;
  rotY?: number;
  rotX?: number;
  duration?: number;
};

const parallaxTargets: ParallaxTarget[] = [];
let moveX = 0;
let moveY = 0;
let parallaxRaf = 0;
let parallaxListening = false;

function applyParallax() {
  parallaxRaf = 0;
  for (const target of parallaxTargets) {
    gsap.to(target.el, {
      x: moveX * target.xFactor,
      y: moveY * target.yFactor,
      ...(target.rotY != null ? { rotationY: moveX * target.rotY } : {}),
      ...(target.rotX != null ? { rotationX: -moveY * target.rotX } : {}),
      duration: target.duration ?? 1.2,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  }
}

function onPointerMove(event: PointerEvent) {
  moveX = (event.clientX / window.innerWidth - 0.5) * 2;
  moveY = (event.clientY / window.innerHeight - 0.5) * 2;
  if (!parallaxRaf) parallaxRaf = requestAnimationFrame(applyParallax);
}

function startParallaxListener() {
  if (parallaxListening || prefersReducedMotion() || !isFinePointer()) return;
  parallaxListening = true;
  window.addEventListener('pointermove', onPointerMove, { passive: true });
}

function stopParallaxListener() {
  if (!parallaxListening) return;
  parallaxListening = false;
  window.removeEventListener('pointermove', onPointerMove);
  if (parallaxRaf) {
    cancelAnimationFrame(parallaxRaf);
    parallaxRaf = 0;
  }
}

export function registerParallax(target: ParallaxTarget): () => void {
  parallaxTargets.push(target);
  startParallaxListener();
  return () => {
    const index = parallaxTargets.indexOf(target);
    if (index >= 0) parallaxTargets.splice(index, 1);
    if (!parallaxTargets.length) stopParallaxListener();
  };
}

export function rafThrottle<T extends (...args: never[]) => void>(fn: T): T {
  let id = 0;
  let lastArgs: Parameters<T> | null = null;
  const run = () => {
    id = 0;
    if (lastArgs) fn(...lastArgs);
  };
  return ((...args: Parameters<T>) => {
    lastArgs = args;
    if (!id) id = requestAnimationFrame(run);
  }) as T;
}
