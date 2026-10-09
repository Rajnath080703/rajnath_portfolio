/**
 * WayFinder overlays:
 *  - Map UI (destination search + route card) over the campus map.
 *  - LIVE AR VIEW: a phone whose screen is a window onto the street view,
 *    with only directional cues, building identification and arrival.
 *
 * Engine-agnostic: a `nav` adapter supplies the cue, the timing and where the
 * destination building is on screen (photo engine or 3D engine).
 *   nav.cue(p, walkD) → 'up' | 'right' | 'left'
 *   nav.identifiedAt, nav.arrivedAt → progress values
 *   nav.target(p) → { x0, y0, x1, y1 } screen px of the building (or a point when x0 === x1)
 */

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const ss = (a, b, x) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const ARROW = {
  up: '<path d="M32 6 L54 34 H41 V58 H23 V34 H10 Z"/>',
  right: '<path d="M58 32 L30 54 V41 H8 V23 H30 V10 Z"/>',
  left: '<path d="M6 32 L34 10 V23 H56 V41 H34 V54 Z"/>',
};

export class WayfinderUI {
  constructor(root, nav) {
    this.nav = nav;
    root.innerHTML = `
      <div class="wf-map">
        <div class="wf-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 L21 21"/></svg>
          <span class="wf-search__ph">Search campus</span><span class="wf-search__q"></span><i class="wf-caret"></i>
        </div>
        <div class="wf-card">
          <p class="wf-card__k mono">WayFinder · Smart Campus Navigation</p>
          <p class="wf-card__t">Library</p>
          <p class="wf-card__s">Walking route · ready</p>
          <div class="wf-card__steps mono"><span>Main gate</span><i></i><span>Turn right</span><i></i><span>Turn left</span><i></i><span>Library</span></div>
          <button class="wf-card__btn mono" tabindex="-1">Start Live AR View</button>
        </div>
      </div>
      <div class="ar">
        <div class="ar__phone">
          <div class="ar__screen">
            <div class="ar__status mono"><span>LIVE AR VIEW</span><span class="ar__rec"><i></i>CAMERA</span></div>
            <div class="ar__cue">
              <svg class="ar__cue-icon" viewBox="0 0 64 64" aria-hidden="true">${ARROW.up}</svg>
              <div><p class="ar__cue-t">Continue straight</p><p class="ar__cue-s mono">to Library</p></div>
            </div>
            <div class="ar__floor"><svg viewBox="0 0 64 64" aria-hidden="true">${ARROW.up}</svg></div>
            <div class="ar__box"><i></i><i></i><i></i><i></i></div>
            <div class="ar__tag"><span class="mono">BUILDING IDENTIFIED</span><strong>Library</strong></div>
            <div class="ar__reached"><span class="ar__check"></span><p class="mono">DESTINATION REACHED</p><strong>Library</strong></div>
            <div class="ar__reticle"></div>
          </div>
        </div>
      </div>`;
    this.root = root;
    this.map = root.querySelector('.wf-map');
    this.q = root.querySelector('.wf-search__q');
    this.ph = root.querySelector('.wf-search__ph');
    this.card = root.querySelector('.wf-card');
    this.btn = root.querySelector('.wf-card__btn');
    this.ar = root.querySelector('.ar');
    this.phone = root.querySelector('.ar__phone');
    this.screen = root.querySelector('.ar__screen');
    this.cueIcon = root.querySelector('.ar__cue-icon');
    this.cueT = root.querySelector('.ar__cue-t');
    this.cueS = root.querySelector('.ar__cue-s');
    this.floor = root.querySelector('.ar__floor');
    this.tag = root.querySelector('.ar__tag');
    this.reached = root.querySelector('.ar__reached');
    this.cue = root.querySelector('.ar__cue');
    this.box = root.querySelector('.ar__box');
    this.state = {};
    this.rect = null;
    window.addEventListener('resize', () => (this.rect = null), { passive: true });
  }

  set(key, val, fn) {
    if (this.state[key] === val) return;
    this.state[key] = val;
    fn(val);
  }

  update(p, walkD) {
    /* ---- map UI ---- */
    const mapA = ss(0.79, 0.8, p) * (1 - ss(0.858, 0.868, p));
    this.set('mapA', Math.round(mapA * 100), (v) => {
      this.map.style.opacity = v / 100;
      this.map.style.visibility = v ? 'visible' : 'hidden';
    });
    const typed = Math.round(ss(0.8, 0.815, p) * 7);
    this.set('typed', typed, (n) => {
      this.q.textContent = 'Library'.slice(0, n);
      this.ph.style.display = n ? 'none' : '';
    });
    this.set('card', p > 0.818, (on) => this.card.classList.toggle('is-in', on));
    this.set('btn', p > 0.85, (on) => this.btn.classList.toggle('is-pressed', on));

    /* ---- AR phone ---- */
    const arIn = ss(0.862, 0.878, p);
    const arOut = ss(0.988, 1.0, p);
    const arA = Math.round(arIn * (1 - ss(0.996, 1.0, p)) * 1000) / 1000;
    this.set('arA', arA, (a) => {
      this.ar.style.opacity = a;
      this.ar.style.visibility = a ? 'visible' : 'hidden';
    });
    const scale = (1.25 - arIn * 0.25) * (1 + arOut * 1.6);
    this.set('scale', Math.round(scale * 1000), () => {
      this.rect = null;
      this.phone.style.transform = `translate3d(-50%,-50%,0) scale(${scale.toFixed(3)})`;
    });
    this.set('fadeOut', Math.round(arOut * 100), (v) => this.screen.style.setProperty('--exit', v / 100));
    if (arA <= 0) return;

    const dir = this.nav.cue(p, walkD);
    let text = { up: 'Continue straight', right: 'Turn right', left: 'Turn left' }[dir];
    const identified = p > this.nav.identifiedAt;
    const arrived = p > this.nav.arrivedAt;
    if (identified && !arrived) text = 'Library ahead';
    this.set('dir', dir, (d) => {
      this.cueIcon.innerHTML = ARROW[d];
      this.floor.querySelector('svg').innerHTML = ARROW.up;
      this.floor.dataset.dir = d;
    });
    this.set('text', text, (s) => (this.cueT.textContent = s));
    this.set('arrived', arrived, (on) => {
      this.reached.classList.toggle('is-in', on);
      this.cue.classList.toggle('is-out', on);
      this.floor.classList.toggle('is-out', on);
    });

    // building tag follows the projected library inside the phone screen
    this.set('identified', identified, (on) => {
      this.tag.classList.toggle('is-in', on);
      this.box.classList.toggle('is-in', on);
    });
    const t = identified ? this.nav.target(p) : null;
    if (t) {
      if (!this.rect) this.rect = this.screen.getBoundingClientRect();
      const r = this.rect;
      const x0 = Math.max(8, t.x0 - r.left);
      const y0 = Math.max(70, t.y0 - r.top);
      const x1 = Math.min(r.width - 8, t.x1 - r.left);
      const y1 = Math.min(r.height - 30, t.y1 - r.top);
      const hasBox = x1 - x0 > 20;
      this.box.style.display = hasBox ? '' : 'none';
      if (hasBox) {
        this.box.style.transform = `translate3d(${x0.toFixed(1)}px, ${y0.toFixed(1)}px, 0)`;
        this.box.style.width = `${(x1 - x0).toFixed(1)}px`;
        this.box.style.height = `${(y1 - y0).toFixed(1)}px`;
      }
      const tx = Math.min(r.width - 70, Math.max(70, (x0 + x1) / 2));
      const ty = Math.min(r.height * 0.6, Math.max(hasBox ? 215 : 90, hasBox ? y0 + 46 : y0));
      this.tag.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) translate(-50%, -100%)`;
    }
  }
}
