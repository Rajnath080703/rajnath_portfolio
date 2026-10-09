/**
 * SCENES 10–11 — WayFinder: a dusk campus, seen first as a map, then at
 * street level through a live AR phone view.
 */
import {
  Group,
  Mesh,
  PlaneGeometry,
  BoxGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  SphereGeometry,
  RingGeometry,
  CircleGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  ShaderMaterial,
  InstancedMesh,
  Object3D,
  Vector3,
  Color,
  BufferGeometry,
  Float32BufferAttribute,
  EdgesGeometry,
  LineSegments,
  LineBasicMaterial,
  Points,
  PointsMaterial,
  AdditiveBlending,
  BackSide,
  DoubleSide,
} from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { campus } from '../layout.js';
import { facadeTextures, groundTexture, asphaltTexture, glowSprite } from '../textures/surfaces.js';
import { rng } from '../textures/canvas.js';
import { time } from '../materials.js';

/** Polyline route with rounded corners + arc-length lookup + turn metadata. */
export function buildRoute(corners, radius = 7) {
  const pts = [];
  const v = corners.map(([x, z]) => new Vector3(x, 0, z));
  pts.push(v[0].clone());
  const turns = [];
  for (let i = 1; i < v.length - 1; i++) {
    const a = v[i - 1];
    const b = v[i];
    const c = v[i + 1];
    const dIn = b.clone().sub(a).normalize();
    const dOut = c.clone().sub(b).normalize();
    const p0 = b.clone().addScaledVector(dIn, -radius);
    const p2 = b.clone().addScaledVector(dOut, radius);
    for (let s = 0; s <= 12; s++) {
      const t = s / 12;
      // quadratic bezier p0 → b → p2
      const q = p0.clone().multiplyScalar((1 - t) * (1 - t)).addScaledVector(b, 2 * (1 - t) * t).addScaledVector(p2, t * t);
      pts.push(q);
    }
    // cross.y < 0 → right turn (camera looks along dIn)
    const cy = dIn.x * dOut.z - dIn.z * dOut.x;
    turns.push({ corner: b, dir: cy > 0 ? 'right' : 'left' });
  }
  pts.push(v[v.length - 1].clone());
  const dist = [0];
  for (let i = 1; i < pts.length; i++) dist.push(dist[i - 1] + pts[i].distanceTo(pts[i - 1]));
  const length = dist[dist.length - 1];
  // distance at which each corner apex is passed
  for (const t of turns) {
    let best = 0;
    let bd = Infinity;
    pts.forEach((p, i) => {
      const dd = p.distanceTo(t.corner);
      if (dd < bd) {
        bd = dd;
        best = i;
      }
    });
    t.at = dist[best];
  }
  function at(d, out = new Vector3()) {
    const dd = Math.max(0, Math.min(length, d));
    let i = 1;
    while (i < dist.length - 1 && dist[i] < dd) i++;
    const t = (dd - dist[i - 1]) / Math.max(1e-6, dist[i] - dist[i - 1]);
    return out.copy(pts[i - 1]).lerp(pts[i], t);
  }
  return { pts, length, at, turns };
}

function ribbonGeometry(pts, width) {
  const pos = [];
  const uv = [];
  const idx = [];
  let acc = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const n = pts[Math.min(pts.length - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize();
    const side = new Vector3(-n.z, 0, n.x).multiplyScalar(width / 2);
    if (i) acc += p.distanceTo(pts[i - 1]);
    pos.push(p.x + side.x, 0, p.z + side.z, p.x - side.x, 0, p.z - side.z);
    uv.push(acc, 0, acc, 1);
    if (i < pts.length - 1) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function scaleBoxUV(g, w, h, d, tileW = 24, tileH = 28) {
  const uv = g.attributes.uv;
  // face order: +x, -x, +y, -y, +z, -z ; 4 verts each
  const dims = [[d, h], [d, h], null, null, [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      if (!dims[f]) {
        uv.setXY(i, 0.008, 0.992);
      } else {
        uv.setXY(i, uv.getX(i) * (dims[f][0] / tileW), uv.getY(i) * (dims[f][1] / tileH));
      }
    }
  }
  uv.needsUpdate = true;
}

export function buildCampus(quality) {
  const group = new Group();
  group.name = 'campus';
  const rand = rng(2024);

  /* ---------- sky + ground ---------- */
  const sky = new Mesh(
    new SphereGeometry(420, 32, 16),
    new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { uTop: { value: new Color(0x06080c) }, uMid: { value: new Color(0x1a2130) }, uHorizon: { value: new Color(0x4a4e58) } },
      vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHorizon; varying vec3 vP;
        void main(){ float h = normalize(vP).y; vec3 c = mix(uHorizon, uMid, smoothstep(-0.02, 0.18, h)); c = mix(c, uTop, smoothstep(0.18, 0.7, h)); gl_FragColor = vec4(c, 1.0); }`,
    })
  );
  sky.renderOrder = -1;
  group.add(sky);

  const gt = groundTexture();
  gt.repeat.set(campus.size / 8, campus.size / 8);
  const ground = new Mesh(new PlaneGeometry(campus.size * 2, campus.size * 2), new MeshStandardMaterial({ map: gt, roughness: 0.95, color: 0x8c948e }));
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  /* ---------- roads & walkways ---------- */
  const at = asphaltTexture();
  at.repeat.set(1, 1);
  const roadGeos = [];
  const kerbGeos = [];
  for (const [x1, z1, x2, z2, w] of campus.roads) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const ang = Math.atan2(x2 - x1, z2 - z1);
    const g = new PlaneGeometry(w, len, 1, 1);
    g.rotateX(-Math.PI / 2);
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / 6), uv.getY(i) * (len / 6));
    g.rotateY(ang);
    g.translate((x1 + x2) / 2, 0.03, (z1 + z2) / 2);
    roadGeos.push(g);
    const k = new PlaneGeometry(w + 2.4, len + 2.4);
    k.rotateX(-Math.PI / 2);
    k.rotateY(ang);
    k.translate((x1 + x2) / 2, 0.015, (z1 + z2) / 2);
    kerbGeos.push(k);
  }
  group.add(new Mesh(mergeGeometries(kerbGeos), new MeshStandardMaterial({ color: 0x5a5d61, roughness: 0.85 })));
  group.add(new Mesh(mergeGeometries(roadGeos), new MeshStandardMaterial({ map: at, color: 0x7d8086, roughness: 0.75, metalness: 0.05 })));

  /* ---------- buildings ---------- */
  const { map: fMap, emissive: fEm } = facadeTextures();
  const bGeos = [];
  let library;
  for (const b of campus.buildings) {
    const g = new BoxGeometry(b.w, b.h, b.d);
    scaleBoxUV(g, b.w, b.h, b.d);
    g.translate(b.x, b.h / 2, b.z);
    bGeos.push(g);
    // roof parapet
    const r = new BoxGeometry(b.w + 0.4, 0.8, b.d + 0.4);
    scaleBoxUV(r, 0, 0, 0);
    r.translate(b.x, b.h + 0.1, b.z);
    bGeos.push(r);
    if (b.destination) library = b;
  }
  const facadeMat = new MeshStandardMaterial({ map: fMap, emissiveMap: fEm, emissive: new Color(1, 0.9, 0.75), emissiveIntensity: 1.1, roughness: 0.8, metalness: 0.1 });
  group.add(new Mesh(mergeGeometries(bGeos), facadeMat));

  // library highlight (AR "building identified")
  const libGeo = new BoxGeometry(library.w + 0.6, library.h + 0.6, library.d + 0.6);
  const hlMat = new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
  const hl = new LineSegments(new EdgesGeometry(libGeo), hlMat);
  hl.position.set(library.x, library.h / 2, library.z);
  const hlFillMat = new MeshBasicMaterial({ color: 0x9cc3e6, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, side: DoubleSide });
  const hlFill = new Mesh(libGeo, hlFillMat);
  hlFill.position.copy(hl.position);
  group.add(hl, hlFill);
  // entrance canopy on the library front (+z face)
  const canopy = new Mesh(new BoxGeometry(10, 0.4, 3), new MeshStandardMaterial({ color: 0x2b2d31, roughness: 0.6 }));
  canopy.position.set(library.x, 3.6, library.z + library.d / 2 + 1.5);
  const glass = new Mesh(new PlaneGeometry(8, 3.2), new MeshBasicMaterial({ color: new Color(0.32, 0.27, 0.2) }));
  glass.position.set(library.x, 1.6, library.z + library.d / 2 + 0.02);
  group.add(canopy, glass);

  /* ---------- trees ---------- */
  const onRoad = (x, z, pad) =>
    campus.roads.some(([x1, z1, x2, z2, w]) => {
      const minX = Math.min(x1, x2) - w / 2 - pad;
      const maxX = Math.max(x1, x2) + w / 2 + pad;
      const minZ = Math.min(z1, z2) - w / 2 - pad;
      const maxZ = Math.max(z1, z2) + w / 2 + pad;
      return x > minX && x < maxX && z > minZ && z < maxZ;
    });
  const inBuilding = (x, z, pad) => campus.buildings.some((b) => Math.abs(x - b.x) < b.w / 2 + pad && Math.abs(z - b.z) < b.d / 2 + pad);
  const treeN = quality.trees;
  const trunks = new InstancedMesh(new CylinderGeometry(0.14, 0.2, 2.4, 6).translate(0, 1.2, 0), new MeshStandardMaterial({ color: 0x2a221c, roughness: 1 }), treeN);
  const crownGeo = (() => {
    const parts = [];
    const r = rng(5);
    for (let i = 0; i < 6; i++) {
      const b = new IcosahedronGeometry(0.55 + r() * 0.25, 1);
      const pos = b.attributes.position;
      for (let k = 0; k < pos.count; k++) {
        const x = pos.getX(k);
        const y = pos.getY(k);
        const z = pos.getZ(k);
        const n = 1 + Math.sin(x * 9 + i) * Math.cos(z * 8 - i) * 0.08 + Math.sin(y * 11) * 0.05;
        pos.setXYZ(k, x * n, y * n, z * n);
      }
      b.translate((r() - 0.5) * 0.9, (r() - 0.3) * 0.6, (r() - 0.5) * 0.9);
      b.deleteAttribute('uv');
      const smooth = mergeVertices(b); // shared vertices → soft, leafy shading instead of facets
      smooth.computeVertexNormals();
      parts.push(smooth);
    }
    return mergeGeometries(parts);
  })();
  const crowns = new InstancedMesh(crownGeo, new MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }), treeN);
  const d = new Object3D();
  let placed = 0;
  let guard = 0;
  while (placed < treeN && guard++ < treeN * 30) {
    // bias trees along roads (avenues) for a believable campus
    let x;
    let z;
    if (rand() < 0.6) {
      const [x1, z1, x2, z2, w] = campus.roads[Math.floor(rand() * campus.roads.length)];
      const t = rand();
      const side = rand() > 0.5 ? 1 : -1;
      const len = Math.hypot(x2 - x1, z2 - z1);
      const nx = -(z2 - z1) / len;
      const nz = (x2 - x1) / len;
      x = x1 + (x2 - x1) * t + nx * side * (w / 2 + 3 + rand() * 1.5);
      z = z1 + (z2 - z1) * t + nz * side * (w / 2 + 3 + rand() * 1.5);
    } else {
      x = (rand() - 0.5) * 260;
      z = (rand() - 0.5) * 260;
    }
    if (onRoad(x, z, 1.6) || inBuilding(x, z, 3)) continue;
    const s = 0.8 + rand() * 0.6;
    d.position.set(x, 0, z);
    d.rotation.set(0, rand() * 6, 0);
    d.scale.set(s, s, s);
    d.updateMatrix();
    trunks.setMatrixAt(placed, d.matrix);
    d.position.set(x, 2.4 * s + 1.6 * s, z);
    d.scale.set(2.2 * s, 2.0 * s, 2.2 * s);
    d.updateMatrix();
    crowns.setMatrixAt(placed, d.matrix);
    crowns.setColorAt(placed, new Color().setHSL(0.27 + rand() * 0.06, 0.28, 0.1 + rand() * 0.05));
    placed++;
  }
  trunks.count = crowns.count = placed;
  group.add(trunks, crowns);

  /* ---------- streetlights ---------- */
  const lamps = [];
  for (const [x1, z1, x2, z2, w] of campus.roads) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const nx = -(z2 - z1) / len;
    const nz = (x2 - x1) / len;
    for (let s = 6; s < len; s += 20) {
      const side = (s / 20) % 2 < 1 ? 1 : -1;
      const t = s / len;
      lamps.push([x1 + (x2 - x1) * t + nx * side * (w / 2 + 1.4), z1 + (z2 - z1) * t + nz * side * (w / 2 + 1.4)]);
    }
  }
  const poles = new InstancedMesh(new CylinderGeometry(0.06, 0.09, 5, 6).translate(0, 2.5, 0), new MeshStandardMaterial({ color: 0x3a3d42, metalness: 0.3, roughness: 0.5 }), lamps.length);
  const heads = new InstancedMesh(new BoxGeometry(0.5, 0.12, 0.25), new MeshBasicMaterial({ color: new Color(1.4, 1.25, 1.0) }), lamps.length);
  const glowPos = [];
  lamps.forEach(([x, z], i) => {
    d.position.set(x, 0, z);
    d.rotation.set(0, 0, 0);
    d.scale.set(1, 1, 1);
    d.updateMatrix();
    poles.setMatrixAt(i, d.matrix);
    d.position.set(x, 5.0, z);
    d.updateMatrix();
    heads.setMatrixAt(i, d.matrix);
    glowPos.push(x, 4.9, z);
  });
  const glowG = new BufferGeometry();
  glowG.setAttribute('position', new Float32BufferAttribute(glowPos, 3));
  const glows = new Points(glowG, new PointsMaterial({ size: 1.4, map: glowSprite(), color: 0xffe2bf, transparent: true, opacity: 0.35, depthWrite: false, blending: AdditiveBlending }));
  // warm pools of light on the ground (cheap fake)
  const poolMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; float a = pow(max(0.0, 1.0 - d), 2.2) * 0.22; gl_FragColor = vec4(vec3(1.0, 0.82, 0.6) * a, a); }`,
  });
  const pools = new InstancedMesh(new PlaneGeometry(14, 14).rotateX(-Math.PI / 2), poolMat, lamps.length);
  lamps.forEach(([x, z], i) => {
    d.position.set(x, 0.06, z);
    d.updateMatrix();
    pools.setMatrixAt(i, d.matrix);
  });
  group.add(poles, heads, glows, pools);

  for (const o of [trunks, crowns, poles]) o.castShadow = true;
  group.traverse((o) => {
    if (o.isMesh && o.material && o.material.isMeshStandardMaterial) {
      o.receiveShadow = true;
      if (!o.isInstancedMesh) o.castShadow = true;
    }
  });

  /* ---------- route, marker, destination ---------- */
  const route = buildRoute(campus.route, 7);
  const routeMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: { uTime: time, uOpacity: { value: 1 }, uColor: { value: new Color(0x9cc3e6) } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform float uTime; uniform float uOpacity; uniform vec3 uColor; varying vec2 vUv;
      void main(){
        float edge = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
        float chev = 0.75 + 0.25 * step(0.5, fract(vUv.x * 0.18 - uTime * 0.6));
        gl_FragColor = vec4(uColor * chev, edge * uOpacity);
      }`,
  });
  const ribbon = new Mesh(ribbonGeometry(route.pts, 2.0), routeMat);
  ribbon.position.y = 0.08;
  group.add(ribbon);

  const marker = new Group();
  const puck = new Mesh(new CircleGeometry(1.1, 32).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: 0xffffff }));
  const ring = new Mesh(new RingGeometry(1.1, 1.6, 40).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: 0x9cc3e6, transparent: true, opacity: 0.9 }));
  const halo = new Mesh(new CircleGeometry(5, 40).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: 0x9cc3e6, transparent: true, opacity: 0.12, depthWrite: false }));
  puck.position.y = ring.position.y = 0.12;
  halo.position.y = 0.1;
  marker.add(halo, ring, puck);
  group.add(marker);

  const pin = new Group();
  const pinHead = new Mesh(new SphereGeometry(1.4, 20, 14), new MeshBasicMaterial({ color: 0xe8ebef }));
  pinHead.position.y = 9;
  const pinStem = new Mesh(new CylinderGeometry(0.12, 0.02, 7.5, 8), new MeshBasicMaterial({ color: 0xe8ebef }));
  pinStem.position.y = 4.6;
  pin.add(pinHead, pinStem);
  const end = route.pts[route.pts.length - 1];
  pin.position.set(end.x, 0, end.z - 6);
  group.add(pin);

  const tmp = new Vector3();
  function update(p, walkD) {
    // map mode: marker follows the walk; AR mode: ribbon and pin fade out
    const ar = Math.min(1, Math.max(0, (p - 0.86) / 0.02));
    routeMat.uniforms.uOpacity.value = 1 - ar; // the AR view shows only the arrows
    marker.visible = ar < 1;
    pin.visible = ar < 1;
    route.at(walkD, tmp);
    marker.position.set(tmp.x, 0, tmp.z);
    // building identified → destination reached
    const id = Math.min(1, Math.max(0, (p - 0.945) / 0.015));
    hlMat.opacity = id * 0.45; // a thin, quiet outline — no glow
    hlFillMat.opacity = 0;
  }

  return {
    group,
    update,
    anchors: { route, library: new Vector3(library.x, library.h / 2, library.z), libraryFront: new Vector3(library.x, 0, library.z + library.d / 2) },
  };
}
