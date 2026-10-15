/**
 * Lenis smooth scrolling driven by GSAP's ticker, so ScrollTrigger, Lenis and
 * the WebGL frame all advance in the same requestAnimationFrame.
 */
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initSmoothScroll({ reducedMotion, touch = false }) {
  let lenis = null;
  // Phones/tablets keep the browser's own touch scrolling (momentum, address-bar
  // collapse, rubber-banding); Lenis only smooths mouse wheels and trackpads.
  ScrollTrigger.config({ ignoreMobileResize: true });
  if (!reducedMotion && !touch) {
    lenis = new Lenis({
      lerp: 0.07,
      wheelMultiplier: 0.85,
      touchMultiplier: 1.15,
      smoothWheel: true,
      syncTouch: false, // native touch momentum stays native (best on mobile)
      autoRaf: false,
    });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
  }
  gsap.ticker.lagSmoothing(0);

  function scrollTo(target, opts = {}) {
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (lenis) lenis.scrollTo(el ?? target, { duration: 2.2, ...opts });
    else if (el?.scrollIntoView) el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    else window.scrollTo(0, target);
  }

  // in-page anchors go through Lenis
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    scrollTo(el, id === '#top' ? { duration: 3 } : {});
  });

  return { lenis, scrollTo, gsap, ScrollTrigger };
}
