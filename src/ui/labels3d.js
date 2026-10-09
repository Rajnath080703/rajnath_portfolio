/**
 * HTML labels pinned to 3D points:
 *  - backup / DR flow nodes (chapter 07)
 *  - WayFinder map: building names (classrooms, departments, labs, library, hostel)
 * Projected once per frame only while their chapter is on screen.
 */
import { Vector3 } from 'three';
import { OFFSET, campus } from '../world/layout.js';

const ss = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export class Labels3D {
  constructor(root, world, camera) {
    this.camera = camera;
    this.root = root;
    this.v = new Vector3();
    root.style.opacity = 1;

    const n = world.noc.anchors.nodes;
    const defs = [
      ['SERVER', 'Source', n.server, 0.42],
      ['BACKUP', 'Backup job', n.backup, 0.4],
      ['CLOUD STORAGE', 'Wasabi Cloud Storage', n.cloud, 0.75],
      ['RECOVERY', 'Disaster recovery', n.recovery, 0.42],
    ];
    this.backup = this.group(
      defs.map(([title, sub, pos, lift], i) => ({
        html: `<span class="l3d__i mono">0${i + 1}</span><span class="l3d__t mono">${title}</span><span class="l3d__s">${sub}</span>`,
        cls: 'l3d',
        world: pos.clone().add(OFFSET.noc).add(new Vector3(0, lift, 0)),
      })),
      (p) => (p > 0.535 && p < 0.607 ? Math.min(1, (p - 0.535) / 0.01, (0.607 - p) / 0.01) : 0)
    );

    this.map = this.group(
      campus.buildings.map((b) => ({
        html: b.name,
        cls: `mapl${b.destination ? ' mapl--dest' : ''}`,
        world: new Vector3(b.x, b.h + 1, b.z).add(OFFSET.campus),
      })),
      (p) => ss(0.79, 0.8, p) * (1 - ss(0.845, 0.858, p))
    );
  }

  group(items, alpha) {
    const box = document.createElement('div');
    box.className = 'l3d-group';
    this.root.appendChild(box);
    const list = items.map((it) => {
      const el = document.createElement('div');
      el.className = it.cls;
      el.innerHTML = it.html;
      box.appendChild(el);
      return { el, world: it.world, on: false };
    });
    return { box, list, alpha, last: -1 };
  }

  updateGroup(g, p) {
    const a = Math.round(g.alpha(p) * 100) / 100;
    if (a !== g.last) {
      g.last = a;
      g.box.style.opacity = a;
      g.box.style.visibility = a ? 'visible' : 'hidden';
    }
    if (!a) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (const it of g.list) {
      this.v.copy(it.world).project(this.camera);
      const on = this.v.z < 1 && Math.abs(this.v.x) < 1.05 && Math.abs(this.v.y) < 1.05;
      if (on !== it.on) {
        it.on = on;
        it.el.style.visibility = on ? 'visible' : 'hidden';
      }
      if (on) {
        const x = (this.v.x * 0.5 + 0.5) * w;
        const y = (-this.v.y * 0.5 + 0.5) * h;
        it.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      }
    }
  }

  update(p) {
    this.updateGroup(this.backup, p);
    this.updateGroup(this.map, p);
  }
}
