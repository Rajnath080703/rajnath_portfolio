/**
 * Rack building blocks shared by the server room, network rack, NOC and lab.
 */
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  InstancedMesh,
  Object3D,
  TubeGeometry,
  CatmullRomCurve3,
  Vector3,
  Color,
  Float32BufferAttribute,
  TorusGeometry,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RACK } from '../layout.js';
import { U, PANEL_W, HERO_LAYOUT, unitTexture, rackFaceTexture } from '../textures/rackFaces.js';
import { mat, ledPoints } from '../materials.js';
import { perforatedDoor } from '../textures/surfaces.js';

let doorMat = null;

const FRONT_Z = RACK.d / 2; // 0.535
const UNIT_FRONT_Z = FRONT_Z - 0.04;

export function unitBottomY(u) {
  return RACK.base + (u - 1) * U;
}

/** Merged rack enclosure (frame, sides, top, plinth, rear door). */
export function rackBodyGeometry() {
  const parts = [];
  const add = (w, h, d, x, y, z) => {
    const g = new BoxGeometry(w, h, d);
    g.translate(x, y, z);
    parts.push(g);
  };
  const W = RACK.w;
  const D = RACK.d;
  const H = RACK.h;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) add(0.035, H, 0.035, sx * (W / 2 - 0.0175), H / 2, sz * (D / 2 - 0.0175));
    add(0.012, H - 0.1, D - 0.04, sx * (W / 2 - 0.006), H / 2, 0); // side panels
    // front mounting rails
    add(0.016, 42 * U, 0.02, sx * (PANEL_W / 2 + 0.012), RACK.base + 21 * U, FRONT_Z - 0.03);
  }
  add(W, 0.035, D, 0, H - 0.0175, 0); // top
  add(W, RACK.base, D, 0, RACK.base / 2, 0); // plinth
  add(W - 0.02, H - 0.1, 0.012, 0, H / 2, -D / 2 + 0.01); // rear door
  const g = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return g;
}

const texCache = new Map();
function cachedUnit(type) {
  if (!texCache.has(type)) texCache.set(type, unitTexture(type, type.length * 977));
  return texCache.get(type);
}

/**
 * A close-up rack with real unit boxes, front textures and LED points.
 * Returns helpers to locate ports in rack-local space.
 */
export function detailedRack(layout = HERO_LAYOUT) {
  const group = new Group();
  const body = new Mesh(rackBodyGeometry(), mat.rackMetal);
  group.add(body);
  const leds = [];
  const units = [];
  const faceMats = new Map();
  for (const unit of layout) {
    const { texture, out, W, H } = cachedUnit(unit.type);
    if (!faceMats.has(unit.type)) faceMats.set(unit.type, new MeshStandardMaterial({ map: texture, metalness: 0.3, roughness: 0.5 }));
    const h = unit.h * U - 0.0015;
    const geo = new BoxGeometry(PANEL_W, h, 0.72);
    const m = new Mesh(geo, [mat.chassis, mat.chassis, mat.chassis, mat.chassis, faceMats.get(unit.type), mat.chassis]);
    const yb = unitBottomY(unit.u);
    m.position.set(0, yb + h / 2, UNIT_FRONT_Z - 0.36);
    group.add(m);
    const toLocal = (px, py) => new Vector3((px / W - 0.5) * PANEL_W, yb + h * (1 - py / H), UNIT_FRONT_Z + 0.002);
    for (const l of out.leds) {
      const v = toLocal(l.x, l.y);
      leds.push({ ...l, x: v.x, y: v.y, z: v.z + 0.001 });
    }
    units.push({ ...unit, ports: out.ports.map((pt) => toLocal(pt.x, pt.y)) });
  }
  const ledObj = ledPoints(leds, 0.0095, 1.15);
  group.add(ledObj);
  return { group, units, leds: ledObj };
}

/* ------------------------------------------------------------- Cables */

// ordinary patch cords: black, charcoal and grey (no colour coding, no glow)
export const CABLE_COLORS = ['#141517', '#1b1c1f', '#232427', '#2c2e31', '#3a3c40', '#4a4c50', '#5d6064'];

export function tubeWithColor(points, radius, color, segments = 40, radial = 5) {
  const curve = new CatmullRomCurve3(points, false, 'centripetal', 0.5);
  const g = new TubeGeometry(curve, segments, radius, radial, false);
  const c = new Color(color).convertSRGBToLinear();
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new Float32BufferAttribute(arr, 3));
  return g;
}

/** Patch cords between two units of a detailed rack: forward-bulging loops. */
export function patchCords(rack, fromUnitIdx, toUnitIdx, count, rand, bulge = 0.07) {
  const from = rack.units[fromUnitIdx].ports;
  const to = rack.units[toUnitIdx].ports.filter((_, i) => i % 2 === 0); // top row of switch
  const geos = [];
  for (let i = 0; i < Math.min(count, from.length); i++) {
    const a = from[i];
    const b = to[Math.min(to.length - 1, Math.round((i / from.length) * to.length))];
    // a real cord: straight out of the jack (boot), then gravity sag and a little lateral drift
    const sag = bulge * (0.6 + rand() * 0.8);
    const drift = (rand() - 0.5) * 0.035;
    const drop = 0.012 + rand() * 0.03;
    const pts = [
      a.clone(),
      a.clone().add(new Vector3(0, 0, 0.022)),
      new Vector3(a.x + drift * 0.4, a.y - drop * 0.5, a.z + sag * 0.75),
      new Vector3((a.x + b.x) / 2 + drift, Math.min(a.y, b.y) - drop, a.z + sag),
      new Vector3(b.x + drift * 0.3, b.y - drop * 0.4, b.z + sag * 0.7),
      b.clone().add(new Vector3(0, 0, 0.022)),
      b.clone(),
    ];
    geos.push(tubeWithColor(pts, 0.0027, CABLE_COLORS[Math.floor(rand() * CABLE_COLORS.length)], 36, 6));
    // moulded boots at both jacks
    for (const end of [a, b]) {
      const boot = tubeWithColor([end.clone(), end.clone().add(new Vector3(0, 0, 0.02))], 0.0042, '#2a2b2e', 2, 6);
      geos.push(boot);
    }
  }
  return geos;
}

export function mergedCables(geos) {
  const g = mergeGeometries(geos);
  geos.forEach((x) => x.dispose());
  return new Mesh(g, mat.cable);
}

/* --------------------------------------------------------- Rack rows */

/**
 * Instanced rows of racks: one InstancedMesh for all bodies, one per face
 * variant, and a single Points cloud for every LED in the rows.
 * `placements`: [{x, z, rotY}]
 */
export function rackRows(placements, variants = 3, seedBase = 100, { doors = true } = {}) {
  const group = new Group();
  const bodyGeo = rackBodyGeometry();
  const bodies = new InstancedMesh(bodyGeo, mat.rackMetal, placements.length);
  const faces = [];
  for (let v = 0; v < variants; v++) {
    const { texture, leds } = rackFaceTexture(seedBase + v * 13);
    const m = new MeshStandardMaterial({ map: texture, metalness: 0.3, roughness: 0.5 });
    const count = placements.filter((_, i) => i % variants === v).length;
    const im = new InstancedMesh(new PlaneGeometry(PANEL_W, 42 * U), m, count);
    faces.push({ im, leds, n: 0 });
  }
  const dummy = new Object3D();
  const allLeds = [];
  const faceLocal = new Vector3(0, RACK.base + 21 * U, UNIT_FRONT_Z);
  placements.forEach((p, i) => {
    dummy.position.set(p.x, 0, p.z);
    dummy.rotation.set(0, p.rotY, 0);
    dummy.updateMatrix();
    bodies.setMatrixAt(i, dummy.matrix);
    const f = faces[i % variants];
    const fd = new Object3D();
    fd.position.copy(faceLocal).applyAxisAngle(new Vector3(0, 1, 0), p.rotY).add(new Vector3(p.x, 0, p.z));
    fd.rotation.set(0, p.rotY, 0);
    fd.updateMatrix();
    f.im.setMatrixAt(f.n++, fd.matrix);
    for (const l of f.leds) {
      const v = new Vector3(l.mx, faceLocal.y + l.my, UNIT_FRONT_Z + 0.003).applyAxisAngle(new Vector3(0, 1, 0), p.rotY);
      allLeds.push({ ...l, x: v.x + p.x, y: v.y, z: v.z + p.z });
    }
  });
  bodies.instanceMatrix.needsUpdate = true;
  group.add(bodies);
  for (const f of faces) {
    f.im.instanceMatrix.needsUpdate = true;
    group.add(f.im);
  }
  const ledObj = ledPoints(allLeds, 0.0075, 0.9);
  group.add(ledObj);

  // perforated front doors with a handle — the equipment shows through the mesh
  if (doors) {
    if (!doorMat) {
      doorMat = new MeshStandardMaterial({ color: 0x1f2022, metalness: 0.25, roughness: 0.5, alphaMap: perforatedDoor(), transparent: true, depthWrite: false });
    }
    const door = new InstancedMesh(new PlaneGeometry(RACK.w - 0.03, RACK.h - 0.09), doorMat, placements.length);
    const handle = new InstancedMesh(new BoxGeometry(0.018, 0.16, 0.03), mat.steel, placements.length);
    const dd = new Object3D();
    const local = new Vector3();
    const Y = new Vector3(0, 1, 0);
    placements.forEach((p, i) => {
      local.set(0, RACK.h / 2, FRONT_Z + 0.012).applyAxisAngle(Y, p.rotY);
      dd.position.set(p.x + local.x, local.y, p.z + local.z);
      dd.rotation.set(0, p.rotY, 0);
      dd.updateMatrix();
      door.setMatrixAt(i, dd.matrix);
      local.set(RACK.w / 2 - 0.045, RACK.h / 2, FRONT_Z + 0.03).applyAxisAngle(Y, p.rotY);
      dd.position.set(p.x + local.x, local.y, p.z + local.z);
      dd.updateMatrix();
      handle.setMatrixAt(i, dd.matrix);
    });
    door.renderOrder = 2;
    group.add(door, handle);
  }
  return group;
}

/**
 * Vertical cable runs inside a rack's side managers: loosely bundled cords
 * dropping from the roof entry, held by velcro ties, peeling off at each panel.
 * Returns geometries in rack-local space (merge with mergedCables).
 */
export function sideBundles(rack, rand, sides = [-1, 1]) {
  const geos = [];
  const x0 = PANEL_W / 2 + 0.012;
  const zf = FRONT_Z - 0.02;
  const panels = rack.units.filter((u) => u.type === 'patch24' || u.type === 'switch1u');
  for (const side of sides) {
    const n = 7 + Math.floor(rand() * 5);
    for (let i = 0; i < n; i++) {
      const ox = side * (x0 + 0.004 + (rand() - 0.5) * 0.018);
      const oz = zf - rand() * 0.03;
      const target = panels.length ? panels[Math.floor(rand() * panels.length)] : null;
      const yEnd = target ? unitBottomY(target.u) + U * 0.5 : 1.2 + rand() * 0.4;
      const pts = [new Vector3(ox * 0.9, RACK.h - 0.03, oz - 0.05)];
      for (let y = RACK.h - 0.12; y > yEnd + 0.06; y -= 0.18) pts.push(new Vector3(ox + (rand() - 0.5) * 0.006, y, oz + (rand() - 0.5) * 0.006));
      // peel off towards the panel
      pts.push(new Vector3(ox - side * 0.012, yEnd + 0.03, oz + 0.02), new Vector3(side * (PANEL_W / 2 - 0.02 - rand() * 0.08), yEnd, FRONT_Z + 0.015));
      geos.push(tubeWithColor(pts, 0.0026, CABLE_COLORS[Math.floor(rand() * CABLE_COLORS.length)], 60, 5));
    }
    // velcro ties around the bundle
    for (let y = RACK.h - 0.25; y > 0.9; y -= 0.32) {
      const tie = new TorusGeometry(0.014, 0.0025, 4, 12);
      tie.rotateX(Math.PI / 2);
      tie.translate(side * (x0 + 0.004), y, zf - 0.015);
      const c = new Color('#1e1f22').convertSRGBToLinear();
      const arr = new Float32Array(tie.attributes.position.count * 3);
      for (let k = 0; k < tie.attributes.position.count; k++) arr.set([c.r, c.g, c.b], k * 3);
      tie.setAttribute('color', new Float32BufferAttribute(arr, 3));
      geos.push(tie.toNonIndexed ? tie : tie);
    }
  }
  return geos;
}

/* ===================================================================
 * Structured cabling — how a real network rack is dressed:
 *   switch ▸ horizontal finger manager ▸ patch panel, with vertical
 *   managers on both sides. Short same-colour patch cords leave each
 *   jack in a moulded RJ45 plug, dip through the manager fingers and
 *   land in the switch port below. Not every port is used.
 * =================================================================== */

export const CHANNEL_X = 0.35; // centre of the vertical managers (rack becomes a 800 mm network rack)
const PORT_Z = UNIT_FRONT_Z + 0.002;

// clear polycarbonate RJ45 housing — reads as pale grey, not white
const plugMat = new MeshStandardMaterial({ color: 0x7c8085, roughness: 0.3, metalness: 0.0 });
const bootMat = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.62 });

/** Finger ducts on each horizontal manager + two vertical managers. Adds meshes to rack.group. */
export function addManagers(rack, { vertical = true } = {}) {
  const fingers = [];
  for (const unit of rack.units) {
    if (unit.type !== 'cablemgr') continue;
    const y = unitBottomY(unit.u) + U / 2;
    for (let i = 0; i <= 11; i++) fingers.push([-0.22 + i * 0.04, y, PORT_Z + 0.02, 0.005, U * 0.62, 0.036]);
    // top & bottom lips of the duct
    fingers.push([0, y + U * 0.45, PORT_Z + 0.004, PANEL_W - 0.02, 0.004, 0.012], [0, y - U * 0.45, PORT_Z + 0.004, PANEL_W - 0.02, 0.004, 0.012]);
  }
  if (vertical) {
    for (const sx of [-1, 1]) {
      // channel: back plate, outer wall, and finger tabs on both front edges every U
      fingers.push([sx * CHANNEL_X, RACK.h / 2, FRONT_Z - 0.11, 0.1, RACK.h - 0.08, 0.008]);
      fingers.push([sx * (CHANNEL_X + 0.05), RACK.h / 2, FRONT_Z - 0.03, 0.008, RACK.h - 0.08, 0.17]);
      for (let y = RACK.base + U / 2; y < RACK.h - 0.06; y += U) {
        fingers.push([sx * (CHANNEL_X - 0.038), y, FRONT_Z + 0.045, 0.024, 0.009, 0.012]);
        fingers.push([sx * (CHANNEL_X + 0.038), y, FRONT_Z + 0.045, 0.024, 0.009, 0.012]);
      }
      fingers.push([sx * CHANNEL_X, RACK.h - 0.01, FRONT_Z - 0.03, 0.1, 0.02, 0.17]); // cap
    }
  }
  const im = new InstancedMesh(new BoxGeometry(1, 1, 1), mat.plastic, fingers.length);
  const d = new Object3D();
  fingers.forEach(([x, y, z, w, h, dd], i) => {
    d.position.set(x, y, z);
    d.scale.set(w, h, dd);
    d.updateMatrix();
    im.setMatrixAt(i, d.matrix);
  });
  im.castShadow = true;
  im.receiveShadow = true;
  rack.group.add(im);
}

function unitIndex(rack, type, nth) {
  return rack.units.map((u, i) => (u.type === type ? i : -1)).filter((i) => i >= 0)[nth];
}

/**
 * Patch cords for every switch ▸ manager ▸ patch block.
 * Returns { geos, plugs } where plugs = [{ pos, color }] for plugMeshes().
 */
export function structuredCords(rack, rand, colors = ['#7f848a', '#1c1d20']) {
  const geos = [];
  const plugs = [];
  let block = 0;
  rack.units.forEach((u, i) => {
    if (u.type !== 'switch1u') return;
    const mgr = rack.units[i + 1];
    const patch = rack.units[i + 2];
    if (!mgr || !patch || mgr.type !== 'cablemgr' || patch.type !== 'patch24') return;
    const color = colors[block++ % colors.length];
    const yM = unitBottomY(mgr.u) + U / 2;
    const P = [...patch.ports].sort((a, b) => a.x - b.x);
    const S = u.ports.filter((_, k) => k % 2 === 0).sort((a, b) => a.x - b.x); // top row
    const used = 14 + Math.floor(rand() * 8); // 14–21 ports in use; the rest stay empty
    for (let k = 0; k < used; k++) {
      if (rand() < 0.06) continue; // the odd unused jack
      const a = P[k];
      const b = S[k];
      const c = rand() < 0.08 ? CABLE_COLORS[Math.floor(rand() * 3)] : color; // a few odd ones out
      const slack = 0.004 + rand() * 0.01;
      const pts = [
        new Vector3(a.x, a.y, PORT_Z + 0.03),
        new Vector3(a.x + (b.x - a.x) * 0.15, a.y - 0.016, PORT_Z + 0.048 + slack * 0.5),
        new Vector3((a.x + b.x) / 2 + (rand() - 0.5) * 0.006, yM, PORT_Z + 0.046 + slack),
        new Vector3(b.x + (a.x - b.x) * 0.15, b.y + 0.016, PORT_Z + 0.048 + slack * 0.5),
        new Vector3(b.x, b.y, PORT_Z + 0.03),
      ];
      geos.push(tubeWithColor(pts, 0.0026, c, 16, 5));
      plugs.push({ pos: a, color: c }, { pos: b, color: c });
    }
  });
  return { geos, plugs };
}

/** Cords from a device (e.g. firewall) down into the nearest manager and away into a vertical channel. */
export function deviceCords(rack, unitIdx, count, side, rand, color = '#1c1d20') {
  const geos = [];
  const plugs = [];
  const dev = rack.units[unitIdx];
  const below = rack.units[unitIdx - 1];
  const yM = below ? unitBottomY(below.u) + U / 2 : unitBottomY(dev.u) - U / 2;
  const ports = [...dev.ports].sort((a, b) => side * (b.x - a.x));
  for (let k = 0; k < Math.min(count, ports.length); k++) {
    const a = ports[k];
    const drop = 0.25 + rand() * 0.35;
    const pts = [
      new Vector3(a.x, a.y, PORT_Z + 0.03),
      new Vector3(a.x, a.y - 0.015, PORT_Z + 0.048),
      new Vector3(side * 0.2, yM + (rand() - 0.5) * 0.008, PORT_Z + 0.047 + rand() * 0.006),
      new Vector3(side * (CHANNEL_X - 0.03), yM - 0.01, FRONT_Z + 0.02),
      new Vector3(side * (CHANNEL_X + (rand() - 0.5) * 0.04), yM - drop * 0.4, FRONT_Z - 0.01),
      new Vector3(side * (CHANNEL_X + (rand() - 0.5) * 0.04), yM - drop, FRONT_Z - 0.04),
    ];
    geos.push(tubeWithColor(pts, 0.0026, color, 24, 5));
    plugs.push({ pos: a, color });
  }
  return { geos, plugs };
}

/** Loose vertical runs inside the side channels (top entry down to various heights). */
export function channelBundles(rand, sides = [-1, 1]) {
  const geos = [];
  for (const side of sides) {
    const n = 8 + Math.floor(rand() * 6);
    for (let i = 0; i < n; i++) {
      const x = side * (CHANNEL_X + (rand() - 0.5) * 0.06);
      const z = FRONT_Z - 0.09 + rand() * 0.11;
      const yEnd = 0.5 + rand() * 1.0;
      const pts = [new Vector3(x * 0.95, RACK.h + 0.02, z - 0.04)];
      for (let y = RACK.h - 0.1; y > yEnd; y -= 0.22) pts.push(new Vector3(x + (rand() - 0.5) * 0.008, y, z + (rand() - 0.5) * 0.008));
      pts.push(new Vector3(x, yEnd - 0.05, z - 0.03));
      geos.push(tubeWithColor(pts, 0.0028, CABLE_COLORS[Math.floor(rand() * CABLE_COLORS.length)], 50, 5));
    }
  }
  return geos;
}

/** Instanced RJ45 plugs (clear housing) + coloured strain-relief boots. */
export function plugMeshes(plugs) {
  const body = new InstancedMesh(new BoxGeometry(0.0117, 0.0082, 0.022), plugMat, plugs.length);
  const boot = new InstancedMesh(new BoxGeometry(0.0124, 0.0094, 0.016), bootMat, plugs.length);
  const d = new Object3D();
  const c = new Color();
  plugs.forEach((pl, i) => {
    d.position.set(pl.pos.x, pl.pos.y, PORT_Z + 0.001); // half of the plug sits inside the jack
    d.scale.set(1, 1, 1);
    d.updateMatrix();
    body.setMatrixAt(i, d.matrix);
    d.position.z = PORT_Z + 0.019;
    d.updateMatrix();
    boot.setMatrixAt(i, d.matrix);
    boot.setColorAt(i, c.set(pl.color).convertSRGBToLinear());
  });
  body.instanceMatrix.needsUpdate = true;
  boot.instanceMatrix.needsUpdate = true;
  if (boot.instanceColor) boot.instanceColor.needsUpdate = true;
  body.castShadow = boot.castShadow = true;
  return [body, boot];
}

export { unitIndex, PORT_Z };
