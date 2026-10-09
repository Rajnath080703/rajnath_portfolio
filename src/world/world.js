/**
 * Assembles every scene into ONE world, owns the light rig and decides which
 * scene groups are visible for the current scroll progress (cheap culling).
 *
 * Light count never changes after start-up → no shader recompiles mid-scroll.
 */
import { HemisphereLight, SpotLight, PointLight, Object3D, Color, Vector3, Fog } from 'three';
import { OFFSET } from './layout.js';
import { buildServerRoom } from './scenes/serverRoom.js';
import { buildNoc } from './scenes/noc.js';
import { buildLab } from './scenes/lab.js';
import { buildCampus } from './scenes/campus.js';
import { time } from './materials.js';

const V = (x, y, z, o = OFFSET.server) => new Vector3(x, y, z).add(o);

/** Art-directed lighting states (world coordinates). */
function lightStates() {
  const N = OFFSET.noc;
  const L = OFFSET.lab;
  const C = OFFSET.campus;
  return {
    hero: {
      exposure: 0.95, env: 0.32, fog: [0x0b0c0d, 12, 48],
      hemi: [0xb8bbc0, 0x1c1c1c, 0.6],
      key: { pos: V(-2.6, 3.3, 5.0), target: V(0, 1.2, 0), color: 0xf2efe8, i: 6.5, angle: 0.5 },
      rim: { pos: V(0.4, 2.9, -2.4), color: 0xe4e2dc, i: 4 },
      fill: 2.2,
    },
    aisle: {
      exposure: 0.95, env: 0.3, fog: [0x0b0c0d, 8, 40],
      hemi: [0xb8bbc0, 0x1c1c1c, 0.75],
      key: { pos: V(0, 3.25, -20), target: V(0, 0, -21), color: 0xf2efe8, i: 3.2, angle: 1.25 },
      rim: { pos: V(0, 3.0, -44.5), color: 0xe4e2dc, i: 3.5 },
      fill: 2.0,
    },
    network: {
      exposure: 0.95, env: 0.32, fog: [0x0b0c0d, 6, 30],
      hemi: [0xb8bbc0, 0x1c1c1c, 0.6],
      key: { pos: V(-1.5, 3.2, -42.5), target: V(0, 1.3, -45.5), color: 0xf2efe8, i: 4.5, angle: 0.6 },
      rim: { pos: V(0.8, 2.6, -47.5), color: 0xe4e2dc, i: 3 },
      fill: 1.8,
    },
    noc: {
      exposure: 0.85, env: 0.15, fog: [0x070708, 7, 24],
      hemi: [0x9aa5b5, 0x0d0d0e, 0.18],
      key: { pos: V(0.6, 3.1, -0.8, N), target: V(0, 0.8, -1.7, N), color: 0xfff1e0, i: 2.4, angle: 0.75 },
      rim: { pos: V(0, 1.9, -3.9, N), color: 0xdde3ea, i: 2.2 },
      fill: 0.6,
    },
    monitor: {
      exposure: 0.85, env: 0.1, fog: [0x050506, 4, 16],
      hemi: [0x9aa5b5, 0x0d0d0e, 0.1],
      key: { pos: V(0.6, 3.1, -0.8, N), target: V(0, 0.8, -1.7, N), color: 0xfff1e0, i: 1.2, angle: 0.75 },
      rim: { pos: V(0, 1.2, -1.5, N), color: 0xdde3ea, i: 1.6 },
      fill: 0.3,
    },
    backup: {
      exposure: 1.0, env: 0.0, fog: [0x030304, 6, 20],
      hemi: [0x9aa5b5, 0x000000, 0.0],
      key: { pos: V(0.6, 3.1, -0.8, N), target: V(0, 0.8, -1.7, N), color: 0xfff1e0, i: 0, angle: 0.75 },
      rim: { pos: V(-4, 2.5, -2, N), color: 0xb8cdea, i: 0 },
      fill: 0,
    },
    lab: {
      exposure: 0.85, env: 0.32, fog: [0x0b0c0e, 14, 48],
      hemi: [0xe2e8ef, 0x2a2a2c, 0.85],
      key: { pos: V(0, 4.1, 2, L), target: V(0, 0, -1, L), color: 0xf4f6f8, i: 2.2, angle: 1.3 },
      rim: { pos: V(0, 2.4, -13.5, L), color: 0xe6e8ea, i: 5 },
      fill: 0.5,
    },
    campusMap: {
      exposure: 1.0, env: 0.16, fog: [0x2a2f38, 260, 700],
      hemi: [0x6a7894, 0x262820, 0.9],
      key: { pos: V(-120, 260, 140, C), target: V(20, 0, 20, C), color: 0xaab8d0, i: 1.1, angle: 0.7 },
      rim: { pos: V(20, 30, 20, C), color: 0xffd9a8, i: 0 },
      fill: 0,
    },
    campusStreet: {
      exposure: 1.1, env: 0.2, fog: [0x2a2f38, 30, 260],
      hemi: [0x6a7894, 0x262820, 1.25],
      key: { pos: V(-120, 260, 140, C), target: V(20, 0, 20, C), color: 0xb4c2da, i: 1.8, angle: 0.7 },
      rim: { pos: V(20, 30, 20, C), color: 0xffd9a8, i: 0 },
      fill: 0.5,
    },
  };
}

const TIMELINE = [
  [0.0, 'hero'], [0.145, 'hero'], [0.185, 'aisle'], [0.225, 'aisle'], [0.255, 'network'], [0.2995, 'network'],
  [0.3005, 'noc'], [0.455, 'noc'], [0.48, 'monitor'], [0.525, 'monitor'], [0.552, 'backup'], [0.6095, 'backup'],
  [0.6105, 'lab'], [0.7695, 'lab'], [0.7705, 'campusMap'], [0.83, 'campusMap'], [0.872, 'campusStreet'], [1.0, 'campusStreet'],
];

const ca = new Color();
const cb = new Color();
function lerpColor(a, b, t, out) {
  return out.copy(ca.set(a)).lerp(cb.set(b), t);
}

export class World {
  constructor(stage, quality) {
    this.stage = stage;
    this.quality = quality;
    const { scene } = stage;

    // Only the opening scene is built up front; the rest is built in the
    // background after the reveal (see buildRest) so first load is fast.
    this.server = buildServerRoom(quality);
    this.noc = null;
    this.lab = null;
    this.campus = null;
    this.complete = false;
    scene.add(this.server.group);

    // visibility windows in progress-space
    this.sections = [{ obj: this.server.group, from: -1, to: 0.3015 }];

    // fixed light rig
    this.hemi = new HemisphereLight(0xffffff, 0x000000, 0.3);
    this.key = new SpotLight(0xffffff, 2, 0, 0.6, 1, 0);
    // soft, physically placed shadows from the key light (desktop). The shadow map
    // is only re-rendered when the light actually moves → no per-frame cost.
    // dedicated GPUs only: integrated / mobile GPUs (Stage starts them at dprScale < 1) keep 60 fps instead
    this.shadows = !!quality.shadows && stage.dprScale >= 1;
    if (this.shadows) {
      stage.renderer.shadowMap.enabled = true;
      stage.renderer.shadowMap.autoUpdate = false;
      this.key.castShadow = true;
      const small = stage.dprScale < 1; // integrated / mobile-class GPU (see Stage)
      this.key.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
      this._shadowFrame = 0;
      this.key.shadow.bias = -0.0005;
      this.key.shadow.normalBias = 0.02;
      this.key.shadow.radius = 3;
      this.key.shadow.camera.near = 0.3;
      this.key.shadow.camera.far = 60;
      this._shadowKey = '';
    }
    this.keyTarget = new Object3D();
    this.key.target = this.keyTarget;
    this.rim = new PointLight(0xffffff, 5, 0, 2);
    this.fill = new PointLight(0xdfe6ee, 1, 0, 2);
    scene.add(this.hemi, this.key, this.keyTarget, this.rim, this.fill);
    scene.fog = new Fog(0x050506, 8, 30);

    this.states = lightStates();
    this.intro = 0; // 0 → 1 fade-up on first reveal
    this._c = new Color();
  }

  /** Build the remaining scenes one at a time, yielding to the browser between them. */
  async buildRest(yieldToBrowser) {
    const { scene } = this.stage;
    await yieldToBrowser();
    this.noc = buildNoc(this.quality);
    this.noc.room.position.copy(OFFSET.noc);
    this.noc.flow.position.copy(OFFSET.noc);
    scene.add(this.noc.room, this.noc.flow);
    this.sections.push({ obj: this.noc.room, from: 0.2985, to: 0.56 }, { obj: this.noc.flow, from: 0.5, to: 0.6115 });
    await this.compile([this.noc.room, this.noc.flow]);
    await yieldToBrowser();
    this.lab = buildLab(this.quality);
    this.lab.group.position.copy(OFFSET.lab);
    scene.add(this.lab.group);
    this.sections.push({ obj: this.lab.group, from: 0.6085, to: 0.7715 });
    await this.compile([this.lab.group]);
    await yieldToBrowser();
    this.campus = buildCampus(this.quality);
    this.campus.group.position.copy(OFFSET.campus);
    scene.add(this.campus.group);
    this.sections.push({ obj: this.campus.group, from: 0.7685, to: 2 });
    await this.compile([this.campus.group]);
    this.complete = true;
  }

  /**
   * Upload textures and compile shaders for the given groups WITHOUT blocking the
   * main thread: compileAsync lets the GPU driver link programs in the background
   * (KHR_parallel_shader_compile), so the page stays responsive while it works.
   */
  async compile(groups) {
    const { renderer, scene, camera } = this.stage;
    const vis = groups.map((g) => g.visible);
    groups.forEach((g) => (g.visible = true));
    for (const g of groups) {
      g.traverse((o) => {
        const m = o.material;
        if (!m) return;
        for (const mm of Array.isArray(m) ? m : [m]) {
          for (const k of ['map', 'emissiveMap', 'roughnessMap', 'alphaMap']) if (mm[k]) renderer.initTexture(mm[k]);
        }
      });
    }
    const jobs = groups.map((g) => renderer.compileAsync(g, camera, scene)); // traversal happens synchronously here
    groups.forEach((g, i) => (g.visible = vis[i]));
    await Promise.all(jobs);
  }

  applyLighting(p) {
    let i = 0;
    while (i < TIMELINE.length - 2 && TIMELINE[i + 1][0] <= p) i++;
    const [p0, n0] = TIMELINE[i];
    const [p1, n1] = TIMELINE[i + 1];
    const t = Math.min(1, Math.max(0, (p - p0) / Math.max(1e-6, p1 - p0)));
    const a = this.states[n0];
    const b = this.states[n1];
    const L = (x, y) => x + (y - x) * t;
    const intro = this.intro;
    const { renderer, scene, camera } = this.stage;

    renderer.toneMappingExposure = L(a.exposure, b.exposure);
    scene.environmentIntensity = L(a.env, b.env) * intro;
    lerpColor(a.fog[0], b.fog[0], t, scene.fog.color);
    scene.fog.near = L(a.fog[1], b.fog[1]);
    scene.fog.far = L(a.fog[2], b.fog[2]);
    scene.background.copy(scene.fog.color);

    lerpColor(a.hemi[0], b.hemi[0], t, this.hemi.color);
    lerpColor(a.hemi[1], b.hemi[1], t, this.hemi.groundColor);
    this.hemi.intensity = L(a.hemi[2], b.hemi[2]) * intro;

    this.key.position.lerpVectors(a.key.pos, b.key.pos, t);
    this.keyTarget.position.lerpVectors(a.key.target, b.key.target, t);
    lerpColor(a.key.color, b.key.color, t, this.key.color);
    this.key.intensity = L(a.key.i, b.key.i) * intro;
    this.key.angle = L(a.key.angle, b.key.angle);
    if (this.shadows) {
      const k = this.key.position;
      const t = this.keyTarget.position;
      const vis = this.sections.map((s) => (s.obj.visible ? 1 : 0)).join('');
      const sig = `${k.x.toFixed(2)},${k.y.toFixed(2)},${k.z.toFixed(2)},${t.x.toFixed(2)},${t.z.toFixed(2)},${this.key.angle.toFixed(2)},${vis}`;
      this._shadowFrame++;
      // while the light travels, refresh shadows at ~6 Hz; settle exactly when it stops
      const moving = sig !== this._shadowKey;
      if (moving && (this._shadowFrame > 9 || !this._shadowMoving)) {
        this._shadowFrame = 0;
        this._shadowMoving = true;
        this._shadowKey = sig;
        this.key.shadow.camera.far = this.key.position.y > 100 ? 600 : 60;
        renderer.shadowMap.needsUpdate = true;
      } else if (!moving && this._shadowMoving) {
        this._shadowMoving = false;
        renderer.shadowMap.needsUpdate = true;
      }
    }

    this.rim.position.lerpVectors(a.rim.pos, b.rim.pos, t);
    lerpColor(a.rim.color, b.rim.color, t, this.rim.color);
    this.rim.intensity = L(a.rim.i, b.rim.i) * intro;

    // fill rides with the camera (a soft practical light)
    this.fill.position.set(0.5, 0.4, 0.6).applyQuaternion(camera.quaternion).add(camera.position);
    this.fill.intensity = L(a.fill, b.fill) * intro;
  }

  update(p, dt, elapsed, walkD) {
    time.value = elapsed;
    for (const s of this.sections) s.obj.visible = p > s.from && p < s.to;
    this.applyLighting(p);
    if (this.server.group.visible) this.server.update(p);
    if (this.noc && (this.noc.room.visible || this.noc.flow.visible)) this.noc.update(p, dt);
    if (this.campus && this.campus.group.visible) this.campus.update(p, walkD);
  }
}
