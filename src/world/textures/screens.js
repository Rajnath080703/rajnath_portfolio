/**
 * On-screen interfaces drawn into canvases: Proxmox dashboard, installer,
 * monitoring dashboard, lab desktops, lab status wall and the WayFinder map.
 *
 * All numbers shown on these screens are visual DEMO values and are labelled
 * as such — they are not professional claims.
 */
import { makeCanvas, toTexture, rng, fillRR, series, lineChart, grid, FONT_UI, FONT_MONO } from './canvas.js';
import { campus } from '../layout.js';

const INK = 'rgb(226,229,234)';
const INK2 = 'rgba(226,229,234,0.62)';
const INK3 = 'rgba(226,229,234,0.38)';
const OK = 'rgb(88,196,128)';
const LINE_A = 'rgb(122,170,226)';
const LINE_B = 'rgb(196,160,98)';
const LINE_C = 'rgb(150,200,170)';

function text(ctx, s, x, y, size, color = INK, weight = 500, font = FONT_UI, align = 'left') {
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
  ctx.textAlign = 'left';
}

function demoBadge(ctx, x, y) {
  fillRR(ctx, x, y, 118, 26, 4, 'rgba(255,255,255,0.08)');
  text(ctx, 'DEMO DATA', x + 59, y + 18, 13, INK2, 600, FONT_MONO, 'center');
}

/* ------------------------------------------------------------------ Proxmox */

function proxmoxChrome(ctx, W, H, rand) {
  ctx.fillStyle = '#1b1c1f';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#262729';
  ctx.fillRect(0, 0, W, 56);
  text(ctx, 'PROXMOX', 22, 37, 24, 'rgb(229,112,0)', 800);
  text(ctx, 'Virtual Environment', 150, 37, 19, INK2, 400);
  text(ctx, 'Search', 470, 36, 15, INK3);
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.strokeRect(455.5, 14.5, 300, 28);
  for (const [i, s] of ['Documentation', 'Create VM', 'Create CT', 'root@pam'].entries()) {
    fillRR(ctx, W - 560 + i * 138, 13, 128, 30, 3, i === 1 || i === 2 ? 'rgba(229,112,0,0.85)' : 'rgba(255,255,255,0.06)');
    text(ctx, s, W - 496 + i * 138, 33, 14, INK, 500, FONT_UI, 'center');
  }
  // resource tree
  ctx.fillStyle = '#212225';
  ctx.fillRect(0, 56, 320, H - 56);
  text(ctx, 'Server View', 18, 88, 15, INK2, 600);
  const tree = [
    ['Datacenter', 0, 'dc'],
    ['pve-node01', 1, 'node'],
    ['100 (ubuntu-server)', 2, 'vm'],
    ['101 (windows-server)', 2, 'vm'],
    ['102 (linux-lab)', 2, 'vm'],
    ['local (pve-node01)', 2, 'st'],
    ['local-lvm (pve-node01)', 2, 'st'],
  ];
  tree.forEach(([s, d, kind], i) => {
    const y = 124 + i * 34;
    if (i === 2) fillRR(ctx, 8, y - 22, 304, 32, 3, 'rgba(122,170,226,0.16)');
    const x = 22 + d * 22;
    if (kind === 'vm') {
      fillRR(ctx, x, y - 14, 18, 14, 2, '#4b4f57');
      ctx.fillStyle = OK;
      ctx.beginPath();
      ctx.arc(x + 16, y - 1, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'st') {
      fillRR(ctx, x, y - 15, 16, 16, 3, '#555a62');
    } else {
      fillRR(ctx, x, y - 15, 18, 16, 2, kind === 'dc' ? '#6b7079' : '#5c636e');
    }
    text(ctx, s, x + 30, y, 15, i === 2 ? INK : INK2);
  });
}

export function proxmoxDashboard() {
  const W = 1600;
  const H = 900;
  const [c, ctx] = makeCanvas(W, H);
  const rand = rng(11);
  proxmoxChrome(ctx, W, H, rand);
  const X = 340;
  text(ctx, "Virtual Machine 100 (ubuntu-server) on node 'pve-node01'", X, 96, 19, INK, 500);
  ['Summary', 'Console', 'Hardware', 'Cloud-Init', 'Options', 'Task History', 'Monitor', 'Backup', 'Replication', 'Snapshots', 'Firewall'].forEach((s, i) => {
    const y = 140 + i * 34;
    if (i === 0) fillRR(ctx, X, y - 22, 170, 32, 3, 'rgba(255,255,255,0.08)');
    text(ctx, s, X + 14, y, 15, i === 0 ? INK : INK2);
  });
  // status panel
  const PX = X + 196;
  fillRR(ctx, PX, 118, W - PX - 24, 190, 4, '#222326');
  text(ctx, 'ubuntu-server', PX + 20, 152, 18, INK, 600);
  ctx.fillStyle = OK;
  ctx.beginPath();
  ctx.arc(PX + 28, 186, 7, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, 'Status', PX + 44, 192, 15, INK2);
  text(ctx, 'running', PX + 240, 192, 15, OK, 600);
  const rows = [['HA State', 'none'], ['Node', 'pve-node01'], ['CPU usage', 'demo'], ['Memory usage', 'demo']];
  rows.forEach(([a, b], i) => {
    text(ctx, a, PX + 44, 224 + i * 22, 14, INK3);
    text(ctx, b, PX + 240, 224 + i * 22, 14, INK2);
  });
  // mini guest list
  const GX = PX + 520;
  text(ctx, 'Guests', GX, 152, 15, INK2, 600);
  [['Ubuntu', 'running'], ['Windows Server', 'running'], ['Linux', 'running']].forEach(([a, b], i) => {
    const y = 186 + i * 30;
    ctx.fillStyle = OK;
    ctx.beginPath();
    ctx.arc(GX + 6, y - 5, 5, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, a, GX + 22, y, 15, INK);
    text(ctx, b.toUpperCase(), GX + 260, y, 13, OK, 600, FONT_MONO);
  });
  demoBadge(ctx, W - 160, 132);
  // charts
  const charts = [
    ['CPU usage', LINE_A],
    ['Memory usage', LINE_C],
    ['Network traffic', LINE_A],
    ['Disk IO', LINE_B],
  ];
  charts.forEach(([title, col], i) => {
    const cw = (W - PX - 24 - 16) / 2;
    const cx = PX + (i % 2) * (cw + 16);
    const cy = 326 + Math.floor(i / 2) * 280;
    fillRR(ctx, cx, cy, cw, 264, 4, '#222326');
    text(ctx, title, cx + 18, cy + 32, 15, INK2, 600);
    grid(ctx, cx + 18, cy + 56, cw - 36, 180, 4);
    lineChart(ctx, cx + 18, cy + 56, cw - 36, 180, series(rand, 60, 0.4 + i * 0.07, 0.3), col);
    if (i === 2) lineChart(ctx, cx + 18, cy + 56, cw - 36, 180, series(rand, 60, 0.25, 0.25), LINE_B, false);
  });
  return toTexture(c);
}

/* -------------------------------------------------------------- Installer */

const STEPS = ['extracting base system', 'installing packages', 'configuring network', 'creating LVM thin pool', 'installing bootloader', 'finalizing'];

export function installerScreen() {
  const W = 1280;
  const H = 720;
  // drawn in 1280×720 units but stored at 80%: each live update uploads ~36% fewer pixels
  const [c, ctx] = makeCanvas(W * 0.8, H * 0.8);
  ctx.scale(0.8, 0.8);
  const tex = toTexture(c, { mipmaps: false, aniso: 4 });
  let last = -1;
  function set(pct) {
    const p = Math.max(0, Math.min(100, Math.round(pct)));
    if (p === last) return;
    last = p;
    ctx.fillStyle = '#eceef1';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1d1f23';
    ctx.fillRect(0, 0, W, 86);
    text(ctx, 'PROXMOX', 36, 56, 30, 'rgb(229,112,0)', 800);
    text(ctx, 'VE Installer', 200, 56, 24, '#d9dce1', 400);
    // steps rail
    ctx.fillStyle = '#e1e4e8';
    ctx.fillRect(0, 86, 250, H - 86);
    ['License', 'Target', 'Location', 'Password', 'Network', 'Summary', 'Install'].forEach((s, i) => {
      const active = i === 6;
      if (active) fillRR(ctx, 12, 112 + i * 46, 226, 38, 4, '#ffffff');
      ctx.fillStyle = i < 6 ? '#3b8f5f' : 'rgb(229,112,0)';
      ctx.beginPath();
      ctx.arc(36, 131 + i * 46, 8, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, s, 56, 137 + i * 46, 17, active ? '#111' : '#4a4f57', active ? 600 : 400);
    });
    const X = 300;
    text(ctx, p < 100 ? 'Installing Proxmox VE' : 'Installation successful', X, 160, 34, '#14161a', 600);
    text(ctx, p < 100 ? 'Please wait while the system is being installed.' : 'Proxmox VE is ready. The system will reboot.', X, 200, 18, '#4a4f57');
    // progress bar
    fillRR(ctx, X, 260, W - X - 60, 34, 6, '#d6d9de');
    const bw = (W - X - 60) * (p / 100);
    if (bw > 0) fillRR(ctx, X, 260, Math.max(12, bw), 34, 6, 'rgb(229,112,0)');
    text(ctx, `${p}%`, W - 60, 330, 22, '#14161a', 600, FONT_UI, 'right');
    const step = STEPS[Math.min(STEPS.length - 1, Math.floor((p / 100) * STEPS.length))];
    text(ctx, p < 100 ? step + '…' : 'done', X, 330, 18, '#4a4f57', 400, FONT_MONO);
    // log
    fillRR(ctx, X, 370, W - X - 60, 300, 6, '#16181c');
    const lines = Math.min(10, Math.floor(p / 9) + 1);
    for (let i = 0; i < lines; i++) {
      const s = STEPS[Math.min(STEPS.length - 1, i % STEPS.length)];
      text(ctx, `[  ok  ] ${s}`, X + 20, 404 + i * 26, 15, i === lines - 1 && p < 100 ? '#e9c38f' : '#a9b3bd', 400, FONT_MONO);
    }
    text(ctx, 'Cinematic visualisation — not a live installation', X, H - 20, 13, '#80858d', 400, FONT_MONO);
    tex.needsUpdate = true;
  }
  set(0);
  return { texture: tex, set };
}

/* ------------------------------------------------------------- Monitoring */

export function monitoringScreen() {
  const W = 1280;
  const H = 720;
  // drawn in 1280×720 units but stored at 80%: each live update uploads ~36% fewer pixels
  const [c, ctx] = makeCanvas(W * 0.8, H * 0.8);
  ctx.scale(0.8, 0.8);
  const tex = toTexture(c, { mipmaps: false, aniso: 4 });
  const rand = rng(21);
  const cpu = [series(rand, 90, 0.42, 0.3), series(rand, 90, 0.3, 0.25), series(rand, 90, 0.55, 0.2)];
  const net = [series(rand, 90, 0.5, 0.35), series(rand, 90, 0.3, 0.3)];
  const mem = series(rand, 90, 0.6, 0.12);
  let tick = 0;

  function panel(x, y, w, h, title) {
    fillRR(ctx, x, y, w, h, 4, '#16181c');
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    text(ctx, title, x + 14, y + 26, 14, INK2, 600);
  }

  function draw() {
    ctx.fillStyle = '#0f1013';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#16181c';
    ctx.fillRect(0, 0, W, 50);
    text(ctx, 'Dashboards  /  Infrastructure Overview', 20, 32, 16, INK, 500);
    fillRR(ctx, W - 380, 11, 150, 28, 3, 'rgba(255,255,255,0.06)');
    text(ctx, 'Last 6 hours', W - 305, 30, 13, INK2, 500, FONT_UI, 'center');
    demoBadge(ctx, W - 140, 12);

    // stat row
    const stats = [
      ['Server health', 'Healthy', OK],
      ['Hosts', 'Online', OK],
      ['Uptime', 'demo', INK2],
      ['Alerts', 'None active', INK],
    ];
    stats.forEach(([t, v, col], i) => {
      const w = (W - 40 - 30) / 4;
      const x = 20 + i * (w + 10);
      panel(x, 64, w, 96, t);
      text(ctx, v, x + 14, 136, 30, col, 600);
    });
    // CPU
    panel(20, 172, 760, 250, 'CPU utilisation');
    grid(ctx, 34, 210, 732, 190, 4);
    [LINE_A, LINE_C, LINE_B].forEach((col, i) => lineChart(ctx, 34, 210, 732, 190, cpu[i], col, i === 0));
    // legend
    ['node-01', 'node-02', 'node-03'].forEach((s, i) => {
      const lx = 600 + i * 62;
      ctx.fillStyle = [LINE_A, LINE_C, LINE_B][i];
      ctx.fillRect(lx - 14, 192, 10, 3);
      text(ctx, s, lx, 198, 11, INK3, 500, FONT_MONO);
    });
    // Memory gauge
    panel(790, 172, 470, 250, 'Memory');
    const gx = 1025;
    const gy = 360;
    ctx.lineCap = 'round';
    ctx.lineWidth = 18;
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath();
    ctx.arc(gx, gy, 120, Math.PI, 0);
    ctx.stroke();
    const mv = mem[(tick + 60) % mem.length];
    ctx.strokeStyle = LINE_C;
    ctx.beginPath();
    ctx.arc(gx, gy, 120, Math.PI, Math.PI + Math.PI * mv);
    ctx.stroke();
    ctx.lineCap = 'butt';
    text(ctx, 'demo', gx, gy - 20, 30, INK, 600, FONT_UI, 'center');
    // Network
    panel(20, 434, 620, 266, 'Network traffic  in / out');
    grid(ctx, 34, 472, 592, 206, 4);
    lineChart(ctx, 34, 472, 592, 206, net[0], LINE_A, true);
    lineChart(ctx, 34, 472, 592, 206, net[1], LINE_B, false);
    // Storage bars
    panel(650, 434, 300, 266, 'Storage');
    ['local', 'local-lvm', 'backup'].forEach((s, i) => {
      const y = 492 + i * 64;
      text(ctx, s, 666, y, 13, INK2, 500, FONT_MONO);
      fillRR(ctx, 666, y + 12, 268, 12, 3, 'rgba(255,255,255,0.07)');
      fillRR(ctx, 666, y + 12, 268 * (0.3 + i * 0.18), 12, 3, i === 2 ? LINE_B : LINE_A);
    });
    // Alerts
    panel(960, 434, 300, 266, 'Alert rules');
    [['Disk space', 'OK'], ['Host down', 'OK'], ['High CPU', 'OK'], ['Backup job', 'OK']].forEach(([a, b], i) => {
      const y = 490 + i * 46;
      ctx.fillStyle = OK;
      ctx.beginPath();
      ctx.arc(980, y - 5, 5, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, a, 994, y, 14, INK);
      text(ctx, b, 1240, y, 13, OK, 600, FONT_MONO, 'right');
    });
    tex.needsUpdate = true;
  }

  function update() {
    tick++;
    for (const s of [...cpu, ...net]) {
      s.shift();
      const last = s[s.length - 1];
      s.push(Math.max(0.05, Math.min(0.95, last + (rand() - 0.5) * 0.12)));
    }
    draw();
  }
  draw();
  return { texture: tex, update };
}

/* ------------------------------------------------------------ Lab screens */

function terminalScreen(seed) {
  const [c, ctx] = makeCanvas(512, 320);
  const rand = rng(seed);
  ctx.fillStyle = '#121417';
  ctx.fillRect(0, 0, 512, 320);
  ctx.fillStyle = '#1f2226';
  ctx.fillRect(0, 0, 512, 22);
  const lines = [
    ['student@lab-vm:~$ ', 'ip a'],
    ['', 'inet 10.x.x.x/24 scope global'],
    ['student@lab-vm:~$ ', 'sudo systemctl status ssh'],
    ['', '● ssh.service - OpenBSD Secure Shell'],
    ['', '   Active: active (running)'],
    ['student@lab-vm:~$ ', 'nmap -sV target-vm'],
    ['', 'PORT    STATE SERVICE'],
    ['', '22/tcp  open  ssh'],
    ['', '80/tcp  open  http'],
    ['student@lab-vm:~$ ', 'tail -f /var/log/auth.log'],
  ];
  const off = Math.floor(rand() * 3);
  lines.slice(off).forEach(([p, cmd], i) => {
    text(ctx, p, 12, 46 + i * 26, 15, 'rgb(150,190,230)', 500, FONT_MONO);
    text(ctx, cmd, 12 + (p ? 172 : 0), 46 + i * 26, 15, '#d4d8de', 400, FONT_MONO);
  });
  return toTexture(c, { aniso: 2 });
}

function windowsScreen(seed) {
  const [c, ctx] = makeCanvas(512, 320);
  const g = ctx.createLinearGradient(0, 0, 512, 320);
  g.addColorStop(0, '#23344a');
  g.addColorStop(1, '#0f1622');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 320);
  ctx.fillStyle = 'rgba(20,22,26,0.92)';
  ctx.fillRect(0, 296, 512, 24);
  for (let i = 0; i < 6; i++) fillRR(ctx, 200 + i * 20, 300, 14, 14, 2, i === 0 ? '#7fb2ff' : 'rgba(255,255,255,0.35)');
  fillRR(ctx, 40, 30, 380, 240, 4, '#f3f4f6');
  ctx.fillStyle = '#e3e6ea';
  ctx.fillRect(40, 30, 380, 26);
  text(ctx, seed % 2 ? 'Server Manager' : 'Event Viewer', 52, 48, 13, '#222', 600);
  ctx.fillStyle = '#dde2e8';
  ctx.fillRect(40, 56, 100, 214);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i === 1 ? '#c9daf0' : '#e9ecf0';
    ctx.fillRect(150, 66 + i * 24, 260, 18);
    text(ctx, ['Local Server', 'All Servers', 'AD DS', 'DNS', 'File Services', 'Roles', 'Events', 'Services'][i], 156, 80 + i * 24, 11, '#333');
  }
  return toTexture(c, { aniso: 2 });
}

function packetScreen(seed) {
  const [c, ctx] = makeCanvas(512, 320);
  const rand = rng(seed);
  ctx.fillStyle = '#1a1c20';
  ctx.fillRect(0, 0, 512, 320);
  ctx.fillStyle = '#25282d';
  ctx.fillRect(0, 0, 512, 40);
  fillRR(ctx, 8, 8, 300, 24, 3, '#101114');
  text(ctx, 'tcp.port == 22', 16, 25, 12, 'rgb(150,200,170)', 400, FONT_MONO);
  const protos = ['TCP', 'TLS', 'DNS', 'ARP', 'HTTP', 'SSH'];
  for (let i = 0; i < 12; i++) {
    const y = 46 + i * 18;
    const pr = protos[Math.floor(rand() * protos.length)];
    ctx.fillStyle = { DNS: '#2b3540', ARP: '#3a3528', HTTP: '#2b3a30', TLS: '#30303a' }[pr] || '#222428';
    ctx.fillRect(0, y, 512, 17);
    text(ctx, String(i + 1).padStart(3), 6, y + 13, 11, INK2, 400, FONT_MONO);
    text(ctx, `10.0.0.${Math.floor(rand() * 200)}`, 50, y + 13, 11, INK2, 400, FONT_MONO);
    text(ctx, pr, 300, y + 13, 11, INK, 500, FONT_MONO);
    text(ctx, 'len=' + Math.floor(40 + rand() * 1400), 360, y + 13, 11, INK3, 400, FONT_MONO);
  }
  ctx.fillStyle = '#14161a';
  ctx.fillRect(0, 266, 512, 54);
  for (let i = 0; i < 3; i++) text(ctx, '0000  45 00 00 3c 1c 46 40 00 40 06', 8, 284 + i * 14, 11, INK3, 400, FONT_MONO);
  return toTexture(c, { aniso: 2 });
}

function linuxDesktopScreen() {
  const [c, ctx] = makeCanvas(512, 320);
  ctx.fillStyle = '#2a2d33';
  ctx.fillRect(0, 0, 512, 320);
  ctx.fillStyle = '#16181b';
  ctx.fillRect(0, 0, 512, 18);
  ctx.fillRect(0, 18, 36, 302);
  for (let i = 0; i < 7; i++) fillRR(ctx, 7, 28 + i * 34, 22, 22, 4, i === 2 ? '#d7dbe0' : '#4a4f57');
  fillRR(ctx, 56, 34, 300, 200, 6, '#121417');
  for (let i = 0; i < 7; i++) text(ctx, ['$ virsh list --all', ' Id  Name     State', ' 1   win-lab  running', ' 2   kali     running', '$ ping -c 3 gateway', '64 bytes: icmp_seq=1', '$ _'][i], 68, 60 + i * 22, 12, i % 4 === 0 ? 'rgb(150,190,230)' : '#cfd4da', 400, FONT_MONO);
  fillRR(ctx, 250, 120, 240, 170, 6, '#e9ebee');
  ctx.fillStyle = '#d0d4d9';
  ctx.fillRect(250, 120, 240, 22);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = '#c4c9cf';
    ctx.fillRect(262, 156 + i * 24, 120 + ((i * 37) % 90), 10);
  }
  return toTexture(c, { aniso: 2 });
}

function ubuntuFilesScreen() {
  const [c, ctx] = makeCanvas(512, 320);
  const g = ctx.createLinearGradient(0, 0, 512, 320);
  g.addColorStop(0, '#3b2a3f');
  g.addColorStop(1, '#6b3a4a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 320);
  ctx.fillStyle = '#1c1c1c';
  ctx.fillRect(0, 0, 512, 16);
  ctx.fillRect(0, 16, 34, 304);
  for (let i = 0; i < 7; i++) fillRR(ctx, 6, 26 + i * 32, 22, 22, 5, ['#e95420', '#3d8fd1', '#dcdcdc', '#7b7b7b', '#57a64a', '#c9c9c9', '#8c6fbf'][i]);
  fillRR(ctx, 64, 34, 400, 250, 8, '#fafafa');
  ctx.fillStyle = '#ebebeb';
  ctx.fillRect(64, 34, 400, 28);
  text(ctx, 'Home', 80, 53, 12, '#333', 600);
  ctx.fillStyle = '#f1f1f1';
  ctx.fillRect(64, 62, 96, 222);
  ['Recent', 'Home', 'Documents', 'Downloads', 'Desktop'].forEach((t, i) => text(ctx, t, 74, 84 + i * 22, 11, '#444'));
  ['Documents', 'Downloads', 'lab-notes', 'scripts', 'Pictures', 'iso'].forEach((t, i) => {
    const x = 180 + (i % 3) * 90;
    const y = 80 + Math.floor(i / 3) * 90;
    fillRR(ctx, x, y, 52, 40, 4, i === 5 ? '#b0b0b0' : '#e8a33c');
    text(ctx, t, x + 26, y + 58, 11, '#333', 400, FONT_UI, 'center');
  });
  return toTexture(c, { aniso: 2 });
}

function vmManagerScreen() {
  const [c, ctx] = makeCanvas(512, 320);
  ctx.fillStyle = '#2c2f33';
  ctx.fillRect(0, 0, 512, 320);
  fillRR(ctx, 20, 20, 472, 270, 6, '#f2f2f2');
  ctx.fillStyle = '#dedede';
  ctx.fillRect(20, 20, 472, 26);
  text(ctx, 'Virtual Machine Manager', 32, 38, 12, '#222', 600);
  ctx.fillStyle = '#e9e9e9';
  ctx.fillRect(20, 46, 472, 22);
  text(ctx, 'Name', 34, 61, 11, '#444', 600);
  text(ctx, 'CPU usage', 330, 61, 11, '#444', 600);
  [['ubuntu-server', 'Running'], ['windows-server', 'Running'], ['kali-lab', 'Shutoff'], ['metasploitable', 'Running']].forEach(([n, st], i) => {
    const y = 90 + i * 34;
    if (i === 0) {
      ctx.fillStyle = '#cfe0f5';
      ctx.fillRect(20, y - 18, 472, 30);
    }
    fillRR(ctx, 32, y - 12, 18, 14, 2, '#5a6b7c');
    text(ctx, n, 60, y, 12, '#222', 500);
    text(ctx, st, 60, y + 13, 10, '#666');
    ctx.strokeStyle = st === 'Running' ? '#4b8f4b' : '#bbb';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let k = 0; k < 30; k++) ctx.lineTo(330 + k * 4, y + 4 - (st === 'Running' ? ((k * 37 + i * 11) % 13) : 0));
    ctx.stroke();
  });
  return toTexture(c, { aniso: 2 });
}

function labSheetScreen() {
  const [c, ctx] = makeCanvas(512, 320);
  ctx.fillStyle = '#e9eaec';
  ctx.fillRect(0, 0, 512, 320);
  ctx.fillStyle = '#d4d6da';
  ctx.fillRect(0, 0, 512, 30);
  fillRR(ctx, 70, 7, 300, 16, 8, '#ffffff');
  fillRR(ctx, 60, 42, 392, 270, 2, '#ffffff');
  text(ctx, 'Lab 4 — User & permission management', 80, 72, 14, '#1f2937', 700);
  const lines = ['1. Create a user and add it to a group', '2. Set ownership and permissions on /srv/share', '3. Verify with id, ls -l and su', '4. Record your observations', '', 'Submit screenshots to the instructor.'];
  lines.forEach((t, i) => text(ctx, t, 80, 104 + i * 24, 12, '#374151'));
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(80, 260 + i * 12, 300 - i * 60, 6);
  }
  return toTexture(c, { aniso: 2 });
}

/** Ordinary training-lab desktops: mostly everyday tools, a few security tools. */
export function labScreens() {
  return [windowsScreen(4), ubuntuFilesScreen(), vmManagerScreen(), linuxDesktopScreen(), labSheetScreen(), packetScreen(5), terminalScreen(3), windowsScreen(7)];
}

/* -------------------------------------------------- Instructor lab status */

export function labStatusScreen() {
  const W = 1600;
  const H = 900;
  const [c, ctx] = makeCanvas(W, H);
  ctx.fillStyle = '#121316';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#1b1c20';
  ctx.fillRect(0, 0, W, 90);
  text(ctx, 'CYBER SECURITY LAB', 50, 58, 34, INK, 600);
  text(ctx, 'Training environment · status', 470, 58, 22, INK2, 400);
  demoBadge(ctx, W - 180, 32);
  const tiles = [
    ['Virtualization host', 'ONLINE'],
    ['Windows environments', 'RUNNING'],
    ['Linux environments', 'RUNNING'],
    ['Security testing network', 'ISOLATED'],
    ['Snapshots', 'READY'],
    ['System administration labs', 'ACTIVE'],
  ];
  tiles.forEach(([a, b], i) => {
    const x = 50 + (i % 3) * 510;
    const y = 140 + Math.floor(i / 3) * 210;
    fillRR(ctx, x, y, 480, 180, 6, '#1b1d21');
    text(ctx, a, x + 30, y + 56, 24, INK2, 500);
    ctx.fillStyle = OK;
    ctx.beginPath();
    ctx.arc(x + 40, y + 120, 9, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, b, x + 62, y + 132, 34, INK, 600, FONT_MONO);
  });
  fillRR(ctx, 50, 580, W - 100, 270, 6, '#1b1d21');
  text(ctx, 'Today', 80, 630, 22, INK2, 600);
  ['Linux fundamentals — users, permissions, services', 'Windows Server — roles & Active Directory basics', 'Network analysis in an isolated segment', 'Snapshot & restore practice'].forEach((s, i) => {
    text(ctx, `0${i + 1}`, 80, 690 + i * 42, 22, INK3, 500, FONT_MONO);
    text(ctx, s, 140, 690 + i * 42, 24, INK, 400);
  });
  return toTexture(c);
}

/* ---------------------------------------------------------- WayFinder map */

/**
 * Top-down campus map in the same coordinates as the 3D campus, so the
 * student's screen matches the 3D map the camera cuts to.
 */
export function drawCampusMap(ctx, W, H, { cx = 20, cz = 20, scale = 2.4, route = true } = {}) {
  const tx = (x) => W / 2 + (x - cx) * scale;
  const tz = (z) => H / 2 + (z - cz) * scale;
  ctx.fillStyle = '#1a1d1f';
  ctx.fillRect(0, 0, W, H);
  // lawns
  ctx.fillStyle = '#1d2420';
  for (let i = 0; i < 30; i++) {
    const r = rng(i + 3);
    ctx.fillRect(tx(-150 + r() * 300), tz(-150 + r() * 300), 40 * scale * r(), 40 * scale * r());
  }
  for (const [x1, z1, x2, z2, w] of campus.roads) {
    ctx.strokeStyle = '#3a3e43';
    ctx.lineWidth = w * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tx(x1), tz(z1));
    ctx.lineTo(tx(x2), tz(z2));
    ctx.stroke();
  }
  for (const b of campus.buildings) {
    fillRR(ctx, tx(b.x - b.w / 2), tz(b.z - b.d / 2), b.w * scale, b.d * scale, 2, b.destination ? '#55606b' : '#2e3338');
    if (scale > 1.6) text(ctx, b.name, tx(b.x), tz(b.z) + 5, Math.max(10, 5.5 * scale), b.destination ? INK : INK3, 500, FONT_UI, 'center');
  }
  if (route) {
    ctx.strokeStyle = 'rgb(122,170,226)';
    ctx.lineWidth = Math.max(4, 2.2 * scale);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    campus.route.forEach(([x, z], i) => (i ? ctx.lineTo(tx(x), tz(z)) : ctx.moveTo(tx(x), tz(z))));
    ctx.stroke();
    const [sx, sz] = campus.route[0];
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(tx(sx), tz(sz), 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgb(122,170,226)';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
}

export function campusMapScreen() {
  const W = 1280;
  const H = 720;
  const [c, ctx] = makeCanvas(W, H);
  drawCampusMap(ctx, W, H, { cx: 22, cz: 22, scale: 2.6 });
  // app chrome
  fillRR(ctx, 24, 24, 420, 54, 27, 'rgba(24,26,29,0.95)');
  text(ctx, 'Library', 64, 59, 20, INK, 500);
  text(ctx, 'WayFinder', W - 40, 58, 22, INK, 600, FONT_UI, 'right');
  fillRR(ctx, 24, H - 120, 420, 96, 10, 'rgba(24,26,29,0.95)');
  text(ctx, 'Route to Library', 46, H - 80, 20, INK, 600);
  text(ctx, 'Walking · route ready', 46, H - 48, 16, INK2);
  return toTexture(c);
}
