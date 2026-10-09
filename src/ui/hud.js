/** Chapter indicator, page progress and the scroll hint. */
import { chapters } from '../data/chapters.js';

export class Hud {
  constructor() {
    this.num = document.getElementById('hud-num');
    this.label = document.getElementById('hud-label');
    this.bar = document.getElementById('hud-progress');
    this.hint = document.getElementById('scroll-hint');
    this.current = '';
    this.lastBar = -1;
    this.sectionLabel = null; // set by portfolio sections once past the cinema
  }

  set(num, label) {
    const key = num + label;
    if (key === this.current) return;
    this.current = key;
    this.num.textContent = num;
    this.label.textContent = label;
  }

  update(p, pageProgress, inCinema) {
    if (inCinema) {
      const c = chapters.find((ch) => p >= ch.start && p < ch.end) || chapters[chapters.length - 1];
      this.set(c.num, c.label);
    } else if (this.sectionLabel) {
      this.set(this.sectionLabel[0], this.sectionLabel[1]);
    }
    const b = Math.round(pageProgress * 1000) / 1000;
    if (b !== this.lastBar) {
      this.lastBar = b;
      this.bar.style.transform = `scaleY(${b})`;
    }
    this.hint.classList.toggle('is-hidden', p > 0.006);
  }
}
