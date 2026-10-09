/**
 * Shared materials + GPU-only effects (blinking LEDs, dust, light shafts, data pulses).
 * Everything animated here runs in shaders off a single `uTime` uniform —
 * no per-frame CPU work for blinking or drifting.
 */
import {
  MeshStandardMaterial,
  MeshBasicMaterial,
  ShaderMaterial,
  AdditiveBlending,
  Color,
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  DoubleSide,
} from 'three';
import { LED } from './textures/rackFaces.js';
import { wearTexture } from './textures/surfaces.js';

const wear = wearTexture();

export const time = { value: 0 };
export const pointScale = { value: 600 }; // set on resize: drawingBufferHeight / (2*tan(fov/2))

export const mat = {
  // powder-coated steel with wear (roughness varies with smudges & scratches)
  rackMetal: new MeshStandardMaterial({ color: 0x1b1c1e, metalness: 0.22, roughness: 0.55, roughnessMap: wear }),
  rackSide: new MeshStandardMaterial({ color: 0x131416, metalness: 0.2, roughness: 0.62, roughnessMap: wear }),
  chassis: new MeshStandardMaterial({ color: 0x232427, metalness: 0.3, roughness: 0.48, roughnessMap: wear }),
  steel: new MeshStandardMaterial({ color: 0x8a8d92, metalness: 0.45, roughness: 0.4, roughnessMap: wear }),
  tray: new MeshStandardMaterial({ color: 0x6a6d72, metalness: 0.4, roughness: 0.45, roughnessMap: wear }),
  black: new MeshStandardMaterial({ color: 0x0b0b0c, metalness: 0.2, roughness: 0.6 }),
  plastic: new MeshStandardMaterial({ color: 0x18191b, metalness: 0.05, roughness: 0.5, roughnessMap: wear }),
  desk: new MeshStandardMaterial({ color: 0x3a342e, metalness: 0.0, roughness: 0.6, roughnessMap: wear }),
  deskLight: new MeshStandardMaterial({ color: 0x9a948c, metalness: 0.0, roughness: 0.65, roughnessMap: wear }),
  wall: new MeshStandardMaterial({ color: 0x1c1d20, metalness: 0.0, roughness: 0.92 }),
  fabric: new MeshStandardMaterial({ color: 0x1a1b1e, metalness: 0.0, roughness: 0.95 }),
  skin: new MeshStandardMaterial({ color: 0x5a4436, roughness: 0.75 }),
  hair: new MeshStandardMaterial({ color: 0x0f0d0c, roughness: 0.85 }),
  cable: new MeshStandardMaterial({ vertexColors: true, metalness: 0.0, roughness: 0.62 }),
  lightPanel: new MeshBasicMaterial({ color: new Color(1.0, 0.98, 0.95) }),
};

/* ----------------------------------------------------------------- LEDs */

const ledVert = /* glsl */ `
  attribute vec3 aColor;
  attribute vec3 aBlink; // rate, duty, seed
  attribute float aSize;
  uniform float uTime;
  uniform float uScale;
  uniform float uSize;
  varying vec3 vColor;
  varying float vOn;
  void main() {
    vColor = aColor;
    float on = 1.0;
    if (aBlink.x > 0.0) {
      float ph = fract(aBlink.z + uTime * aBlink.x * 0.5);
      on = step(ph, aBlink.y);
      // occasional activity bursts
      on = mix(0.25, 1.0, on);
    }
    vOn = on;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(uSize * aSize * uScale / -mv.z, 1.0, 64.0);
    gl_Position = projectionMatrix * mv;
  }
`;
const ledFrag = /* glsl */ `
  uniform float uIntensity;
  varying vec3 vColor;
  varying float vOn;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    float core = smoothstep(0.3, 0.0, d);
    float glow = exp(-d * d * 9.0) * 0.18;
    float a = (core + glow) * vOn * uIntensity;
    if (a < 0.003) discard;
    gl_FragColor = vec4(mix(vColor, vec3(1.0), core * 0.35) * a, a);
  }
`;

export function ledMaterial(size = 0.012, intensity = 1) {
  return new ShaderMaterial({
    uniforms: { uTime: time, uScale: pointScale, uSize: { value: size }, uIntensity: { value: intensity } },
    vertexShader: ledVert,
    fragmentShader: ledFrag,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

/**
 * Build a Points object from LED descriptors {x,y,z,c,rate,duty,size}.
 */
export function ledPoints(list, size = 0.012, intensity = 1) {
  const pos = new Float32Array(list.length * 3);
  const col = new Float32Array(list.length * 3);
  const blink = new Float32Array(list.length * 3);
  const sz = new Float32Array(list.length);
  list.forEach((l, i) => {
    pos.set([l.x, l.y, l.z], i * 3);
    col.set(LED[l.c] || LED.green, i * 3);
    blink.set([l.rate || 0, l.duty ?? 0.5, (i * 0.618034) % 1], i * 3);
    sz[i] = l.size || 1;
  });
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('aColor', new Float32BufferAttribute(col, 3));
  g.setAttribute('aBlink', new Float32BufferAttribute(blink, 3));
  g.setAttribute('aSize', new Float32BufferAttribute(sz, 1));
  const p = new Points(g, ledMaterial(size, intensity));
  p.frustumCulled = false;
  return p;
}

/* ----------------------------------------------------------------- Dust */

export function dust(count, box, color = 0xbfc6d0, size = 0.018, opacity = 0.35) {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = box.min.x + Math.random() * (box.max.x - box.min.x);
    pos[i * 3 + 1] = box.min.y + Math.random() * (box.max.y - box.min.y);
    pos[i * 3 + 2] = box.min.z + Math.random() * (box.max.z - box.min.z);
    seed[i] = Math.random();
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new Float32BufferAttribute(seed, 1));
  const m = new ShaderMaterial({
    uniforms: { uTime: time, uScale: pointScale, uSize: { value: size }, uColor: { value: new Color(color) }, uOpacity: { value: opacity } },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime; uniform float uScale; uniform float uSize;
      varying float vA;
      void main() {
        vec3 p = position;
        float t = uTime * 0.05 + aSeed * 40.0;
        p.x += sin(t * 1.3 + aSeed * 6.0) * 0.25;
        p.y += sin(t * 0.7 + aSeed * 3.0) * 0.18 + fract(uTime * 0.004 + aSeed) * 0.4;
        p.z += cos(t * 0.9) * 0.25;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = clamp(uSize * uScale / -mv.z, 0.5, 9.0);
        vA = smoothstep(0.0, 0.25, fract(aSeed * 7.0 + uTime * 0.03)) * (0.4 + 0.6 * aSeed);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uOpacity; varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = smoothstep(1.0, 0.0, d) * vA * uOpacity;
        gl_FragColor = vec4(uColor * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const p = new Points(g, m);
  p.frustumCulled = false;
  return p;
}

/* -------------------------------------------------------- Light shafts */

/** Soft volumetric cone (fake) — additive, fades with height and at grazing angles. */
export function beamMaterial(color = 0xdfe6ef, strength = 0.12) {
  return new ShaderMaterial({
    uniforms: { uColor: { value: new Color(color) }, uStrength: { value: strength } },
    vertexShader: /* glsl */ `
      varying float vY; varying float vFres;
      void main() {
        vY = uv.y;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        vFres = abs(dot(n, normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uStrength;
      varying float vY; varying float vFres;
      void main() {
        float a = pow(vY, 1.6) * pow(vFres, 2.0) * uStrength;
        gl_FragColor = vec4(uColor * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
}

/* ---------------------------------------------------------- Data pulse */

/** Travelling light pulse along a tube (uses the tube's uv.x as length). */
export function pulseMaterial(color = 0x9cc3e6) {
  return new ShaderMaterial({
    uniforms: { uTime: time, uHead: { value: 0 }, uColor: { value: new Color(color) }, uStrength: { value: 1 } },
    vertexShader: /* glsl */ `
      varying float vX;
      void main() { vX = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform float uHead; uniform vec3 uColor; uniform float uStrength;
      varying float vX;
      void main() {
        float trail = smoothstep(uHead - 0.05, uHead, vX) * (1.0 - smoothstep(uHead, uHead + 0.004, vX));
        float packets = pow(max(0.0, sin((vX * 220.0 - uTime * 3.0))), 24.0) * step(vX, uHead) * 0.6;
        float a = (trail + packets) * uStrength;
        if (a < 0.004) discard;
        gl_FragColor = vec4(uColor * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}
