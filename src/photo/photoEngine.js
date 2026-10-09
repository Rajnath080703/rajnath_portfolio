/**
 * Photographic engine — the documentary camera.
 *
 * One full-screen quad, one shader: two photo plates (A/B) are framed by the
 * scroll-driven camera and dissolve into each other with a slight focus pull.
 * Live interfaces (Proxmox, installer, monitoring, WayFinder) are mapped onto
 * the real monitors in the photos with a homography, so they stay sharp at any
 * zoom and inherit the room's reflections. A restrained, unified grade keeps
 * every plate looking like it came from the same camera.
 *
 * Cost per frame: a handful of texture reads per pixel. No geometry, no lights.
 */
import {
  WebGLRenderer,
  Scene,
  OrthographicCamera,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Texture,
  CanvasTexture,
  Matrix3,
  Vector2,
  Vector4,
  LinearSRGBColorSpace,
  NoColorSpace,
  LinearMipmapLinearFilter,
  LinearFilter,
  NoToneMapping,
} from 'three';
import { plates, loadOrder, criticalCount } from './plates.js';
import { shots, arCue, AR_IDENTIFIED, AR_ARRIVED } from './shots.js';
import { arTarget } from './plates.js';
import { BackupFlow } from '../ui/backupFlow.js';
import { quadToSquare } from './homography.js';
import { drawCampusMapCanvas } from './campusMap.js';
import { proxmoxDashboard, installerScreen, monitoringScreen, labScreens, labStatusScreen } from '../world/textures/screens.js';
import { chapters } from '../data/chapters.js';
import { makeCanvas } from '../world/textures/canvas.js';

const BASE = import.meta.env.BASE_URL;

const vert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const frag = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform vec2 uRes;
  uniform float uMix;
  uniform float uBias;
  uniform float uIntro;
  uniform float uDip;

  uniform sampler2D uPhotoA; uniform sampler2D uScrA;
  uniform vec4 uViewA; uniform mat3 uHA; uniform vec4 uScrInfoA; uniform vec4 uGradeA;
  uniform sampler2D uPhotoB; uniform sampler2D uScrB;
  uniform vec4 uViewB; uniform mat3 uHB; uniform vec4 uScrInfoB; uniform vec4 uGradeB;

  vec3 grade(vec3 c, vec4 g) {
    c *= g.y;
    float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(l), c, g.x);
    c = (c - 0.5) * g.z + 0.5;
    c *= vec3(1.0 + g.w * 0.05, 1.0 + g.w * 0.01, 1.0 - g.w * 0.05);
    return clamp(c, 0.0, 1.0);
  }

  // view: cx, cy, zoom, photo aspect   |  scrInfo: hasScreen, gain, ready, -
  vec3 plate(sampler2D photo, sampler2D scr, vec4 view, mat3 H, vec4 info, vec4 g) {
    float va = uRes.x / uRes.y;
    vec2 s = vec2(min(1.0, va / view.w), min(1.0, view.w / va)) / view.z;
    vec2 c = clamp(view.xy, s * 0.5, 1.0 - s * 0.5);
    vec2 p = c + (vec2(vUv.x, 1.0 - vUv.y) - 0.5) * s;   // photo space, y down
    vec3 col = texture2D(photo, p, uBias).rgb;
    if (info.x > 0.5) {
      vec3 q = H * vec3(p, 1.0);
      vec2 su = q.xy / q.z;
      vec2 w = max(fwidth(su) * 1.2, vec2(1e-5));
      float inside = smoothstep(0.0, w.x, su.x) * smoothstep(0.0, w.x, 1.0 - su.x)
                   * smoothstep(0.0, w.y, su.y) * smoothstep(0.0, w.y, 1.0 - su.y);
      if (inside > 0.0) {
        vec3 ui = texture2D(scr, clamp(su, 0.0, 1.0), uBias * 0.6).rgb;
        // a real panel: black level lift, gentle falloff, room reflections on the glass
        float vig = 1.0 - 0.14 * dot(su - 0.5, su - 0.5) * 2.0;
        ui = (ui * 0.94 + 0.028) * vig * info.y;
        ui += col * 0.06;
        col = mix(col, ui, inside);
      }
    }
    return grade(col, g) * info.z;
  }

  void main() {
    vec3 a = plate(uPhotoA, uScrA, uViewA, uHA, uScrInfoA, uGradeA);
    vec3 col = a;
    if (uMix > 0.001) {
      vec3 b = plate(uPhotoB, uScrB, uViewB, uHB, uScrInfoB, uGradeB);
      col = mix(a, b, uMix);
    }
    gl_FragColor = vec4(col * uIntro * (1.0 - uDip), 1.0);
  }
`;

function prepTexture(t, { mip = true } = {}) {
  t.flipY = false; // photos & canvases are sampled top-down (y-down) everywhere
  t.colorSpace = NoColorSpace; // grade in display space, output untouched
  t.generateMipmaps = mip;
  t.minFilter = mip ? LinearMipmapLinearFilter : LinearFilter;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

async function loadBitmap(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`photo ${url}: ${res.status}`);
  const blob = await res.blob();
  if ('createImageBitmap' in window) return createImageBitmap(blob); // decoded off the main thread
  const img = new Image();
  img.src = URL.createObjectURL(blob);
  await img.decode();
  return img;
}

const ease = (u) => u + (u * u * (3 - 2 * u) - u) * 0.5;

function evalShot(shot, p, out) {
  const k = shot.keys;
  if (p <= k[0].p) return Object.assign(out, k[0]);
  if (p >= k[k.length - 1].p) return Object.assign(out, k[k.length - 1]);
  let i = 0;
  while (i < k.length - 2 && k[i + 1].p <= p) i++;
  const a = k[i];
  const b = k[i + 1];
  const u = ease((p - a.p) / (b.p - a.p));
  out.x = a.x + (b.x - a.x) * u;
  out.y = a.y + (b.y - a.y) * u;
  out.z = Math.exp(Math.log(a.z) + (Math.log(b.z) - Math.log(a.z)) * u); // zoom in log space
  return out;
}

export class PhotoEngine {
  constructor(canvas, { quality, reducedMotion, isMobile }) {
    this.reduced = reducedMotion;
    this.suffix = isMobile ? '-sm' : '';
    this.renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, stencil: false, depth: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = LinearSRGBColorSpace;
    this.renderer.toneMapping = NoToneMapping;
    this.maxDpr = isMobile ? 1.5 : 2;

    this.screenGain = {};
    this.black = prepTexture(new CanvasTexture(makeCanvas(2, 2)[0]), { mip: false });

    this.u = {
      uRes: { value: new Vector2(1, 1) },
      uMix: { value: 0 },
      uBias: { value: 0 },
      uIntro: { value: 0 },
      uDip: { value: 0 },
    };
    for (const s of ['A', 'B']) {
      this.u[`uPhoto${s}`] = { value: this.black };
      this.u[`uScr${s}`] = { value: this.black };
      this.u[`uView${s}`] = { value: new Vector4(0.5, 0.5, 1, 1.5) };
      this.u[`uH${s}`] = { value: new Matrix3() };
      this.u[`uScrInfo${s}`] = { value: new Vector4(0, 1, 0, 0) };
      this.u[`uGrade${s}`] = { value: new Vector4(1, 1, 1, 0) };
    }
    this.material = new ShaderMaterial({ uniforms: this.u, vertexShader: vert, fragmentShader: frag, depthTest: false, depthWrite: false });
    this.scene = new Scene();
    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene.add(new Mesh(new PlaneGeometry(2, 2), this.material));

    // plate state
    this.tex = {}; // name → texture
    this.views = {}; // name → last evaluated {x,y,z,s:[sx,sy],c:[cx,cy]}
    for (const name of Object.keys(plates)) {
      const pl = plates[name];
      if (pl.screen) pl.H = quadToSquare(pl.screen.quad);
    }

    // live interfaces
    this.ui = {
      proxmox: prepTexture(proxmoxDashboard()),
      installer: installerScreen(),
      monitoring: monitoringScreen(),
    };
    prepTexture(this.ui.installer.texture, { mip: false });
    prepTexture(this.ui.monitoring.texture, { mip: false });
    const mapScreen = drawCampusMapCanvas({ chrome: true });
    this.ui.map = prepTexture(new CanvasTexture(mapScreen));
    this.tex.map = prepTexture(new CanvasTexture(drawCampusMapCanvas()));
    this.monitorTimer = 0;
    this.shot = { x: 0.5, y: 0.5, z: 1 };
    this.shotB = { x: 0.5, y: 0.5, z: 1 };
    this.intro = 0;
    this.ready = Promise.resolve(); // photos stream in on their own; overlays can attach immediately

    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize, { passive: true });
    this.resize();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.u.uRes.value.set(w, h);
  }

  /** Load photos. Resolves once the opening plates are ready; the rest stream in. */
  async load(onProgress = () => {}) {
    let done = 0;
    const one = async (name) => {
      try {
        const bmp = await loadBitmap(`${BASE}photos/${name}${this.suffix}.webp`);
        const pl = plates[name];
        let t;
        if (pl.bake === 'lab-room') t = new CanvasTexture(this.bakeLabRoom(bmp));
        else {
          t = new Texture(bmp);
        }
        prepTexture(t);
        this.tex[name] = t;
        // upload during idle time so streaming never stalls a scroll frame
        const up = () => this.renderer.initTexture(t);
        if ('requestIdleCallback' in window) requestIdleCallback(up, { timeout: 500 });
        else setTimeout(up, 0);
      } catch (e) {
        console.warn(e);
      }
      done++;
      onProgress(done / loadOrder.length);
    };
    const critical = loadOrder.slice(0, criticalCount);
    await Promise.all(critical.map(one));
    for (const t of Object.values(this.tex)) this.renderer.initTexture(t);
    for (const t of Object.values(this.ui)) if (t.isTexture) this.renderer.initTexture(t);
    // stream the rest, two at a time, in story order
    const rest = loadOrder.slice(criticalCount);
    (async () => {
      while (rest.length) await Promise.all(rest.splice(0, 2).map(one));
    })();
  }

  /** The empty lab gets its instructor display and a few monitors switched on. */
  bakeLabRoom(bmp) {
    const W = bmp.width;
    const H = bmp.height;
    const [c, ctx] = makeCanvas(W, H);
    ctx.drawImage(bmp, 0, 0);
    // projector: a projected image is lower contrast than a monitor
    const status = labStatusScreen().image;
    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.drawImage(status, 0.393 * W, 0.358 * H, 0.201 * W, 0.192 * H);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0.393 * W, 0.358 * H, 0.201 * W, 0.192 * H);
    ctx.restore();
    const screens = labScreens().map((t) => t.image);
    const mons = [
      [0.1, 0.626, 0.185, 0.698], [0.209, 0.626, 0.297, 0.698], [0.328, 0.626, 0.412, 0.698],
      [0.6, 0.627, 0.685, 0.699], [0.716, 0.629, 0.802, 0.7], [0.829, 0.629, 0.917, 0.701],
    ];
    mons.forEach(([x0, y0, x1, y1], i) => {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.drawImage(screens[i % screens.length], x0 * W, y0 * H, (x1 - x0) * W, (y1 - y0) * H);
      ctx.restore();
    });
    return c;
  }

  setPlate(slot, name, view) {
    const pl = plates[name];
    const t = this.tex[name];
    const u = this.u;
    u[`uPhoto${slot}`].value = t || this.black;
    u[`uView${slot}`].value.set(view.x, view.y, view.z, pl.aspect);
    u[`uGrade${slot}`].value.set(...pl.grade);
    const info = u[`uScrInfo${slot}`].value;
    info.set(0, 1, t ? 1 : 0, 0);
    if (pl.screen && t) {
      u[`uH${slot}`].value.copy(pl.H);
      info.x = 1;
      info.y = pl.screen.gain * (this.screenGain[name] ?? 1);
      u[`uScr${slot}`].value = this.screenTexture(pl.screen.ui);
    }
    // remember framing for projecting overlays (AR target)
    const va = window.innerWidth / window.innerHeight;
    const sx = Math.min(1, va / pl.aspect) / view.z;
    const sy = Math.min(1, pl.aspect / va) / view.z;
    this.views[name] = {
      cx: Math.min(1 - sx / 2, Math.max(sx / 2, view.x)),
      cy: Math.min(1 - sy / 2, Math.max(sy / 2, view.y)),
      sx,
      sy,
    };
  }

  screenTexture(kind) {
    if (kind === 'workstation') return this.wsMode === 'monitoring' ? this.ui.monitoring.texture : this.ui.installer.texture;
    if (kind === 'map') return this.ui.map;
    return this.ui.proxmox;
  }

  /** Photo coords of a plate → screen px (only valid while that plate is on screen). */
  photoToScreen(name, x, y) {
    const v = this.views[name];
    if (!v) return null;
    return { x: ((x - v.cx) / v.sx + 0.5) * window.innerWidth, y: ((y - v.cy) / v.sy + 0.5) * window.innerHeight };
  }

  effectiveP(p) {
    if (!this.reduced) return p;
    const c = chapters.find((ch) => p >= ch.start && p < ch.end) || chapters[chapters.length - 1];
    return c.hold;
  }

  update(p0, dt, elapsed) {
    const p = this.effectiveP(p0);

    // the workstation: install → reboot → monitoring
    const install = Math.min(1, Math.max(0, (p - 0.385) / (0.455 - 0.385)));
    this.screenGain = { workstation: p > 0.455 && p < 0.463 ? 0.05 : 1 };
    this.wsMode = p >= 0.459 ? 'monitoring' : 'installer';
    if (this.wsMode === 'installer') this.ui.installer.set(install * 100);
    else if (p < 0.56) {
      this.monitorTimer += dt;
      if (this.monitorTimer > 0.5) {
        this.monitorTimer = 0;
        this.ui.monitoring.update();
      }
    }

    // pick the (at most two) shots covering p
    let a = null;
    let b = null;
    for (const s of shots) {
      const s0 = s.keys[0].p;
      const s1 = s.keys[s.keys.length - 1].p;
      if (p >= s0 && p <= s1) {
        if (!a) a = s;
        else if (!b) b = s;
      }
    }
    if (!a) a = p < shots[0].keys[0].p ? shots[0] : shots[shots.length - 1];

    const drift = this.reduced ? 0 : 1;
    const jitter = (o, z, k) => {
      o.x += (Math.sin(elapsed * 0.21 + k) * 0.0016 + Math.sin(elapsed * 0.53 + k * 2) * 0.0006) * drift / z;
      o.y += (Math.sin(elapsed * 0.17 + k + 1.3) * 0.0012 + Math.sin(elapsed * 0.47 + k) * 0.0005) * drift / z;
    };
    evalShot(a, p, this.shot);
    jitter(this.shot, this.shot.z, 0);
    this.setPlate('A', a.plate, this.shot);

    let mix = 0;
    if (b) {
      evalShot(b, p, this.shotB);
      jitter(this.shotB, this.shotB.z, 3);
      this.setPlate('B', b.plate, this.shotB);
      const t0 = b.keys[0].p;
      const t1 = a.keys[a.keys.length - 1].p;
      const t = Math.min(1, Math.max(0, (p - t0) / Math.max(1e-6, t1 - t0)));
      mix = t * t * (3 - 2 * t);
    }
    this.u.uMix.value = mix;
    // some transitions pass through darkness (into a switch port, out of a screen)
    this.u.uDip.value = b && b.dip ? b.dip * Math.sin(Math.PI * mix) : 0;
    // a slight focus pull through each dissolve
    this.u.uBias.value = Math.sin(Math.PI * mix) * 1.6;
    this.u.uIntro.value = this.intro;
    this.activePlates = b ? [a.plate, b.plate] : [a.plate];
    return false;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  adapt() {}

  get walkD() {
    return 0;
  }

  createBackupOverlay(root) {
    return new BackupFlow(root);
  }

  /** WayFinder AR adapter: cues come from the photographed route. */
  nav() {
    return {
      identifiedAt: AR_IDENTIFIED,
      arrivedAt: AR_ARRIVED,
      cue: (p) => arCue(this.effectiveP(p)),
      target: () => {
        const [x0, y0, x1, y1] = arTarget.box;
        const a = this.photoToScreen(arTarget.plate, x0, y0);
        const b = this.photoToScreen(arTarget.plate, x1, y1);
        return a && b ? { x0: a.x, y0: a.y, x1: b.x, y1: b.y } : null;
      },
    };
  }
}
