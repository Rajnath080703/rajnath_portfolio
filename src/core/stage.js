/**
 * One WebGL renderer, one scene, one camera for the whole site.
 * Includes adaptive resolution: if frames get slow, DPR drops a notch.
 */
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Color,
  SRGBColorSpace,
  NeutralToneMapping,
  PCFShadowMap,
  MathUtils,
} from 'three';
import { pointScale } from '../world/materials.js';

export class Stage {
  constructor(canvas, quality) {
    this.quality = quality;
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: quality.antialias,
      powerPreference: 'high-performance',
      alpha: false,
      stencil: false,
    });
    this.renderer.outputColorSpace = SRGBColorSpace;
    // Shader error checks force the GPU driver to finish every compile synchronously
    // (seconds on some GPUs). Keep them in development, skip them in production.
    this.renderer.debug.checkShaderErrors = import.meta.env.DEV;
    this.renderer.toneMapping = NeutralToneMapping; // Khronos PBR Neutral: true-to-life colour and contrast
    this.renderer.shadowMap.type = PCFShadowMap;
    this.renderer.toneMappingExposure = 1;

    this.scene = new Scene();
    this.scene.background = new Color(0x050506);
    this.camera = new PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.03, 900);

    // No pre-filtered environment map: generating one (PMREM) costs ~4 s of
    // synchronous shader compilation on a cold first visit. Materials are tuned
    // as painted/powder-coated surfaces that read correctly under direct light.
    this.scene.environment = null;

    this.dprScale = 1;
    // integrated / mobile GPUs start a notch lower; adapt() raises it again if there is headroom
    try {
      const gl = this.renderer.getContext();
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      const name = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : '';
      if (/intel|uhd|iris|mali|adreno|powervr|swiftshader|llvmpipe/i.test(name)) this.dprScale = 0.8;
    } catch {
      /* ignore */
    }
    this.frameTimes = [];
    this.lastAdapt = 0;
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize, { passive: true });
    this.resize();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dpr = MathUtils.clamp(Math.min(window.devicePixelRatio || 1, this.quality.maxDpr) * this.dprScale, this.quality.minDpr, 3);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.updatePointScale();
  }

  updatePointScale() {
    const h = this.renderer.domElement.height;
    pointScale.value = h / (2 * Math.tan(MathUtils.degToRad(this.camera.fov) / 2));
  }

  /** Called every frame with dt (s). Lowers / raises DPR with hysteresis. */
  adapt(dt, now) {
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 90 || now - this.lastAdapt < 2) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    this.lastAdapt = now;
    if (avg > 1 / 45 && this.dprScale > 0.6) {
      this.dprScale = Math.max(0.6, this.dprScale - 0.15);
      this.resize();
    } else if (avg < 1 / 58 && this.dprScale < 1) {
      this.dprScale = Math.min(1, this.dprScale + 0.1);
      this.resize();
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
