/**
 * SCENES 04–07 — NOC room: Proxmox wall display, engineer at a workstation
 * (installer progress tied to scroll), monitoring, then the backup / DR flow.
 */
import {
  Group,
  Mesh,
  PlaneGeometry,
  BoxGeometry,
  CapsuleGeometry,
  SphereGeometry,
  CylinderGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  EdgesGeometry,
  LineSegments,
  LineBasicMaterial,
  Line,
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  QuadraticBezierCurve3,
  Vector3,
  AdditiveBlending,
  Color,
  InstancedMesh,
  Object3D,
  LatheGeometry,
  TorusGeometry,
  Vector2,
} from 'three';
import { mat } from '../materials.js';
import { vinylFloor, glowSprite } from '../textures/surfaces.js';
import { proxmoxDashboard, installerScreen, monitoringScreen, labScreens } from '../textures/screens.js';
import { rng } from '../textures/canvas.js';
import { rackRows } from './rack.js';

function screenMat(map, brightness = 1) {
  return new MeshBasicMaterial({ map, color: new Color(brightness, brightness, brightness) });
}

function monitor(w, h, map, brightness = 1) {
  const g = new Group();
  const bezel = new Mesh(new BoxGeometry(w + 0.02, h + 0.02, 0.025), mat.plastic);
  const scr = new Mesh(new PlaneGeometry(w, h), screenMat(map, brightness));
  scr.position.z = 0.0131;
  const neck = new Mesh(new BoxGeometry(0.04, 0.2, 0.03), mat.plastic);
  neck.position.set(0, -h / 2 - 0.08, -0.04);
  const foot = new Mesh(new BoxGeometry(0.24, 0.012, 0.18), mat.plastic);
  foot.position.set(0, -h / 2 - 0.18, -0.02);
  g.add(bezel, scr, neck, foot);
  g.userData.screen = scr;
  return g;
}

/* ------------------------------------------------------------------ people */

const _up = new Vector3(0, 1, 0);
function limb(a, b, r, material) {
  const dir = new Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new Mesh(new CapsuleGeometry(r, Math.max(0.001, len - r * 2), 3, 8), material);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(_up, dir.normalize());
  return m;
}

/** Hair with volume: a skull cap whose vertices are pushed out irregularly. */
function hairCap(seed = 1) {
  const g = new SphereGeometry(0.1, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.6);
  const pos = g.attributes.position;
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = Math.sin(v.x * 90 + seed) * Math.cos(v.z * 80 - seed) * 0.5 + Math.sin(v.y * 120 + v.x * 40) * 0.5;
    v.multiplyScalar(1.04 + n * 0.035 + Math.max(0, v.y) * 0.35);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * A person seated at a desk, seen mostly from behind: lathed torso with
 * natural shoulders, collar, neck, head with ears, textured hair, arms bent
 * to the keyboard. Facing -Z.
 */
export function seatedPerson(shirt = 0x2a2c31) {
  const g = new Group();
  const cloth = new MeshStandardMaterial({ color: shirt, roughness: 0.92 });
  // torso: lathe profile (radius, height) — hips → waist → chest → shoulders
  const prof = [[0.0, 0.7], [0.14, 0.71], [0.16, 0.78], [0.15, 0.9], [0.155, 1.02], [0.175, 1.14], [0.19, 1.22], [0.185, 1.27], [0.15, 1.31], [0.08, 1.345], [0.0, 1.355]].map(([r, y]) => new Vector2(r, y));
  const torso = new Mesh(new LatheGeometry(prof, 16), cloth);
  torso.scale.set(1.28, 1, 0.72);
  torso.rotation.x = -0.1; // leaning in towards the screen
  torso.position.set(0, 0.06, 0.05);
  const collar = new Mesh(new TorusGeometry(0.058, 0.014, 5, 14), cloth);
  collar.rotation.x = Math.PI / 2 - 0.25;
  collar.position.set(0, 1.375, -0.05);
  const neck = new Mesh(new CylinderGeometry(0.043, 0.048, 0.11, 10), mat.skin);
  neck.position.set(0, 1.42, -0.06);
  neck.rotation.x = -0.2;
  const head = new Mesh(new SphereGeometry(0.1, 18, 12), mat.skin);
  head.scale.set(0.86, 1.08, 1.0);
  head.position.set(0, 1.545, -0.09);
  head.rotation.x = 0.18; // looking slightly down at the monitor
  const hair = new Mesh(hairCap(shirt % 7), mat.hair);
  hair.scale.set(0.9, 1.06, 1.04);
  hair.position.set(0, 1.55, -0.08);
  hair.rotation.x = 0.55;
  g.add(torso, collar, neck, head, hair);
  for (const sx of [-1, 1]) {
    const ear = new Mesh(new SphereGeometry(0.022, 6, 5), mat.skin);
    ear.scale.set(0.45, 1, 0.75);
    ear.position.set(sx * 0.086, 1.54, -0.08);
    const shoulder = new Vector3(sx * 0.215, 1.285, 0.0);
    const elbow = new Vector3(sx * 0.25, 1.04, -0.13);
    const wrist = new Vector3(sx * 0.14, 0.97, -0.42);
    const upper = limb(shoulder, elbow, 0.055, cloth);
    const fore = limb(elbow, wrist, 0.045, cloth);
    const hand = new Mesh(new SphereGeometry(0.04, 8, 6), mat.skin);
    hand.scale.set(0.8, 0.45, 1.25);
    hand.position.set(sx * 0.13, 0.955, -0.47);
    g.add(ear, upper, fore, hand);
  }
  return g;
}

/** Ordinary office / lab chair: mesh back, seat cushion, gas lift, five-star base. */
export function officeChair() {
  const g = new Group();
  const seat = new Mesh(new BoxGeometry(0.48, 0.07, 0.46), mat.fabric);
  seat.position.set(0, 0.49, 0);
  const back = new Mesh(new BoxGeometry(0.44, 0.56, 0.035), mat.fabric);
  back.position.set(0, 0.9, 0.25);
  back.rotation.x = 0.1;
  const frame = new Mesh(new BoxGeometry(0.46, 0.04, 0.05), mat.plastic);
  frame.position.set(0, 1.17, 0.27);
  const spine = new Mesh(new BoxGeometry(0.05, 0.4, 0.03), mat.plastic);
  spine.position.set(0, 0.62, 0.25);
  const post = new Mesh(new CylinderGeometry(0.022, 0.026, 0.38, 6), mat.steel);
  post.position.set(0, 0.27, 0);
  g.add(seat, back, frame, spine, post);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3;
    const leg = new Mesh(new BoxGeometry(0.03, 0.025, 0.3), mat.plastic);
    leg.position.set(Math.sin(a) * 0.15, 0.07, Math.cos(a) * 0.15);
    leg.rotation.y = a;
    const wheel = new Mesh(new CylinderGeometry(0.025, 0.025, 0.02, 6), mat.black);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(Math.sin(a) * 0.29, 0.03, Math.cos(a) * 0.29);
    g.add(leg, wheel);
  }
  for (const sx of [-1, 1]) {
    const arm = new Mesh(new BoxGeometry(0.05, 0.03, 0.26), mat.plastic);
    arm.position.set(sx * 0.27, 0.7, 0.04);
    const armPost = new Mesh(new BoxGeometry(0.025, 0.2, 0.025), mat.plastic);
    armPost.position.set(sx * 0.27, 0.59, 0.08);
    g.add(arm, armPost);
  }
  return g;
}

export function buildNoc(quality) {
  const room = new Group();
  room.name = 'noc';
  const rand = rng(91);

  /* ---------- shell ---------- */
  const floorTex = vinylFloor();
  floorTex.repeat.set(5, 5);
  const floor = new Mesh(new PlaneGeometry(12, 12), new MeshStandardMaterial({ map: floorTex, color: 0x6b6d72, roughness: 0.55, metalness: 0.1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -1;
  room.add(floor);
  const wallM = new MeshStandardMaterial({ color: 0x17181b, roughness: 0.9 });
  const backWall = new Mesh(new PlaneGeometry(12, 3.4), wallM);
  backWall.position.set(0, 1.7, -4.7);
  room.add(backWall);
  for (const sx of [-1, 1]) {
    const w = new Mesh(new PlaneGeometry(12, 3.4), wallM);
    w.rotation.y = -sx * Math.PI / 2;
    w.position.set(sx * 5.5, 1.7, -1);
    room.add(w);
  }
  const ceil = new Mesh(new PlaneGeometry(12, 12), wallM);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, 3.2, -1);
  room.add(ceil);
  // acoustic wall slats behind the display
  const slats = new InstancedMesh(new BoxGeometry(0.05, 3.2, 0.04), mat.desk, 60);
  const dd = new Object3D();
  for (let i = 0; i < 60; i++) {
    dd.position.set(-4.5 + i * 0.15, 1.6, -4.66);
    dd.updateMatrix();
    slats.setMatrixAt(i, dd.matrix);
  }
  room.add(slats);

  /* ---------- wall display: Proxmox VE ---------- */
  const wallTex = proxmoxDashboard();
  const wallDisplay = new Group();
  const wdBezel = new Mesh(new BoxGeometry(3.28, 1.88, 0.06), mat.plastic);
  const wdScreen = new Mesh(new PlaneGeometry(3.2, 1.8), screenMat(wallTex, 0.82));
  wdScreen.position.z = 0.031;
  wallDisplay.add(wdBezel, wdScreen);
  wallDisplay.position.set(0, 1.95, -4.55);
  room.add(wallDisplay);

  /* ---------- workstation ---------- */
  const desk = new Group();
  const top = new Mesh(new BoxGeometry(1.9, 0.04, 0.8), mat.desk);
  top.position.set(0, 0.74, 0);
  desk.add(top);
  for (const sx of [-1, 1]) {
    const leg = new Mesh(new BoxGeometry(0.05, 0.72, 0.7), mat.plastic);
    leg.position.set(sx * 0.88, 0.36, 0);
    desk.add(leg);
  }
  desk.position.set(0, 0, -1.6);
  room.add(desk);

  const installer = installerScreen();
  const monitoring = monitoringScreen();
  const mainMon = monitor(0.62, 0.35, installer.texture, 0.88);
  mainMon.position.set(0, 1.03, -1.86);
  room.add(mainMon);
  const lab = labScreens();
  const sideL = monitor(0.54, 0.31, lab[0], 0.8);
  sideL.position.set(-0.64, 1.0, -1.78);
  sideL.rotation.y = 0.42;
  const sideR = monitor(0.54, 0.31, lab[3], 0.8);
  sideR.position.set(0.64, 1.0, -1.78);
  sideR.rotation.y = -0.42;
  room.add(sideL, sideR);
  const kb = new Mesh(new BoxGeometry(0.44, 0.018, 0.14), mat.plastic);
  kb.position.set(0, 0.769, -1.48);
  const mouse = new Mesh(new BoxGeometry(0.06, 0.02, 0.1), mat.plastic);
  mouse.position.set(0.32, 0.77, -1.46);
  room.add(kb, mouse);
  // the ordinary clutter of a working desk
  const mugMat = new MeshStandardMaterial({ color: 0xd9d6cf, roughness: 0.35 });
  const mug = new Mesh(new CylinderGeometry(0.042, 0.038, 0.1, 20), mugMat);
  mug.position.set(-0.55, 0.81, -1.38);
  const handle = new Mesh(new TorusGeometry(0.025, 0.007, 8, 16, Math.PI), mugMat);
  handle.position.set(-0.505, 0.815, -1.38);
  handle.rotation.z = -Math.PI / 2;
  const pad = new Mesh(new BoxGeometry(0.21, 0.012, 0.29), new MeshStandardMaterial({ color: 0x2a2b2d, roughness: 0.8 }));
  pad.position.set(0.62, 0.767, -1.42);
  pad.rotation.y = -0.18;
  const pen = new Mesh(new CylinderGeometry(0.004, 0.004, 0.14, 8), mat.plastic);
  pen.rotation.z = Math.PI / 2;
  pen.rotation.y = 0.4;
  pen.position.set(0.62, 0.778, -1.35);
  const phone = new Mesh(new BoxGeometry(0.075, 0.009, 0.155), mat.black);
  phone.position.set(-0.32, 0.765, -1.32);
  phone.rotation.y = 0.25;
  const tower = new Mesh(new BoxGeometry(0.2, 0.45, 0.46), mat.chassis);
  tower.position.set(0.72, 0.225, -1.6);
  room.add(mug, handle, pad, pen, phone, tower);

  const chair = officeChair();
  chair.position.set(0, 0, -0.98);
  room.add(chair);
  const person = seatedPerson(0x26282d);
  person.position.set(0, 0, -0.92);
  room.add(person);

  // small homelab rack in the corner
  const mini = rackRows([{ x: 3.6, z: -3.9, rotY: -0.25 }, { x: 4.25, z: -3.75, rotY: -0.25 }], 2, 900);
  room.add(mini);

  // ceiling downlights
  const dl = new Mesh(new CylinderGeometry(0.09, 0.09, 0.02, 20), mat.lightPanel);
  for (const [x, z] of [[-2.5, -2.5], [2.5, -2.5], [0, -0.5], [-2.5, 1.5], [2.5, 1.5]]) {
    const m = dl.clone();
    m.position.set(x, 3.19, z);
    room.add(m);
  }

  room.traverse((o) => {
    if (o.isMesh && !(o.material && o.material.isMeshBasicMaterial)) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  /* ---------- backup / DR flow (void) ---------- */
  const flow = new Group();
  flow.name = 'backupFlow';
  const lineMat = new LineBasicMaterial({ color: 0xe6e9ee, transparent: true, opacity: 0.75 });
  const dimMat = new LineBasicMaterial({ color: 0x9aa3ad, transparent: true, opacity: 0.35 });
  const fillMat = new MeshBasicMaterial({ color: 0x0d0e10, transparent: true, opacity: 0.85 });
  const restoreMat = new MeshBasicMaterial({ color: 0x9cc3e6, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false });

  function wireBox(w, h, d, slots = 0, fill = fillMat) {
    const g = new Group();
    const geo = new BoxGeometry(w, h, d);
    g.add(new Mesh(geo, fill));
    g.add(new LineSegments(new EdgesGeometry(geo), lineMat));
    if (slots) {
      const pts = [];
      for (let i = 1; i < slots; i++) {
        const x = -w / 2 + (i / slots) * w;
        pts.push(x, -h / 2 + 0.02, d / 2 + 0.001, x, h / 2 - 0.02, d / 2 + 0.001);
      }
      const lg = new BufferGeometry();
      lg.setAttribute('position', new Float32BufferAttribute(pts, 3));
      g.add(new LineSegments(lg, dimMat));
    }
    return g;
  }

  const nodes = {
    server: new Vector3(0, 1.15, -2.2),
    backup: new Vector3(-2.6, 1.15, -2.2),
    cloud: new Vector3(-5.2, 1.75, -2.4),
    recovery: new Vector3(-7.8, 1.15, -2.2),
  };
  const serverNode = new Group();
  for (let i = 0; i < 3; i++) {
    const b = wireBox(0.9, 0.16, 0.6, 8);
    b.position.y = i * 0.2 - 0.2;
    serverNode.add(b);
  }
  serverNode.position.copy(nodes.server);
  const backupNode = wireBox(0.7, 0.42, 0.6, 6);
  backupNode.position.copy(nodes.backup);
  const recoveryNode = new Group();
  for (let i = 0; i < 3; i++) {
    const b = wireBox(0.9, 0.16, 0.6, 8);
    b.position.y = i * 0.2 - 0.2;
    const glow = new Mesh(new BoxGeometry(0.9, 0.16, 0.6), restoreMat);
    glow.position.y = b.position.y;
    recoveryNode.add(b, glow);
  }
  recoveryNode.position.copy(nodes.recovery);
  // cloud — point shell over a union of spheres
  const cloudPts = [];
  const blobs = [[0, 0, 0, 0.55], [-0.55, -0.12, 0, 0.42], [0.55, -0.14, 0, 0.4], [0.2, 0.25, 0, 0.38], [-0.25, 0.2, 0.05, 0.36]];
  for (let i = 0; i < 2600; i++) {
    const b = blobs[Math.floor(rand() * blobs.length)];
    const u = rand() * 2 - 1;
    const t = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const p = new Vector3(s * Math.cos(t), u, s * Math.sin(t)).multiplyScalar(b[3]).add(new Vector3(b[0], b[1], b[2]));
    const inside = blobs.some((o) => o !== b && p.distanceTo(new Vector3(o[0], o[1], o[2])) < o[3] * 0.97);
    if (!inside) cloudPts.push(p.x, p.y * 0.85, p.z * 0.6);
  }
  const cg = new BufferGeometry();
  cg.setAttribute('position', new Float32BufferAttribute(cloudPts, 3));
  const sprite = glowSprite();
  const cloudNode = new Points(cg, new PointsMaterial({ size: 0.022, map: sprite, color: 0xdfe4ea, transparent: true, opacity: 0.85, depthWrite: false, blending: AdditiveBlending }));
  cloudNode.position.copy(nodes.cloud);
  flow.add(serverNode, backupNode, cloudNode, recoveryNode);

  // links + pulses
  const links = [
    new QuadraticBezierCurve3(nodes.server.clone().add(new Vector3(-0.5, 0, 0)), new Vector3(-1.3, 1.5, -2.2), nodes.backup.clone().add(new Vector3(0.4, 0, 0))),
    new QuadraticBezierCurve3(nodes.backup.clone().add(new Vector3(-0.4, 0, 0)), new Vector3(-3.9, 2.0, -2.3), nodes.cloud.clone().add(new Vector3(0.75, 0, 0))),
    new QuadraticBezierCurve3(nodes.cloud.clone().add(new Vector3(-0.75, 0, 0)), new Vector3(-6.5, 2.0, -2.3), nodes.recovery.clone().add(new Vector3(0.5, 0, 0))),
  ];
  for (const c of links) {
    const lg = new BufferGeometry().setFromPoints(c.getPoints(60));
    flow.add(new Line(lg, dimMat));
  }
  const PULSES = 7;
  const pulseGeo = new BufferGeometry();
  const pulsePos = new Float32Array(links.length * PULSES * 3);
  pulseGeo.setAttribute('position', new Float32BufferAttribute(pulsePos, 3));
  const pulses = new Points(pulseGeo, new PointsMaterial({ size: 0.09, map: sprite, color: 0x9cc3e6, transparent: true, depthWrite: false, blending: AdditiveBlending }));
  pulses.frustumCulled = false;
  flow.add(pulses);
  // floor reference grid for the void
  const gridPts = [];
  for (let i = -12; i <= 4; i++) gridPts.push(i * 0.8, 0, -6, i * 0.8, 0, 3);
  for (let j = -6; j <= 3; j++) gridPts.push(-9.6, 0, j, 3.2, 0, j);
  const gg = new BufferGeometry();
  gg.setAttribute('position', new Float32BufferAttribute(gridPts, 3));
  flow.add(new LineSegments(gg, new LineBasicMaterial({ color: 0x5b6169, transparent: true, opacity: 0.12 })));

  const tmp = new Vector3();
  let monitorTimer = 0;
  let installTimer = 1;
  let mode = 'installer';

  function update(p, dt) {
    // screen state machine on the desk monitor
    const installP = (p - 0.385) / (0.455 - 0.385);
    if (p < 0.462) {
      if (mode !== 'installer') {
        mode = 'installer';
        mainMon.userData.screen.material.map = installer.texture;
      }
      // throttle redraws to ~12/s while scrubbing; always land exactly on 0 and 100
      const pct = Math.min(1, Math.max(0, installP)) * 100;
      installTimer += dt;
      if (installTimer > 0.08 || pct <= 0 || pct >= 100) {
        installTimer = 0;
        installer.set(pct);
      }
    } else {
      if (mode !== 'monitoring') {
        mode = 'monitoring';
        mainMon.userData.screen.material.map = monitoring.texture;
      }
      monitorTimer += dt;
      if (monitorTimer > 0.6 && p < 0.56) {
        monitorTimer = 0;
        monitoring.update();
      }
    }
    // backup pulses + restore glow
    if (p > 0.52 && p < 0.63) {
      const t = performance.now() * 0.00025;
      let k = 0;
      links.forEach((c, li) => {
        for (let i = 0; i < PULSES; i++) {
          c.getPoint((t + i / PULSES + li * 0.13) % 1, tmp);
          pulsePos[k++] = tmp.x;
          pulsePos[k++] = tmp.y;
          pulsePos[k++] = tmp.z;
        }
      });
      pulseGeo.attributes.position.needsUpdate = true;
      restoreMat.opacity = Math.min(0.22, Math.max(0, (p - 0.575) / 0.025) * 0.22);
    }
  }

  return {
    room,
    flow,
    update,
    installer,
    anchors: {
      wallDisplay: new Vector3(0, 1.95, -4.52),
      monitor: new Vector3(0, 1.03, -1.845),
      person: new Vector3(0, 1.4, -0.92),
      nodes,
    },
  };
}
