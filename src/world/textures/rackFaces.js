/**
 * Procedural front panels for rack equipment (servers, storage, switches,
 * patch panels…). Drawn once into canvases at load — no image downloads.
 *
 * Each drawer works in a unit rectangle (0,0,W,H) and records LED + port
 * positions (px) so the 3D layer can place blinking LEDs and cables exactly.
 */
import { makeCanvas, toTexture, rng, fillRR, FONT_UI } from './canvas.js';

export const U = 0.04445; // 1 rack unit in metres
export const PANEL_W = 0.482; // 19" panel width in metres
export const PX_PER_U = 94; // hero resolution

export const LED = {
  green: [0.36, 0.86, 0.52],
  amber: [0.95, 0.62, 0.22],
  blue: [0.5, 0.72, 1.0],
  white: [0.9, 0.92, 0.95],
};

function bezel(ctx, W, H, k, tone = 34) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `rgb(${tone + 14},${tone + 15},${tone + 18})`);
  g.addColorStop(0.08, `rgb(${tone},${tone + 1},${tone + 4})`);
  g.addColorStop(0.92, `rgb(${tone - 8},${tone - 7},${tone - 5})`);
  g.addColorStop(1, `rgb(${tone - 18},${tone - 18},${tone - 16})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // rack ears
  const ear = W * 0.045;
  ctx.fillStyle = `rgb(${tone - 10},${tone - 10},${tone - 8})`;
  ctx.fillRect(0, 0, ear, H);
  ctx.fillRect(W - ear, 0, ear, H);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  const sr = Math.max(1, 5 * k);
  for (const x of [ear * 0.5, W - ear * 0.5]) {
    for (let yy = H * 0.5 - (H > 120 * k ? H * 0.3 : 0); yy <= H * 0.5 + (H > 120 * k ? H * 0.3 : 0) + 1; yy += Math.max(H * 0.6, 1)) {
      ctx.beginPath();
      ctx.arc(x, yy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // seam lines
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, H - Math.max(1, 2 * k), W, Math.max(1, 2 * k));
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fillRect(0, 0, W, Math.max(1, 1.5 * k));
  return ear;
}

function vents(ctx, x, y, w, h, k, rand) {
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  const step = Math.max(3, 11 * k);
  const r = Math.max(0.8, 3.2 * k);
  let row = 0;
  for (let yy = y + step * 0.6; yy < y + h - step * 0.3; yy += step * 0.87, row++) {
    for (let xx = x + (row % 2 ? step * 0.5 : 0) + step * 0.5; xx < x + w - step * 0.3; xx += step) {
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function driveBays(ctx, x, y, w, h, cols, rows, k, out, rand, vertical = false) {
  const gap = Math.max(1, 4 * k);
  const bw = (w - gap * (cols - 1)) / cols;
  const bh = (h - gap * (rows - 1)) / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bx = x + c * (bw + gap);
      const by = y + r * (bh + gap);
      fillRR(ctx, bx, by, bw, bh, 2 * k, '#17181b');
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(bx, by, bw, Math.max(1, 1.5 * k));
      // latch + grip lines
      ctx.fillStyle = '#2a2c31';
      if (vertical) {
        ctx.fillRect(bx + bw * 0.2, by + bh * 0.08, bw * 0.6, bh * 0.12);
        for (let i = 0; i < 6; i++) ctx.fillRect(bx + bw * 0.25, by + bh * (0.3 + i * 0.09), bw * 0.5, Math.max(1, 2 * k));
      } else {
        ctx.fillRect(bx + bw * 0.06, by + bh * 0.25, bw * 0.12, bh * 0.5);
        for (let i = 0; i < 7; i++) ctx.fillRect(bx + bw * (0.3 + i * 0.08), by + bh * 0.3, Math.max(1, 2 * k), bh * 0.4);
      }
      out.leds.push({
        x: vertical ? bx + bw * 0.5 : bx + bw * 0.9,
        y: vertical ? by + bh * 0.93 : by + bh * 0.5,
        c: rand() > 0.1 ? 'green' : 'blue',
        rate: 2 + rand() * 9,
        duty: 0.35 + rand() * 0.4,
      });
    }
  }
}

function label(ctx, text, x, y, k, size = 13, color = 'rgba(210,214,220,0.55)') {
  ctx.fillStyle = color;
  ctx.font = `600 ${Math.max(5, size * k)}px ${FONT_UI}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
}

function statusCluster(ctx, x, y, k, out, rand, H) {
  // power button + status/ID LEDs
  ctx.fillStyle = '#121316';
  ctx.beginPath();
  ctx.arc(x, y, 9 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = Math.max(1, 1.5 * k);
  ctx.stroke();
  out.leds.push({ x, y, c: 'green', rate: 0, duty: 1 });
  out.leds.push({ x: x + 26 * k, y: y - Math.min(14 * k, H * 0.2), c: 'blue', rate: rand() > 0.7 ? 0.6 : 0, duty: 0.5 });
  out.leds.push({ x: x + 26 * k, y: y + Math.min(14 * k, H * 0.2), c: rand() > 0.85 ? 'amber' : 'green', rate: 0, duty: 1 });
}

function rj45(ctx, x, y, w, h, k) {
  ctx.fillStyle = '#050506';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#0d0e10';
  ctx.fillRect(x + w * 0.3, y + h * 0.78, w * 0.4, h * 0.22); // latch notch
  ctx.fillStyle = 'rgba(190,150,60,0.35)';
  for (let i = 0; i < 8; i++) ctx.fillRect(x + w * (0.12 + i * 0.1), y + h * 0.08, Math.max(0.6, w * 0.04), h * 0.18);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = Math.max(0.5, 1 * k);
  ctx.strokeRect(x, y, w, h);
}

export const drawers = {
  server1u(ctx, W, H, k, out, rand) {
    const ear = bezel(ctx, W, H, k, 36);
    driveBays(ctx, ear + 14 * k, H * 0.14, W * 0.5, H * 0.72, 8, 1, k, out, rand, true);
    vents(ctx, ear + W * 0.53, H * 0.12, W * 0.28, H * 0.76, k, rand);
    statusCluster(ctx, W - ear - 60 * k, H * 0.5, k, out, rand, H);
    label(ctx, 'R1-' + Math.floor(rand() * 90 + 10), W - ear - 150 * k, H * 0.5, k, 12);
  },
  server2u(ctx, W, H, k, out, rand) {
    const ear = bezel(ctx, W, H, k, 38);
    driveBays(ctx, ear + 14 * k, H * 0.1, W * 0.62, H * 0.8, 12, 2, k, out, rand, true);
    vents(ctx, ear + W * 0.66, H * 0.1, W * 0.18, H * 0.8, k, rand);
    statusCluster(ctx, W - ear - 60 * k, H * 0.32, k, out, rand, H);
    label(ctx, 'SRV', W - ear - 90 * k, H * 0.75, k, 13);
  },
  storage2u(ctx, W, H, k, out, rand) {
    const ear = bezel(ctx, W, H, k, 30);
    driveBays(ctx, ear + 12 * k, H * 0.08, W - ear * 2 - 24 * k, H * 0.84, 24, 1, k, out, rand, true);
  },
  storage4u(ctx, W, H, k, out, rand) {
    const ear = bezel(ctx, W, H, k, 32);
    driveBays(ctx, ear + 14 * k, H * 0.08, W - ear * 2 - 120 * k, H * 0.84, 4, 3, k, out, rand, false);
    statusCluster(ctx, W - ear - 60 * k, H * 0.15, k, out, rand, H);
    label(ctx, 'NAS', W - ear - 90 * k, H * 0.88, k, 16);
  },
  gpu4u(ctx, W, H, k, out, rand) {
    const ear = bezel(ctx, W, H, k, 28);
    fillRR(ctx, ear + 12 * k, H * 0.08, W * 0.72, H * 0.84, 4 * k, '#141518');
    vents(ctx, ear + 16 * k, H * 0.1, W * 0.71, H * 0.8, k * 1.2, rand);
    driveBays(ctx, W * 0.8, H * 0.1, W * 0.11, H * 0.5, 2, 2, k, out, rand, false);
    statusCluster(ctx, W * 0.83, H * 0.78, k, out, rand, H);
    label(ctx, 'GPU', W * 0.81, H * 0.92, k, 15);
  },
  switch1u(ctx, W, H, k, out, rand) {
    const ear = bezel(ctx, W, H, k, 30);
    const pw = 26 * k;
    const ph = H * 0.34;
    const gap = 4.2 * k;
    let x = ear + 70 * k;
    label(ctx, '48-PORT GIGABIT', ear + 6 * k, H * 0.5, k, 9);
    for (let g = 0; g < 4; g++) {
      for (let c = 0; c < 6; c++) {
        for (let r = 0; r < 2; r++) {
          const px = x + c * (pw + gap);
          const py = r === 0 ? H * 0.1 : H * 0.56;
          rj45(ctx, px, py, pw, ph, k);
          out.ports.push({ x: px + pw / 2, y: py + ph / 2, w: pw, h: ph, row: r });
          out.leds.push({ x: px + pw * 0.5, y: r === 0 ? py + ph + 4 * k : py - 4 * k, c: rand() > 0.15 ? 'green' : 'amber', rate: rand() > 0.3 ? 3 + rand() * 14 : 0, duty: 0.5, size: 0.6 });
        }
      }
      x += 6 * (pw + gap) + 12 * k;
    }
    // SFP cages
    for (let i = 0; i < 4; i++) {
      fillRR(ctx, x + 8 * k + i * 40 * k, H * 0.25, 34 * k, H * 0.5, 2 * k, '#0b0c0e');
      out.leds.push({ x: x + 25 * k + i * 40 * k, y: H * 0.15, c: 'green', rate: i < 2 ? 6 : 0, duty: 0.5, size: 0.6 });
    }
    statusCluster(ctx, W - ear - 30 * k, H * 0.5, k * 0.8, out, rand, H);
  },
  patch24(ctx, W, H, k, out, rand) {
    bezel(ctx, W, H, k, 22);
    const ear = W * 0.045;
    const pw = 28 * k;
    const ph = H * 0.42;
    const span = W - ear * 2 - 60 * k;
    for (let i = 0; i < 24; i++) {
      const px = ear + 30 * k + (i + Math.floor(i / 6) * 0.6) * (span / 27.6);
      const py = H * 0.38;
      rj45(ctx, px, py, pw, ph, k);
      out.ports.push({ x: px + pw / 2, y: py + ph / 2, w: pw, h: ph, row: 0 });
      ctx.fillStyle = 'rgba(235,236,238,0.75)';
      ctx.font = `600 ${Math.max(5, 11 * k)}px ${FONT_UI}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), px + pw / 2, H * 0.2);
      ctx.textAlign = 'left';
    }
  },
  cablemgr(ctx, W, H, k) {
    bezel(ctx, W, H, k, 20);
    ctx.fillStyle = '#08090a';
    ctx.fillRect(W * 0.07, H * 0.3, W * 0.86, H * 0.4);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let x = W * 0.07; x < W * 0.93; x += 3 * k + 1) ctx.fillRect(x, H * 0.3, 1, H * 0.4);
  },
  blank(ctx, W, H, k) {
    bezel(ctx, W, H, k, 24);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(W * 0.05, H * 0.5, W * 0.9, 1);
  },
  firewall1u(ctx, W, H, k, out, rand) {
    const ear = bezel(ctx, W, H, k, 40);
    label(ctx, 'EDGE', ear + 20 * k, H * 0.5, k, 14, 'rgba(230,232,236,0.7)');
    for (let i = 0; i < 8; i++) {
      const px = W * 0.35 + i * 34 * k;
      rj45(ctx, px, H * 0.25, 26 * k, H * 0.5, k);
      out.ports.push({ x: px + 13 * k, y: H * 0.5, w: 26 * k, h: H * 0.5, row: 0 });
      out.leds.push({ x: px + 13 * k, y: H * 0.15, c: 'green', rate: i < 5 ? 5 + rand() * 8 : 0, duty: 0.5, size: 0.6 });
    }
    statusCluster(ctx, W - ear - 50 * k, H * 0.5, k * 0.8, out, rand, H);
  },
  ups2u(ctx, W, H, k, out, rand) {
    const ear = bezel(ctx, W, H, k, 26);
    vents(ctx, ear + 12 * k, H * 0.12, W * 0.55, H * 0.76, k, rand);
    fillRR(ctx, W * 0.66, H * 0.22, W * 0.14, H * 0.4, 3 * k, '#0e1a14');
    ctx.fillStyle = 'rgba(150,220,180,0.55)';
    ctx.font = `500 ${Math.max(5, 14 * k)}px ${FONT_UI}`;
    ctx.fillText('ONLINE', W * 0.675, H * 0.42);
    statusCluster(ctx, W * 0.86, H * 0.42, k, out, rand, H);
    label(ctx, 'UPS', W * 0.66, H * 0.8, k, 14);
  },
};

export const UNIT_HEIGHT = {
  server1u: 1, server2u: 2, storage2u: 2, storage4u: 4, gpu4u: 4, switch1u: 1, patch24: 1, cablemgr: 1, blank: 1, firewall1u: 1, ups2u: 2,
};

/** The hero rack, bottom (U1) to top (U42). `u` is the starting unit. */
export const HERO_LAYOUT = (() => {
  const seq = [
    'ups2u', 'storage4u', 'storage2u', 'blank', 'server2u', 'server2u', 'gpu4u', 'blank',
    'server1u', 'server1u', 'server1u', 'server1u', 'blank', 'server2u', 'server2u', 'blank',
    // network block: switch ▸ horizontal manager ▸ patch panel (cords drop through the manager)
    'switch1u', 'cablemgr', 'patch24', 'blank', 'switch1u', 'cablemgr', 'patch24', 'cablemgr', 'firewall1u',
  ];
  let u = 1;
  const out = [];
  for (const type of seq) {
    out.push({ type, u, h: UNIT_HEIGHT[type] });
    u += UNIT_HEIGHT[type];
  }
  while (u <= 42) out.push({ type: 'blank', u: u++, h: 1 });
  return out;
})();

/** Draw a single unit into its own texture (hero close-ups). */
export function unitTexture(type, seed) {
  const h = UNIT_HEIGHT[type];
  const W = 1024;
  const H = Math.round(h * PX_PER_U);
  const [c, ctx] = makeCanvas(W, H);
  const out = { leds: [], ports: [] };
  drawers[type](ctx, W, H, 1, out, rng(seed));
  return { texture: toTexture(c), out, W, H };
}

/** Random-ish but believable layouts for the background rows. */
function randomLayout(rand) {
  const pool = ['server1u', 'server1u', 'server2u', 'server2u', 'storage2u', 'blank', 'blank', 'storage4u', 'gpu4u'];
  const out = [];
  let u = 1;
  out.push({ type: 'ups2u', u, h: 2 });
  u += 2;
  while (u <= 34) {
    const t = pool[Math.floor(rand() * pool.length)];
    const h = UNIT_HEIGHT[t];
    if (u + h > 35) break;
    out.push({ type: t, u, h });
    u += h;
  }
  while (u < 37) out.push({ type: 'blank', u: u++, h: 1 });
  out.push({ type: 'cablemgr', u: 37, h: 1 }, { type: 'switch1u', u: 38, h: 1 }, { type: 'patch24', u: 39, h: 1 });
  for (let x = 40; x <= 42; x++) out.push({ type: rand() > 0.5 ? 'blank' : 'server1u', u: x, h: 1 });
  return out;
}

/**
 * Full 42U face for background racks. Returns texture + LED positions in
 * metres relative to the panel centre.
 */
export function rackFaceTexture(seed, layout) {
  const rand = rng(seed);
  const lay = layout || randomLayout(rand);
  const pxU = 30;
  const W = Math.round((PANEL_W / U) * pxU);
  const H = 42 * pxU;
  const [c, ctx] = makeCanvas(W, H);
  ctx.fillStyle = '#060607';
  ctx.fillRect(0, 0, W, H);
  const k = pxU / PX_PER_U;
  const leds = [];
  for (const unit of lay) {
    const uh = unit.h * pxU;
    const y0 = H - (unit.u - 1 + unit.h) * pxU;
    ctx.save();
    ctx.translate(0, y0);
    const out = { leds: [], ports: [] };
    drawers[unit.type](ctx, W, uh, k, out, rand);
    ctx.restore();
    for (const l of out.leds) {
      leds.push({ ...l, mx: (l.x / W - 0.5) * PANEL_W, my: (0.5 - (y0 + l.y) / H) * 42 * U });
    }
  }
  return { texture: toTexture(c, { aniso: 4 }), leds };
}
