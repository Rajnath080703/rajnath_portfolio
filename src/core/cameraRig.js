/**
 * SCROLL = CAMERA. The whole journey is a list of shots. Each shot covers a
 * range of scroll progress and returns a camera position / look target for a
 * local t (0 → 1). Shots join under dips to black (see data/chapters.js).
 */
import { Vector3, CatmullRomCurve3, MathUtils } from 'three';
import { OFFSET } from '../world/layout.js';
import { chapters } from '../data/chapters.js';

const v = (x, y, z, o) => new Vector3(x, y, z).add(o);
const smooth = (t) => t * t * (3 - 2 * t);

/** Keyframed shot: Catmull-Rom through positions and look targets. */
function keyed(keys) {
  const pc = new CatmullRomCurve3(keys.map((k) => k.pos), false, 'centripetal');
  const lc = new CatmullRomCurve3(keys.map((k) => k.look), false, 'centripetal');
  const n = keys.length;
  const start = keys[0].p;
  const end = keys[n - 1].p;
  return {
    start,
    end,
    near: keys[0].near ?? 0.03,
    eval(p, out) {
      let i = 0;
      while (i < n - 2 && keys[i + 1].p <= p) i++;
      const a = keys[i];
      const b = keys[i + 1];
      let u = MathUtils.clamp((p - a.p) / (b.p - a.p), 0, 1);
      u = MathUtils.lerp(u, smooth(u), 0.35); // continuous dolly, only a gentle settle at keys
      const s = (i + u) / (n - 1);
      pc.getPoint(s, out.pos);
      lc.getPoint(s, out.look);
      out.fov = MathUtils.lerp(a.fov ?? 34, b.fov ?? a.fov ?? 34, u);
      out.near = MathUtils.lerp(a.near ?? 0.03, b.near ?? a.near ?? 0.03, u);
      out.shake = MathUtils.lerp(a.shake ?? 0, b.shake ?? 0, u);
    },
  };
}

export class CameraRig {
  constructor(camera, world, { reducedMotion = false, finePointer = true } = {}) {
    this.camera = camera;
    this.reduced = reducedMotion;
    this.finePointer = finePointer;
    this.out = { pos: new Vector3(), look: new Vector3(), fov: 34, near: 0.03, shake: 0 };
    this.mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    this.walkD = 0;
    this.world = world;
    this.shots = this.buildShots(world);

    if (finePointer && !reducedMotion) {
      window.addEventListener(
        'pointermove',
        (e) => {
          this.mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
          this.mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
        },
        { passive: true }
      );
    }
  }

  buildShots(world) {
    const S = OFFSET.server;
    const N = OFFSET.noc;
    const L = OFFSET.lab;
    const C = OFFSET.campus;
    const hp = world.server.anchors.heroPort;
    const np = world.server.anchors.netPort;

    const serverShot = keyed([
      { p: 0.0, pos: v(0, 1.2, 13.5, S), look: v(0, 1.05, 0, S), fov: 30 },
      { p: 0.035, pos: v(0.15, 1.2, 8.2, S), look: v(0, 1.05, 0, S), fov: 30 },
      { p: 0.07, pos: v(1.0, 1.3, 3.5, S), look: v(0, 1.0, 0.3, S), fov: 32 },
      { p: 0.095, pos: v(-0.6, 1.5, 1.75, S), look: v(0.05, 1.2, 0.4, S), fov: 34 },
      { p: 0.12, pos: hp.clone().add(new Vector3(0.36, 0.14, 0.58)), look: hp.clone().add(new Vector3(-0.12, -0.02, 0)), fov: 34 },
      { p: 0.14, pos: hp.clone().add(new Vector3(0.16, 0.06, 0.3)), look: hp.clone().add(new Vector3(0, 0.06, 0.06)), fov: 34, near: 0.02 },
      { p: 0.16, pos: v(0.5, 2.2, 1.25, S), look: v(0.12, 2.32, 0.2, S), fov: 36 },
      { p: 0.178, pos: v(0.22, 2.78, 0.9, S), look: v(0.04, 2.45, -2.5, S), fov: 38 },
      { p: 0.2, pos: v(0.12, 2.74, -12, S), look: v(0.04, 2.45, -17, S), fov: 40 },
      { p: 0.226, pos: v(0.14, 2.72, -37.5, S), look: v(0.05, 2.25, -44, S), fov: 38 },
      { p: 0.245, pos: v(0.35, 2.25, -43.3, S), look: new Vector3(np.x, 1.55, np.z), fov: 36 },
      { p: 0.265, pos: np.clone().add(new Vector3(0.5, 0.22, 0.95)), look: np.clone().add(new Vector3(-0.08, 0.02, 0)), fov: 34 },
      { p: 0.285, pos: np.clone().add(new Vector3(0.1, 0.035, 0.26)), look: np.clone(), fov: 34, near: 0.01 },
      { p: 0.3, pos: np.clone().add(new Vector3(0, 0, 0.004)), look: np.clone().add(new Vector3(0, 0, -0.3)), fov: 30, near: 0.002 },
    ]);

    const nocShot = keyed([
      { p: 0.3, pos: v(0.15, 1.95, -3.05, N), look: v(0.1, 1.95, -4.52, N), fov: 32 },
      { p: 0.335, pos: v(0.5, 1.82, -1.3, N), look: v(0, 1.88, -4.5, N), fov: 34 },
      { p: 0.37, pos: v(1.7, 1.62, 1.5, N), look: v(0, 1.3, -2.4, N), fov: 34 },
      { p: 0.4, pos: v(0.6, 1.55, 0.3, N), look: v(0, 1.12, -1.85, N), fov: 34 },
      { p: 0.425, pos: v(0.3, 1.47, -0.45, N), look: v(0, 1.06, -1.85, N), fov: 34 },
      { p: 0.445, pos: v(0.3, 1.43, -1.15, N), look: v(0, 1.04, -1.85, N), fov: 34 },
      { p: 0.462, pos: v(0.07, 1.1, -1.42, N), look: v(0, 1.035, -1.85, N), fov: 34, near: 0.02 },
      { p: 0.5, pos: v(0.0, 1.035, -1.45, N), look: v(0, 1.032, -1.85, N), fov: 34, near: 0.02 },
      { p: 0.53, pos: v(0.35, 1.25, -0.6, N), look: v(0, 1.05, -1.85, N), fov: 36 },
      { p: 0.555, pos: v(-0.6, 1.45, 1.8, N), look: v(-1.6, 1.2, -2.2, N), fov: 38 },
      { p: 0.582, pos: v(-3.9, 1.7, 3.6, N), look: v(-3.9, 1.3, -2.2, N), fov: 40 },
      { p: 0.61, pos: v(-7.0, 1.5, 1.8, N), look: v(-7.8, 1.15, -2.2, N), fov: 38 },
    ]);

    if (!world.lab) return [serverShot, nocShot];
    const T = world.lab.anchors.target.clone().add(L);
    const labShot = keyed([
      { p: 0.61, pos: v(0, 3.0, 14.2, L), look: v(0, 1.6, -8, L), fov: 42 },
      { p: 0.66, pos: v(0, 2.75, 8.5, L), look: v(0, 1.4, -8, L), fov: 40 },
      { p: 0.7, pos: v(-0.9, 2.1, 3.2, L), look: v(-2.0, 1.2, -4, L), fov: 38 },
      { p: 0.725, pos: v(-0.6, 1.65, 0.4, L), look: v(-2.4, 1.1, -2.0, L), fov: 36 },
      { p: 0.745, pos: v(-2.15, 1.64, -0.6, L), look: T.clone(), fov: 34 },
      { p: 0.758, pos: v(-2.47, 1.5, -1.42, L), look: T.clone(), fov: 34, near: 0.02 },
      { p: 0.77, pos: T.clone().add(new Vector3(0, 0, 0.3)), look: T.clone(), fov: 34, near: 0.01 },
    ]);

    if (!world.campus) return [serverShot, nocShot, labShot];
    const route = world.campus.anchors.route;
    const start = route.at(0).clone().add(C);
    const ahead = route.at(10).clone().add(C);
    const mapShot = keyed([
      { p: 0.77, pos: v(22, 220, 34.2, C), look: v(22, 0, 34, C), fov: 40, near: 0.5 },
      { p: 0.8, pos: v(22, 170, 72, C), look: v(22, 0, 32, C), fov: 40, near: 0.5 },
      { p: 0.835, pos: v(-28, 55, 140, C), look: v(15, 0, 45, C), fov: 40, near: 0.3 },
      { p: 0.858, pos: v(-5, 9, 112, C), look: v(0, 2, 80, C), fov: 44, near: 0.1 },
      { p: 0.875, pos: start.clone().setY(1.55), look: ahead.clone().setY(1.5), fov: 50, near: 0.1, shake: 1 },
    ]);

    const libLook = world.campus.anchors.library.clone().add(C).setY(6);
    const tmpA = new Vector3();
    const tmpB = new Vector3();
    const self = this;
    const arShot = {
      start: 0.875,
      end: 1.0,
      near: 0.1,
      eval(p, out) {
        const t = MathUtils.clamp((p - 0.875) / (0.975 - 0.875), 0, 1);
        const d = route.length * MathUtils.lerp(t, smooth(t), 0.35);
        self.walkD = d;
        route.at(d, tmpA).add(C);
        route.at(d + 10, tmpB).add(C);
        out.pos.copy(tmpA).setY(1.55);
        out.look.copy(tmpB).setY(1.5);
        const endBlend = smooth(MathUtils.clamp((d - (route.length - 28)) / 28, 0, 1));
        out.look.lerp(libLook, endBlend);
        out.fov = 50;
        out.near = 0.1;
        out.shake = 1;
      },
    };

    return [serverShot, nocShot, labShot, mapShot, arShot];
  }

  /** Rebuild the shot list once more of the world exists (background build). */
  refresh() {
    this.shots = this.buildShots(this.world);
  }

  /** Reduced motion: hold each chapter on a still frame (cuts under dips). */
  effectiveP(p) {
    if (!this.reduced) return p;
    const c = chapters.find((ch) => p >= ch.start && p < ch.end) || chapters[chapters.length - 1];
    return c.hold;
  }

  update(p, dt, elapsed) {
    const pp = this.effectiveP(p);
    const shot = this.shots.find((s) => pp >= s.start && pp <= s.end) || this.shots[this.shots.length - 1];
    if (pp < 0.875) this.walkD = 0;
    shot.eval(pp, this.out);
    const { camera, out } = this;

    camera.position.copy(out.pos);
    // breathing drift (hero) + handheld (AR) — tiny, never on reduced motion
    if (!this.reduced) {
      const breath = 0.004; // barely-there, like a camera on a slider
      camera.position.x += Math.sin(elapsed * 0.31) * breath;
      camera.position.y += Math.sin(elapsed * 0.43 + 1.3) * breath * 0.6;
      if (out.shake > 0) {
        // a phone held while walking: small, slow sway
        camera.position.x += (Math.sin(elapsed * 1.1) * 0.006 + Math.sin(elapsed * 2.3) * 0.002) * out.shake;
        camera.position.y += (Math.sin(elapsed * 1.6 + 0.5) * 0.006 + Math.abs(Math.sin(elapsed * 2.0)) * 0.004) * out.shake;
      }
    }
    camera.lookAt(out.look);

    // pointer parallax (damped)
    const m = this.mouse;
    const k = 1 - Math.exp(-dt * 1.5);
    m.x += (m.tx - m.x) * k;
    m.y += (m.ty - m.y) * k;
    camera.rotateY(-m.x * 0.006);
    camera.rotateX(-m.y * 0.004);

    // portrait screens: widen the vertical lens so the subject still fits horizontally
    let fov = out.fov;
    if (camera.aspect < 1.25) {
      const k = Math.min(1.9, Math.pow(1.25 / camera.aspect, 0.7));
      fov = MathUtils.radToDeg(2 * Math.atan(Math.tan(MathUtils.degToRad(fov) / 2) * k));
    }
    let dirty = false;
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      dirty = true;
    }
    if (Math.abs(camera.near - out.near) > 1e-4) {
      camera.near = out.near;
      dirty = true;
    }
    if (dirty) camera.updateProjectionMatrix();
    return dirty;
  }
}
