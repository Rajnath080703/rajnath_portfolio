import { CanvasTexture, SRGBColorSpace, RepeatWrapping, LinearMipmapLinearFilter, LinearFilter } from 'three';

export const FONT_UI = '"Inter Tight", "Segoe UI", Arial, sans-serif';
export const FONT_MONO = '"JetBrains Mono", Consolas, "Courier New", monospace';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

export function toTexture(canvas, { repeat, aniso = 8, mipmaps = true } = {}) {
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = aniso;
  t.generateMipmaps = mipmaps;
  t.minFilter = mipmaps ? LinearMipmapLinearFilter : LinearFilter;
  if (repeat) {
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

/** Deterministic PRNG so every visit renders the same world. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function fillRR(ctx, x, y, w, h, r, fill) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

/** Smooth pseudo-random series for demo charts. */
export function series(rand, n, base = 0.5, amp = 0.25, smooth = 0.82) {
  const out = [];
  let v = base;
  let vel = 0;
  for (let i = 0; i < n; i++) {
    vel = vel * smooth + (rand() - 0.5) * amp * 0.35;
    v += vel;
    v += (base - v) * 0.08;
    out.push(Math.max(0.03, Math.min(0.97, v)));
  }
  return out;
}

/** Thin 2px line chart with a faint area fill inside the rect. */
export function lineChart(ctx, x, y, w, h, data, color, fill = true) {
  const n = data.length;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const px = x + (i / (n - 1)) * w;
    const py = y + h - data[i] * h;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  if (fill) {
    ctx.save();
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, color.replace('rgb(', 'rgba(').replace(')', ',0.22)'));
    g.addColorStop(1, color.replace('rgb(', 'rgba(').replace(')', ',0)'));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const px = x + (i / (n - 1)) * w;
      const py = y + h - data[i] * h;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

/** Recessive horizontal grid lines. */
export function grid(ctx, x, y, w, h, rows = 4, color = 'rgba(255,255,255,0.06)') {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  for (let i = 0; i <= rows; i++) {
    const yy = Math.round(y + (i / rows) * h) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + w, yy);
    ctx.stroke();
  }
}

export function noiseFill(ctx, w, h, rand, alpha = 0.05, count = 4000) {
  for (let i = 0; i < count; i++) {
    const v = rand() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * rand()})`;
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
  }
}
