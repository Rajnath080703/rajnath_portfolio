/**
 * SCENE 07 (photo engine) — Backup / Disaster Recovery as a quiet, minimal
 * flow drawn over the dimmed storage photograph:
 * SERVER → BACKUP → CLOUD STORAGE (Wasabi) → RECOVERY.
 * No sizes, retention periods or recovery times are shown.
 */
const ICONS = {
  server: '<rect x="5" y="6" width="30" height="8" rx="1"/><rect x="5" y="16" width="30" height="8" rx="1"/><rect x="5" y="26" width="30" height="8" rx="1"/><circle cx="30" cy="10" r="1"/><circle cx="30" cy="20" r="1"/><circle cx="30" cy="30" r="1"/>',
  backup: '<rect x="6" y="8" width="28" height="26" rx="2"/><path d="M20 13v12M14 20l6 6 6-6"/>',
  cloud: '<path d="M12 30h17a7 7 0 0 0 0-14 10 10 0 0 0-19 3 6 6 0 0 0 2 11z"/>',
  recovery: '<path d="M30 14a11 11 0 1 0 2 9"/><path d="M31 7v8h-8"/>',
};

const NODES = [
  ['server', 'Server', 'Source systems'],
  ['backup', 'Backup', 'Scheduled backup jobs'],
  ['cloud', 'Cloud Storage', 'Wasabi Cloud Storage'],
  ['recovery', 'Recovery', 'Disaster recovery'],
];

const ss = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export class BackupFlow {
  constructor(root) {
    const el = document.createElement('div');
    el.className = 'bk';
    el.innerHTML = NODES.map(
      ([icon, title, sub], i) => `
      ${i ? '<div class="bk__link"><i></i></div>' : ''}
      <div class="bk__node">
        <svg viewBox="0 0 40 40" aria-hidden="true">${ICONS[icon]}</svg>
        <span class="bk__i mono">0${i + 1}</span>
        <span class="bk__t mono">${title}</span>
        <span class="bk__s">${sub}</span>
      </div>`
    ).join('');
    root.appendChild(el);
    this.root = root;
    this.items = [...el.children];
    this.last = [];
  }

  update(p) {
    const a = ss(0.538, 0.55, p) * (1 - ss(0.598, 0.61, p));
    const ra = Math.round(a * 100) / 100;
    if (ra !== this.lastA) {
      this.lastA = ra;
      this.root.style.opacity = ra;
      this.root.style.visibility = ra ? 'visible' : 'hidden';
    }
    if (!ra) return;
    // nodes and links appear in order, as the data would travel
    this.items.forEach((it, i) => {
      const v = Math.round(ss(0.545 + i * 0.006, 0.553 + i * 0.006, p) * 100) / 100;
      if (this.last[i] === v) return;
      this.last[i] = v;
      it.style.opacity = v;
      it.style.transform = `translate3d(0, ${((1 - v) * 10).toFixed(1)}px, 0)`;
    });
  }
}
