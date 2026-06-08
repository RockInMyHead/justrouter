import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

ScrollTrigger.config({
  limitCallbacks: true,
  ignoreMobileResize: true,
});

export { gsap, ScrollTrigger, ScrollToPlugin };
