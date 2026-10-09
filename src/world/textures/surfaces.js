/** Procedural surface textures: raised floor, vinyl, ceiling, facades, ground. */
import { makeCanvas, toTexture, rng, noiseFill } from './canvas.js';

/** Data-centre raised floor: 600mm tiles, some perforated. 1 texture = 4x4 tiles. */
export function raisedFloor() {
  const S = 1024;
  const [c, ctx] = makeCanvas(S, S);
  const rand = rng(5);
  const t = S / 4;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const v = 30 + rand() * 6;
      ctx.fillStyle = `rgb(${v},${v + 1},${v + 3})`;
      ctx.fillRect(i * t, j * t, t, t);
      if ((i + j * 3) % 5 === 1) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        for (let x = 14; x < t - 10; x += 12) for (let y = 14; y < t - 10; y += 12) ctx.fillRect(i * t + x, j * t + y, 6, 6);
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      ctx.lineWidth = 3;
      ctx.strokeRect(i * t + 1.5, j * t + 1.5, t - 3, t - 3);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.strokeRect(i * t + 4.5, j * t + 4.5, t - 9, t - 9);
    }
  }
  noiseFill(ctx, S, S, rand, 0.06, 9000);
  return toTexture(c, { repeat: [1, 1] });
}

/** Lab vinyl floor — soft speckle with tile seams. */
export function vinylFloor() {
  const S = 512;
  const [c, ctx] = makeCanvas(S, S);
  const rand = rng(8);
  ctx.fillStyle = '#3a3c40';
  ctx.fillRect(0, 0, S, S);
  noiseFill(ctx, S, S, rand, 0.12, 14000);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * (S / 2), 0);
    ctx.lineTo(i * (S / 2), S);
    ctx.moveTo(0, i * (S / 2));
    ctx.lineTo(S, i * (S / 2));
    ctx.stroke();
  }
  return toTexture(c, { repeat: [1, 1] });
}

/** Acoustic ceiling grid. */
export function ceilingGrid() {
  const S = 256;
  const [c, ctx] = makeCanvas(S, S);
  const rand = rng(12);
  ctx.fillStyle = '#9a9ca0';
  ctx.fillRect(0, 0, S, S);
  noiseFill(ctx, S, S, rand, 0.15, 5000);
  ctx.strokeStyle = '#d4d6d9';
  ctx.lineWidth = 6;
  ctx.strokeRect(0, 0, S, S);
  return toTexture(c, { repeat: [1, 1] });
}

/** Building facade with lit / unlit windows + matching emissive mask. */
export function facadeTextures() {
  const S = 512;
  const [c, ctx] = makeCanvas(S, S);
  const [e, ectx] = makeCanvas(S, S);
  const rand = rng(31);
  ctx.fillStyle = '#4a4c50';
  ctx.fillRect(0, 0, S, S);
  noiseFill(ctx, S, S, rand, 0.1, 6000);
  ectx.fillStyle = '#000';
  ectx.fillRect(0, 0, S, S);
  const cw = S / 8;
  const rh = S / 8;
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const lit = rand() > 0.64;
      const warm = 200 + rand() * 40;
      const x = i * cw + cw * 0.14;
      const y = j * rh + rh * 0.2;
      ctx.fillStyle = lit ? `rgb(${warm},${warm * 0.82},${warm * 0.58})` : `rgb(${22 + rand() * 10},${26 + rand() * 10},${32 + rand() * 12})`;
      ctx.fillRect(x, y, cw * 0.72, rh * 0.56);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x, j * rh + rh * 0.47, cw * 0.72, 2);
      if (lit) {
        ectx.fillStyle = `rgb(${warm},${warm * 0.8},${warm * 0.55})`;
        ectx.fillRect(x, y, cw * 0.72, rh * 0.56);
      }
    }
  }
  // roof patch (top-left corner) – plain dark, no emission
  ctx.fillStyle = '#2a2c30';
  ctx.fillRect(0, 0, 10, 10);
  return { map: toTexture(c), emissive: toTexture(e) };
}

/** Campus ground: dusk grass with subtle variation. */
export function groundTexture() {
  const S = 512;
  const [c, ctx] = makeCanvas(S, S);
  const rand = rng(41);
  ctx.fillStyle = '#1e2620';
  ctx.fillRect(0, 0, S, S);
  // grass blades written directly into the pixel buffer (fast)
  const img = ctx.getImageData(0, 0, S, S);
  const d = img.data;
  for (let i = 0; i < 18000; i++) {
    const g = 30 + rand() * 30;
    const x0 = (rand() * S) | 0;
    const y0 = (rand() * S) | 0;
    for (let y = y0; y < Math.min(S, y0 + 3); y++) {
      for (let x = x0; x < Math.min(S, x0 + 2); x++) {
        const k = (y * S + x) * 4;
        d[k] += (g * 0.7 - d[k]) * 0.35;
        d[k + 1] += (g - d[k + 1]) * 0.35;
        d[k + 2] += (g * 0.75 - d[k + 2]) * 0.35;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return toTexture(c, { repeat: [1, 1] });
}

export function asphaltTexture() {
  const S = 256;
  const [c, ctx] = makeCanvas(S, S);
  const rand = rng(43);
  ctx.fillStyle = '#3c3f43';
  ctx.fillRect(0, 0, S, S);
  noiseFill(ctx, S, S, rand, 0.25, 9000);
  return toTexture(c, { repeat: [1, 1] });
}

/** Soft radial sprite used for LEDs, dust and light glows. */
export function glowSprite() {
  const S = 64;
  const [c, ctx] = makeCanvas(S, S);
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  return toTexture(c, { mipmaps: true });
}

/**
 * Surface wear for metal & plastic: fingerprints, smudges and fine scratches
 * encoded as roughness variation (used as roughnessMap; green channel).
 */
export function wearTexture() {
  const S = 512;
  const [c, ctx] = makeCanvas(S, S);
  const rand = rng(97);
  ctx.fillStyle = 'rgb(150,150,150)';
  ctx.fillRect(0, 0, S, S);
  // soft smudges
  for (let i = 0; i < 60; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const r = 10 + rand() * 50;
    const v = rand() > 0.5 ? 175 : 128;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${v},${v},${v},${0.15 + rand() * 0.15})`);
    g.addColorStop(1, `rgba(${v},${v},${v},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // fine directional scratches
  ctx.lineWidth = 1;
  for (let i = 0; i < 260; i++) {
    const x = rand() * S;
    const y = rand() * S;
    const len = 6 + rand() * 40;
    const a = (rand() - 0.5) * 0.5;
    const sv = rand() > 0.5 ? 190 : 115;
    ctx.strokeStyle = `rgba(${sv},${sv},${sv},${0.1 + rand() * 0.15})`;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  noiseFill(ctx, S, S, rand, 0.04, 6000);
  const t = toTexture(c, { repeat: [3, 3] });
  t.colorSpace = '';
  return t;
}

/** Perforated rack door (alpha): ~60% open hex perforation inside a solid frame. */
export function perforatedDoor() {
  const W = 256;
  const H = 768;
  const [c, ctx] = makeCanvas(W, H);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#000';
  const m = 16;
  const step = 7;
  let row = 0;
  for (let y = m + 4; y < H - m - 4; y += step * 0.87, row++) {
    for (let x = m + 4 + (row % 2 ? step / 2 : 0); x < W - m - 4; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // handle area stays solid
  ctx.fillStyle = '#fff';
  ctx.fillRect(W - m - 22, H * 0.42, 18, H * 0.16);
  const t = toTexture(c);
  t.colorSpace = '';
  return t;
}

/** Small engraved row label plate. */
export function rowLabel(text) {
  const [c, ctx] = makeCanvas(256, 96);
  ctx.fillStyle = '#e4e5e2';
  ctx.fillRect(0, 0, 256, 96);
  ctx.strokeStyle = '#9a9c98';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 248, 88);
  ctx.fillStyle = '#1f2124';
  ctx.font = '700 46px "Inter Tight", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 52);
  return toTexture(c);
}
