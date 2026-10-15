/**
 * Entry point. One loop (GSAP ticker) drives: Lenis → scroll progress →
 * camera → world → overlays → render. Nothing else requests animation frames.
 */
import { quality, reducedMotion, finePointer, isMobile } from './core/quality.js';
import { initSmoothScroll } from './core/smoothScroll.js';
import { CINEMA_VH, CINEMA_VH_MOBILE, blackouts, chapters } from './data/chapters.js';
import { Captions } from './ui/captions.js';
import { Hud } from './ui/hud.js';
import { WayfinderUI } from './ui/wayfinder.js';
import { initPortfolio } from './ui/portfolio.js';

// The procedural 3D world by default; the photographic version with ?engine=photo
// The procedural 3D world. The photographic experiment is available in development only (?engine=photo).
const ENGINE = import.meta.env.DEV && new URLSearchParams(location.search).get('engine') === 'photo' ? 'photo' : '3d';

const $ = (s) => document.querySelector(s);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

const loaderFill = $('#loader-fill');
const loaderPct = $('#loader-pct');
const loaderStep = $('#loader-step');
async function step(pct, label) {
  performance.mark(`boot:${pct}:${label}`);
  loaderFill.style.transform = `scaleX(${pct / 100})`;
  loaderPct.textContent = pct;
  loaderStep.textContent = label;
  await nextFrame();
  await nextFrame();
}

async function boot() {
  const cinema = $('#cinema');
  cinema.style.height = `${isMobile ? CINEMA_VH_MOBILE : CINEMA_VH}vh`;
  document.documentElement.classList.toggle('reduced-motion', reducedMotion);

  await step(5, 'loading fonts');
  try {
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]);
  } catch {
    /* fonts are optional */
  }

  const { gsap, ScrollTrigger } = initSmoothScroll({ reducedMotion, touch: isMobile });
  const hud = new Hud();
  const portfolio = initPortfolio($('#portfolio'), { gsap, ScrollTrigger, reducedMotion, hud });

  let engine;
  try {
    await step(12, 'initialising renderer');
    if (ENGINE === '3d') {
      const { ThreeEngine } = await import('./world/engine3d.js');
      performance.mark('boot:engine:imported');
      engine = new ThreeEngine($('#webgl'), { quality, reducedMotion, finePointer });
    } else {
      const { PhotoEngine } = await import('./photo/photoEngine.js');
      engine = new PhotoEngine($('#webgl'), { quality, reducedMotion, isMobile });
    }
  } catch (err) {
    // No WebGL: keep the story readable as text + the full portfolio.
    console.warn('WebGL unavailable, falling back to static mode', err);
    document.body.classList.add('no-webgl');
    finishLoading();
    portfolio.startMotion();
    const captions = new Captions($('#captions'));
    gsap.ticker.add(() => captions.update(progress(cinema)));
    return;
  }

  await step(20, ENGINE === '3d' ? 'building the world' : 'developing photographs');
  if (import.meta.env.DEV) window.__engine = engine; // dev-only debugging handle
  await engine.load((f) => step(20 + Math.round(f * 78), ENGINE === '3d' ? 'warming up scenes' : 'developing photographs'));
  const captions = new Captions($('#captions'));
  // overlays that depend on later scenes attach once the background build finishes
  let backupOverlay = null;
  let wf = null;
  engine.ready.then(() => {
    backupOverlay = engine.createBackupOverlay($('#labels3d'));
    wf = new WayfinderUI($('#wayfinder-ui'), engine.nav());
  });
  engine.update(0, 0.016, 0);
  engine.render();
  await step(100, 'ready');

  /* ---------------- scroll metrics (cached; never read layout per frame) ---------------- */
  let cinemaTop = 0;
  let cinemaLen = 1;
  let docLen = 1;
  // On phones the address bar showing/hiding changes innerHeight mid-scroll; use
  // the largest height seen for this width so the film never jumps.
  let viewW = window.innerWidth;
  let viewH = window.innerHeight;
  const measure = () => {
    if (window.innerWidth !== viewW || !isMobile) {
      viewW = window.innerWidth;
      viewH = window.innerHeight;
    } else viewH = Math.max(viewH, window.innerHeight);
    cinemaTop = cinema.offsetTop;
    cinemaLen = Math.max(1, cinema.offsetHeight - viewH);
    docLen = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  };
  measure();
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('orientationchange', () => setTimeout(measure, 300), { passive: true });
  ScrollTrigger.addEventListener('refresh', measure);

  const blackoutEl = $('#blackout');
  const canvas = engine.renderer.domElement;
  let pS = 0;
  let lastBlack = -1;
  let lastCanvasA = -1;
  let elapsed = 0;
  let wasInCinema = true;
  const overlays = [$('#wayfinder-ui'), $('#labels3d'), $('#blackout')];

  const blackoutAt = (p) => {
    let a = 0;
    const list = reducedMotion ? chapters.slice(1).map((c) => [c.start, 0.006]) : engine.usesBlackouts ? blackouts : [];
    for (const [c, w] of list) a = Math.max(a, 1 - clamp01(Math.abs(p - c) / w));
    // the reveal from black at the very start of the film
    return a;
  };

  gsap.ticker.add((_t, deltaMs) => {
    const dt = Math.min(deltaMs / 1000, 0.1);
    elapsed += dt;
    const y = window.scrollY;
    const pRaw = clamp01((y - cinemaTop) / cinemaLen);
    // light extra damping keeps native touch scrolling silky too
    pS = reducedMotion ? pRaw : pS + (pRaw - pS) * (1 - Math.exp(-dt * 8)); // a camera with weight
    if (Math.abs(pRaw - pS) < 1e-5) pS = pRaw;

    // canvas fades as the portfolio scrolls in; rendering stops entirely after that
    const after = (y - (cinemaTop + cinemaLen)) / viewH;
    const canvasA = 1 - clamp01(after / 0.9);
    if (Math.abs(canvasA - lastCanvasA) > 0.002) {
      lastCanvasA = canvasA;
      canvas.style.opacity = canvasA.toFixed(3);
      document.body.classList.toggle('past-cinema', canvasA < 0.02);
    }

    const inCinema = canvasA > 0.001;
    if (inCinema !== wasInCinema) {
      wasInCinema = inCinema;
      overlays.forEach((el) => (el.style.display = inCinema ? '' : 'none'));
    }
    hud.update(pS, clamp01(y / docLen), pRaw < 1 || after < 0.4);
    captions.update(pS);
    if (!inCinema || document.hidden) return;

    engine.update(pS, dt, elapsed);
    if (backupOverlay) backupOverlay.update(pS);
    if (wf) wf.update(pS, engine.walkD);

    const b = Math.round(blackoutAt(pS) * 1000) / 1000;
    if (b !== lastBlack) {
      lastBlack = b;
      blackoutEl.style.opacity = b;
    }
    engine.render();
    engine.adapt(dt, elapsed);
  });

  finishLoading(engine, gsap);
  // portfolio reveals: set up once the browser is idle after the reveal
  const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 1500));
  idle(() => {
    portfolio.startMotion();
    ScrollTrigger.refresh();
  });
}

function progress(cinema) {
  return clamp01((window.scrollY - cinema.offsetTop) / Math.max(1, cinema.offsetHeight - window.innerHeight));
}

function finishLoading(engine, gsap) {
  document.body.classList.remove('is-loading');
  document.body.classList.add('is-ready');
  const loader = $('#loader');
  loader.classList.add('is-done');
  setTimeout(() => loader.remove(), 1600);
  if (engine && gsap) {
    // the server room slowly emerges from darkness
    gsap.to(engine, { intro: 1, duration: reducedMotion ? 0.01 : 3.6, ease: 'power2.inOut', delay: 0.2 });
  }
}

boot();
