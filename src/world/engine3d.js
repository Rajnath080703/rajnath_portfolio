/**
 * The procedural 3D engine (original version), kept as an alternative:
 * open the site with ?engine=3d. Same interface as PhotoEngine.
 */
import { Stage } from '../core/stage.js';
import { CameraRig } from '../core/cameraRig.js';
import { World } from './world.js';
import { OFFSET } from './layout.js';
import { Labels3D } from '../ui/labels3d.js';

export class ThreeEngine {
  constructor(canvas, { quality, reducedMotion, finePointer }) {
    this.opts = { quality, reducedMotion, finePointer };
    this.stage = new Stage(canvas, quality);
    this.renderer = this.stage.renderer;
    this.usesBlackouts = true;
  }

  /**
   * Fast start: build + compile only the opening server room, then reveal.
   * The remaining scenes are built in the background (this.ready resolves when
   * the whole journey exists). Shader compilation is asynchronous throughout.
   */
  async load(onProgress = () => {}) {
    const { quality, reducedMotion, finePointer } = this.opts;
    performance.mark('boot:world:start');
    this.world = new World(this.stage, quality);
    performance.mark('boot:world:built');
    onProgress(0.35);
    this.rig = new CameraRig(this.stage.camera, this.world, { reducedMotion, finePointer });
    this.update(0, 0.016, 0);
    await this.world.compile([this.world.server.group]);
    performance.mark('boot:world:compiled');
    onProgress(0.9);
    this.update(0, 0.016, 0);
    this.stage.render();
    performance.mark('boot:world:firstFrame');
    const yieldToBrowser = () => new Promise((r) => (window.requestIdleCallback ? requestIdleCallback(() => r(), { timeout: 400 }) : setTimeout(r, 30)));
    this.ready = this.world.buildRest(yieldToBrowser).then(() => this.rig.refresh());
  }

  get intro() {
    return this.world?.intro ?? 0;
  }
  set intro(v) {
    if (this.world) this.world.intro = v;
  }
  get walkD() {
    return this.rig.walkD;
  }

  update(p, dt, elapsed) {
    if (this.rig.update(p, dt, elapsed)) this.stage.updatePointScale();
    this.world.update(p, dt, elapsed, this.rig.walkD);
  }
  render() {
    this.stage.render();
  }
  adapt(dt, elapsed) {
    this.stage.adapt(dt, elapsed);
  }

  /** Projected 3D labels for the backup flow. */
  createBackupOverlay(root) {
    return new Labels3D(root, this.world, this.stage.camera);
  }

  /** WayFinder AR adapter driven by the 3D route. */
  nav() {
    const route = this.world.campus.anchors.route;
    const lib = this.world.campus.anchors.library.clone().add(OFFSET.campus).setY(10);
    const cam = this.stage.camera;
    return {
      identifiedAt: 0.945,
      arrivedAt: 0.973,
      cue: (p, walkD) => {
        for (const t of route.turns) {
          const ahead = t.at - walkD;
          if (ahead > -6 && ahead < 26) return t.dir;
        }
        return 'up';
      },
      target: () => {
        const v = lib.clone().project(cam);
        const x = (v.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
        return { x0: x, y0: y, x1: x, y1: y };
      },
    };
  }
}
