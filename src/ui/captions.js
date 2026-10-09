/**
 * Scroll-linked chapter captions. Opacity / drift come straight from the
 * camera's progress value, so text and camera never drift apart.
 * Only transform + opacity are written (compositor-only), and only on change.
 */
import { captions } from '../data/chapters.js';

const FADE = 0.012;
const ss = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Static caption markup (build-time pre-render; the client rebuilds it). */
export function renderCaptions() {
  return captions.map((c) => `<div class="cap cap--${c.pos}">${c.html}</div>`).join('');
}

export class Captions {
  constructor(root) {
    root.innerHTML = ''; // replace the pre-rendered copy
    this.items = captions.map((c) => {
      const el = document.createElement('div');
      el.className = `cap cap--${c.pos}`;
      el.innerHTML = c.html;
      root.appendChild(el);
      return { ...c, el, last: -1 };
    });
    this.installBar = root.querySelector('[data-install-bar]');
    this.installPct = root.querySelector('[data-install-pct]');
    this.lastPct = -1;
  }

  update(p) {
    for (const it of this.items) {
      const a = (it.in < 0 ? 1 : ss(it.in, it.in + FADE, p)) * (1 - ss(it.out - FADE, it.out, p));
      const q = Math.round(a * 1000) / 1000;
      if (q === it.last) continue;
      it.last = q;
      const inPhase = it.in < 0 || p < (it.in + it.out) / 2;
      const drift = (1 - q) * (inPhase ? 28 : -28);
      it.el.style.opacity = q;
      it.el.style.transform = `translate3d(0, ${drift.toFixed(1)}px, 0)`;
      it.el.style.visibility = q <= 0 ? 'hidden' : 'visible';
      it.el.classList.toggle('is-active', q > 0.5);
    }
    // install progress mirror (same mapping as the 3D monitor)
    const pct = Math.round(Math.min(1, Math.max(0, (p - 0.385) / (0.455 - 0.385))) * 100);
    if (pct !== this.lastPct && this.installPct) {
      this.lastPct = pct;
      this.installPct.textContent = pct;
      this.installBar.style.transform = `scaleX(${pct / 100})`;
    }
  }
}
