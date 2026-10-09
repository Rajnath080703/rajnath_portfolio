/**
 * WayFinder campus map — a clean, realistic navigation-app map drawn from the
 * same campus layout the AR route uses. Used both on the student's monitor
 * and as the full-frame map plate, so the screen-to-map transition is exact.
 */
import { campus } from '../world/layout.js';
import { makeCanvas, rng, fillRR, FONT_UI } from '../world/textures/canvas.js';

export const MAP = { W: 2400, H: 1350, cx: 12, cz: 22, scale: 5.6 };

/** Campus metres → normalised map coords (0..1, y down). */
export function mapProject(x, z) {
  return [(MAP.W / 2 + (x - MAP.cx) * MAP.scale) / MAP.W, (MAP.H / 2 + (z - MAP.cz) * MAP.scale) / MAP.H];
}

const ROUTE = '#4f8be0';

export function drawCampusMapCanvas({ chrome = false } = {}) {
  const { W, H, scale: s } = MAP;
  const [c, ctx] = makeCanvas(W, H);
  const P = (x, z) => [W / 2 + (x - MAP.cx) * s, H / 2 + (z - MAP.cz) * s];
  const rand = rng(77);

  // land + campus grounds
  ctx.fillStyle = '#16181b';
  ctx.fillRect(0, 0, W, H);
  const [gx0, gz0] = P(-112, -86);
  const [gx1, gz1] = P(132, 132);
  fillRR(ctx, gx0, gz0, gx1 - gx0, gz1 - gz0, 40, '#1d2023');
  ctx.strokeStyle = '#2a2e33';
  ctx.lineWidth = 3;
  ctx.stroke();

  // lawns between roads
  const lawns = [[-96, 26, -30, 84], [-20, 26, -4, 120], [6, 26, 64, 46], [76, 26, 120, 84], [-96, -26, -6, 14], [6, -26, 40, 14], [52, -26, 120, 14], [-96, -78, -30, -38], [-20, -78, 38, -38], [54, -78, 120, -38]];
  for (const [x0, z0, x1, z1] of lawns) {
    const [a, b] = P(x0, z0);
    const [e, f] = P(x1, z1);
    fillRR(ctx, a, b, e - a, f - b, 18, '#1f2a23');
  }
  // trees
  for (let i = 0; i < 520; i++) {
    const x = -105 + rand() * 230;
    const z = -82 + rand() * 210;
    const onRoad = campus.roads.some(([x1, z1, x2, z2, w]) => x > Math.min(x1, x2) - w && x < Math.max(x1, x2) + w && z > Math.min(z1, z2) - w && z < Math.max(z1, z2) + w);
    const inB = campus.buildings.some((b) => Math.abs(x - b.x) < b.w / 2 + 3 && Math.abs(z - b.z) < b.d / 2 + 3);
    if (onRoad || inB) continue;
    const [px, py] = P(x, z);
    ctx.fillStyle = `rgba(${38 + rand() * 10},${58 + rand() * 12},${44 + rand() * 10},0.9)`;
    ctx.beginPath();
    ctx.arc(px, py, (1.6 + rand() * 1.4) * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // roads: casing then fill
  ctx.lineCap = 'round';
  for (const pass of [0, 1]) {
    for (const [x1, z1, x2, z2, w] of campus.roads) {
      const [a, b] = P(x1, z1);
      const [e, f] = P(x2, z2);
      ctx.strokeStyle = pass ? '#3a3e44' : '#101214';
      ctx.lineWidth = (w + (pass ? 0 : 1.4)) * s;
      ctx.beginPath();
      ctx.moveTo(a, b);
      ctx.lineTo(e, f);
      ctx.stroke();
    }
  }
  // road names
  const label = (t, x, z, rot = 0, size = 22, color = '#7c838d') => {
    const [px, py] = P(x, z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    ctx.font = `500 ${size}px ${FONT_UI}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(t, 0, 0);
    ctx.restore();
  };
  label('Main Avenue', -60, 20, 0, 20);
  label('Library Road', 45, -10, -Math.PI / 2, 18);
  label('College Road', 0, 70, -Math.PI / 2, 20);
  label('South Walk', 90, -32, 0, 18);

  // buildings: soft shadow, footprint, outline, label
  for (const b of campus.buildings) {
    const [x, y] = P(b.x - b.w / 2, b.z - b.d / 2);
    const w = b.w * s;
    const h = b.d * s;
    fillRR(ctx, x + 5, y + 7, w, h, 6, 'rgba(0,0,0,0.35)');
    fillRR(ctx, x, y, w, h, 6, b.destination ? '#263750' : '#2b2f35');
    ctx.strokeStyle = b.destination ? 'rgba(79,139,224,0.8)' : '#3a3f46';
    ctx.lineWidth = b.destination ? 4 : 2;
    ctx.stroke();
    const [lx, ly] = P(b.x, b.z);
    ctx.font = `${b.destination ? 600 : 500} ${b.destination ? 26 : 21}px ${FONT_UI}`;
    ctx.fillStyle = b.destination ? '#dbe7fa' : '#a9b0ba';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const words = b.name.split(' — ');
    words.forEach((t, i) => ctx.fillText(t, lx, ly + (i - (words.length - 1) / 2) * 26));
  }

  // gate
  const [gx, gy] = P(0, 112);
  ctx.fillStyle = '#6b727c';
  ctx.fillRect(gx - 34, gy - 4, 68, 8);
  label('Main Gate', 14, 117, 0, 20, '#8d949e');

  // route: white casing + blue line
  const pts = campus.route.map(([x, z]) => P(x, z));
  ctx.lineJoin = 'round';
  for (const [col, wd] of [['#0f1113', 22], [ROUTE, 12]]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = wd;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }
  // you-are-here
  const [sx, sy] = pts[0];
  ctx.fillStyle = 'rgba(79,139,224,0.18)';
  ctx.beginPath();
  ctx.arc(sx, sy, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(sx, sy, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ROUTE;
  ctx.beginPath();
  ctx.arc(sx, sy, 11, 0, Math.PI * 2);
  ctx.fill();
  // destination pin
  const [dx, dy] = pts[pts.length - 1];
  ctx.fillStyle = '#c94a3c';
  ctx.beginPath();
  ctx.moveTo(dx, dy);
  ctx.bezierCurveTo(dx - 26, dy - 30, dx - 22, dy - 62, dx, dy - 62);
  ctx.bezierCurveTo(dx + 22, dy - 62, dx + 26, dy - 30, dx, dy);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(dx, dy - 42, 8, 0, Math.PI * 2);
  ctx.fill();

  // compass + scale bar
  const cxp = W - 90;
  const cyp = 90;
  ctx.fillStyle = 'rgba(36,39,44,0.95)';
  ctx.beginPath();
  ctx.arc(cxp, cyp, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a3f46';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#c94a3c';
  ctx.beginPath();
  ctx.moveTo(cxp, cyp - 24);
  ctx.lineTo(cxp - 9, cyp);
  ctx.lineTo(cxp + 9, cyp);
  ctx.fill();
  ctx.fillStyle = '#9aa1ab';
  ctx.beginPath();
  ctx.moveTo(cxp, cyp + 24);
  ctx.lineTo(cxp - 9, cyp);
  ctx.lineTo(cxp + 9, cyp);
  ctx.fill();
  const bar = 50 * s;
  ctx.fillStyle = '#8d949e';
  ctx.fillRect(60, H - 70, bar, 5);
  ctx.fillRect(60, H - 80, 4, 15);
  ctx.fillRect(60 + bar - 4, H - 80, 4, 15);
  ctx.font = `500 20px ${FONT_UI}`;
  ctx.textAlign = 'left';
  ctx.fillText('50 m', 60, H - 92);

  if (chrome) {
    // the desktop app around the map, as it appears on the student's monitor
    fillRR(ctx, 40, 36, 760, 92, 46, '#24272c');
    ctx.strokeStyle = '#33373d';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = `500 34px ${FONT_UI}`;
    ctx.fillStyle = '#e5e7eb';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Library', 110, 83);
    ctx.strokeStyle = '#9aa1ab';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(76, 80, 14, 0, Math.PI * 2);
    ctx.moveTo(86, 90);
    ctx.lineTo(98, 102);
    ctx.stroke();
    fillRR(ctx, 40, H - 250, 640, 200, 22, '#24272c');
    ctx.font = `600 38px ${FONT_UI}`;
    ctx.fillStyle = '#f3f4f6';
    ctx.fillText('Library', 80, H - 195);
    ctx.font = `400 26px ${FONT_UI}`;
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('Walking route · ready', 80, H - 150);
    fillRR(ctx, 80, H - 120, 300, 50, 25, ROUTE);
    ctx.font = `600 22px ${FONT_UI}`;
    ctx.fillStyle = '#fff';
    ctx.fillText('Start Live AR View', 110, H - 95);
    ctx.font = `700 34px ${FONT_UI}`;
    ctx.fillStyle = '#e5e7eb';
    ctx.textAlign = 'right';
    ctx.fillText('WayFinder', W - 150, 92);
  }
  return c;
}
