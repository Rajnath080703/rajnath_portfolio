/**
 * SCENES 01–03 — Hero rack, data-centre aisle, the Ethernet cable, network rack.
 */
import {
  Group,
  Mesh,
  PlaneGeometry,
  BoxGeometry,
  CylinderGeometry,
  InstancedMesh,
  Object3D,
  MeshStandardMaterial,
  Vector3,
  CatmullRomCurve3,
  TubeGeometry,
  Box3,
} from 'three';
import { RACK, AISLE_X, NET_RACK_Z, TRAY_Y } from '../layout.js';
import { raisedFloor, rowLabel } from '../textures/surfaces.js';
import { rng } from '../textures/canvas.js';
import { mat } from '../materials.js';
import { detailedRack, mergedCables, rackRows, tubeWithColor, addManagers, structuredCords, deviceCords, channelBundles, plugMeshes, CHANNEL_X, PORT_Z } from './rack.js';
import { U } from '../textures/rackFaces.js';

const NET_LAYOUT = (() => {
  const seq = [
    ['ups2u', 2], ['blank', 1], ['server1u', 1], ['server1u', 1], ['blank', 1], ['storage2u', 2], ['blank', 1],
    ['switch1u', 1], ['cablemgr', 1], ['patch24', 1], ['blank', 1],
    ['switch1u', 1], ['cablemgr', 1], ['patch24', 1], ['blank', 1],
    ['switch1u', 1], ['cablemgr', 1], ['patch24', 1], ['blank', 1],
    ['switch1u', 1], ['cablemgr', 1], ['patch24', 1], ['blank', 1],
    ['firewall1u', 1], ['blank', 1], ['firewall1u', 1],
  ];
  let u = 1;
  const out = [];
  for (const [type, h] of seq) {
    out.push({ type, u, h });
    u += h;
  }
  while (u <= 42) out.push({ type: 'blank', u: u++, h: 1 });
  return out;
})();

export function buildServerRoom(quality) {
  const group = new Group();
  group.name = 'serverRoom';
  const rand = rng(77);

  /* ---------- room shell ---------- */
  const floorTex = raisedFloor();
  floorTex.repeat.set(8 / 2.4, 76 / 2.4);
  const floor = new Mesh(
    new PlaneGeometry(8, 76),
    new MeshStandardMaterial({ map: floorTex, roughness: 0.5, metalness: 0.25, color: 0xc4c7cb })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -16);
  group.add(floor);

  // light, clean surfaces — a working server room is bright, not a black void
  const shell = new MeshStandardMaterial({ color: 0x8e9195, roughness: 0.9 });
  const ceiling = new Mesh(new PlaneGeometry(8, 76), new MeshStandardMaterial({ color: 0xb4b6b9, roughness: 0.95 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 3.35, -16);
  group.add(ceiling);
  for (const sx of [-1, 1]) {
    const wall = new Mesh(new PlaneGeometry(76, 3.4), shell);
    wall.rotation.y = -sx * Math.PI / 2;
    wall.position.set(sx * 3.6, 1.7, -16);
    group.add(wall);
  }
  const back = new Mesh(new PlaneGeometry(8, 3.4), shell);
  back.position.set(0, 1.7, NET_RACK_Z - 1.2);
  group.add(back);

  /* ---------- hero rack ---------- */
  const hero = detailedRack();
  group.add(hero.group);
  // patch cords: patch24 → switch below (two pairs), + a few from the edge firewall
  const idx = (type, nth = 0) => hero.units.map((u, i) => (u.type === type ? i : -1)).filter((i) => i >= 0)[nth];
  // dressed like a working network rack: finger managers, short same-colour cords, real plugs
  addManagers(hero);
  const heroCords = structuredCords(hero, rand, ['#7f848a', '#1c1d20']);
  const fw = deviceCords(hero, idx('firewall1u', 0), 5, -1, rand, '#1c1d20');
  const cordGeos = [...heroCords.geos, ...fw.geos, ...channelBundles(rand)];
  for (const m of plugMeshes([...heroCords.plugs, ...fw.plugs])) hero.group.add(m);

  /* ---------- background rows ---------- */
  const perSide = quality.rowRacks;
  const placements = [];
  for (let i = 0; i < perSide; i++) {
    const z = -1.6 - i * 0.62;
    placements.push({ x: -AISLE_X, z, rotY: Math.PI / 2 }, { x: AISLE_X, z, rotY: -Math.PI / 2 });
  }
  const rows = rackRows(placements, 3, 300);
  group.add(rows);
  // row labels on the end panels
  for (const [x, t] of [[-AISLE_X, 'ROW A'], [AISLE_X, 'ROW B']]) {
    const plate = new Mesh(new PlaneGeometry(0.2, 0.075), new MeshStandardMaterial({ map: rowLabel(t), roughness: 0.4 }));
    plate.position.set(x, 1.86, -1.6 + RACK.w / 2 + 0.002);
    group.add(plate);
  }

  /* ---------- overhead cable tray ---------- */
  const trayLen = Math.abs(NET_RACK_Z) + 1.2;
  const trayZ = -trayLen / 2 + 0.6;
  for (const sx of [-1, 1]) {
    const rail = new Mesh(new BoxGeometry(0.012, 0.07, trayLen), mat.tray);
    rail.position.set(sx * 0.16, TRAY_Y, trayZ);
    group.add(rail);
  }
  const rungCount = Math.floor(trayLen / 0.3);
  const rungs = new InstancedMesh(new BoxGeometry(0.32, 0.01, 0.025), mat.tray, rungCount);
  const rods = new InstancedMesh(new CylinderGeometry(0.005, 0.005, 3.35 - TRAY_Y, 6), mat.steel, Math.floor(trayLen / 2) * 2);
  const d = new Object3D();
  for (let i = 0; i < rungCount; i++) {
    d.position.set(0, TRAY_Y - 0.03, 0.6 - i * 0.3);
    d.updateMatrix();
    rungs.setMatrixAt(i, d.matrix);
  }
  let r = 0;
  for (let i = 0; i < Math.floor(trayLen / 2); i++) {
    for (const sx of [-1, 1]) {
      d.position.set(sx * 0.17, (3.35 + TRAY_Y) / 2, 0.2 - i * 2);
      d.updateMatrix();
      rods.setMatrixAt(r++, d.matrix);
    }
  }
  group.add(rungs, rods);

  // cable bundle in the tray (rack top → tray → network rack top)
  const bundle = [];
  for (let i = 0; i < 9; i++) {
    const x = -0.12 + (i % 5) * 0.05 + (rand() - 0.5) * 0.02;
    const y = TRAY_Y - 0.015 + Math.floor(i / 5) * 0.012;
    const pts = [new Vector3(x * 0.6, RACK.h - 0.02, -0.1), new Vector3(x, y, -0.6)];
    for (let z = -3; z > NET_RACK_Z + 2; z -= 5) pts.push(new Vector3(x + (rand() - 0.5) * 0.01, y, z));
    pts.push(new Vector3(x, y, NET_RACK_Z + 0.4), new Vector3(x * 0.6, RACK.h - 0.02, NET_RACK_Z + 0.05));
    bundle.push(tubeWithColor(pts, 0.006, ['#26292e', '#33465e', '#1c1d20', '#4b5260'][i % 4], 220, 5));
  }

  /* ---------- network rack ---------- */
  const net = detailedRack(NET_LAYOUT);
  net.group.position.set(0, 0, NET_RACK_Z);
  group.add(net.group);
  const nIdx = (type, nth) => net.units.map((u, i) => (u.type === type ? i : -1)).filter((i) => i >= 0)[nth];
  addManagers(net);
  const netStructured = structuredCords(net, rand, ['#1c1d20', '#7f848a', '#2c2e31', '#7f848a']);
  const netCords = [...netStructured.geos, ...channelBundles(rand)];
  for (const m of plugMeshes(netStructured.plugs)) net.group.add(m);
  netCords.forEach((g) => g.translate(0, 0, NET_RACK_Z));
  // target switch (3rd switch) – the cable lands in one of its top-row ports
  const targetSwitch = net.units[nIdx('switch1u', 2)];
  const targetPortLocal = [...targetSwitch.ports.filter((_, k) => k % 2 === 0)].sort((a, b) => b.x - a.x)[0]; // rightmost top-row port (left free)
  const netPort = targetPortLocal.clone().add(new Vector3(0, 0, NET_RACK_Z));

  /* ---------- THE cable ---------- */
  // the cord we follow: out of the top patch panel, through the finger duct, up the
  // right-hand vertical manager and out of the roof into the overhead tray.
  const heroPatch = hero.units[idx('patch24', 1)];
  const heroPort = [...heroPatch.ports].sort((a, b) => b.x - a.x)[0].clone(); // rightmost jack
  const mgrBelow = hero.units[idx('patch24', 1) - 1];
  const yM = 0.066 + (mgrBelow.u - 1) * U + U / 2;
  const zc = PORT_Z + 0.046;
  const cy = TRAY_Y + 0.035;
  const chZ = RACK.d / 2 - 0.02;
  const cablePts = [
    heroPort.clone(),
    new Vector3(heroPort.x, heroPort.y, PORT_Z + 0.03),
    new Vector3(heroPort.x + 0.01, heroPort.y - 0.016, zc),
    new Vector3(0.235, yM, zc),
    new Vector3(CHANNEL_X - 0.035, yM + 0.012, chZ + 0.02),
    new Vector3(CHANNEL_X + 0.01, yM + 0.08, chZ),
    new Vector3(CHANNEL_X + 0.012, yM + 0.3, chZ - 0.004),
    new Vector3(CHANNEL_X + 0.008, RACK.h - 0.15, chZ - 0.006),
    new Vector3(CHANNEL_X - 0.01, RACK.h + 0.04, chZ - 0.05),
    new Vector3(0.22, RACK.h + 0.2, 0.3),
    new Vector3(0.08, cy - 0.02, 0.05),
    new Vector3(0.04, cy, -0.5),
  ];
  for (let z = -3; z > NET_RACK_Z + 3; z -= 4) cablePts.push(new Vector3(0.04 + Math.sin(z * 0.7) * 0.02, cy, z));
  // down into the network rack's right-hand manager, along the target switch's duct, into the port
  const tMgr = net.units[nIdx('switch1u', 2) + 1];
  const tyM = 0.066 + (tMgr.u - 1) * U + U / 2;
  const nz = NET_RACK_Z;
  cablePts.push(
    new Vector3(0.05, cy, nz + 1.4),
    new Vector3(CHANNEL_X * 0.6, cy - 0.05, nz + 0.7),
    new Vector3(CHANNEL_X - 0.01, RACK.h + 0.05, nz + chZ - 0.05),
    new Vector3(CHANNEL_X + 0.01, RACK.h - 0.2, nz + chZ),
    new Vector3(CHANNEL_X + 0.012, tyM + 0.12, nz + chZ),
    new Vector3(CHANNEL_X - 0.035, tyM + 0.01, nz + chZ + 0.02),
    new Vector3(netPort.x + 0.02, tyM, nz + zc),
    new Vector3(netPort.x, netPort.y + 0.016, nz + PORT_Z + 0.048),
    new Vector3(netPort.x, netPort.y, nz + PORT_Z + 0.03),
    netPort.clone()
  );
  for (const m of plugMeshes([{ pos: heroPort, color: '#7f848a' }])) group.add(m);
  for (const m of plugMeshes([{ pos: netPort.clone().setZ(netPort.z - nz), color: '#7f848a' }])) {
    m.position.z = nz;
    group.add(m);
  }
  const cableCurve = new CatmullRomCurve3(cablePts, false, 'centripetal', 0.5);
  // the cable we follow is an ordinary grey patch cord — the camera, not a glow, singles it out
  const heroCableGeo = tubeWithColor(cablePts, 0.0027, '#7f848a', 1100, 6);
  const allCables = mergedCables([...cordGeos, ...bundle, ...netCords, heroCableGeo]);
  group.add(allCables);

  /* ---------- light fixtures + fake volumetric shafts ---------- */
  const strips = new InstancedMesh(new BoxGeometry(0.1, 0.025, 1.6), mat.lightPanel, 15 * 3);
  let s = 0;
  for (let i = 0; i < 15; i++) {
    for (const x of [-AISLE_X - 0.2, 0, AISLE_X + 0.2]) {
      d.position.set(x, 3.32, -1 - i * 3);
      d.updateMatrix();
      strips.setMatrixAt(s++, d.matrix);
    }
  }
  group.add(strips);
  // physically lit room: no fake light shafts or floating dust
  group.traverse((o) => {
    if (o.isMesh && o.material !== mat.lightPanel) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  floor.castShadow = false;
  ceiling.castShadow = false;
  allCables.castShadow = false; // thousands of thin triangles: receive only
  // background rows are lit by the overhead strips; skipping shadow work there keeps the aisle fast
  rows.traverse((o) => {
    o.castShadow = false;
    o.receiveShadow = false;
  });
  group.traverse((o) => {
    if (o.isPoints || (o.isInstancedMesh && o.geometry.type === 'PlaneGeometry')) o.castShadow = false;
  });

  /* ---------- per-frame ---------- */
  function update() {}

  return {
    group,
    update,
    anchors: { heroPort, netPort, cableCurve },
  };
}
