/**
 * SCENES 08–09 — The cyber security training hall.
 * Rows of desks, students at their own environments, instructor display,
 * infrastructure subtly in the corner. Everything repeated is instanced.
 *
 * No real counts are implied: the hall is a visual reconstruction.
 */
import {
  Group,
  Mesh,
  PlaneGeometry,
  BoxGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  InstancedMesh,
  Object3D,
  Matrix4,
  Vector3,
  Color,
  CylinderGeometry,
} from 'three';
import { mat } from '../materials.js';
import { vinylFloor, ceilingGrid } from '../textures/surfaces.js';
import { labScreens, labStatusScreen, campusMapScreen } from '../textures/screens.js';
import { rng } from '../textures/canvas.js';
import { instanceTemplate } from '../instancing.js';
import { seatedPerson, officeChair } from './noc.js';
import { rackRows } from './rack.js';
import { Box3 } from 'three';

const HALL = { w: 24, d: 30, h: 4.2 };
const MON_W = 0.54;
const MON_H = 0.31;

export function buildLab(quality) {
  const group = new Group();
  group.name = 'lab';
  const rand = rng(404);

  /* ---------- shell ---------- */
  const ft = vinylFloor();
  ft.repeat.set(HALL.w / 2.4, HALL.d / 2.4);
  const floor = new Mesh(new PlaneGeometry(HALL.w, HALL.d), new MeshStandardMaterial({ map: ft, color: 0x8a8c90, roughness: 0.38, metalness: 0.15 }));
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);
  const ct = ceilingGrid();
  ct.repeat.set(HALL.w / 1.2, HALL.d / 1.2);
  const ceil = new Mesh(new PlaneGeometry(HALL.w, HALL.d), new MeshStandardMaterial({ map: ct, color: 0x3a3b3e, roughness: 0.95 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = HALL.h;
  group.add(ceil);
  const wallM = new MeshStandardMaterial({ color: 0x2a2b2e, roughness: 0.9 });
  const front = new Mesh(new PlaneGeometry(HALL.w, HALL.h), wallM);
  front.position.set(0, HALL.h / 2, -HALL.d / 2);
  const back = front.clone();
  back.rotation.y = Math.PI;
  back.position.z = HALL.d / 2;
  group.add(front, back);
  for (const sx of [-1, 1]) {
    const w = new Mesh(new PlaneGeometry(HALL.d, HALL.h), wallM);
    w.rotation.y = -sx * Math.PI / 2;
    w.position.set(sx * HALL.w / 2, HALL.h / 2, 0);
    group.add(w);
  }
  // dusk windows on the left wall (blinds)
  const winMat = new MeshBasicMaterial({ color: new Color(0.16, 0.2, 0.27) });
  const blinds = new InstancedMesh(new PlaneGeometry(2.2, 1.9), winMat, 5);
  const d = new Object3D();
  for (let i = 0; i < 5; i++) {
    d.position.set(-HALL.w / 2 + 0.02, 2.2, -10 + i * 5);
    d.rotation.set(0, Math.PI / 2, 0);
    d.updateMatrix();
    blinds.setMatrixAt(i, d.matrix);
  }
  group.add(blinds);

  // ceiling light panels
  const lpCols = 9;
  const lpRows = 11;
  const panels = new InstancedMesh(new PlaneGeometry(1.2, 0.6), mat.lightPanel, lpCols * lpRows);
  let k = 0;
  for (let i = 0; i < lpCols; i++) {
    for (let j = 0; j < lpRows; j++) {
      d.position.set(-9.6 + i * 2.4, HALL.h - 0.01, -13 + j * 2.6);
      d.rotation.set(Math.PI / 2, 0, 0);
      d.updateMatrix();
      panels.setMatrixAt(k++, d.matrix);
    }
  }
  group.add(panels);

  /* ---------- seating grid ---------- */
  const rows = quality.labRows;
  const perSide = quality.labSeats;
  const rowZ = (r) => -9 + r * 2.4;
  const seatX = (side, i) => side * (1.6 + i * 1.1);
  const TARGET = { row: 3, side: -1, i: 1 };

  const deskMs = [];
  const monMs = [];
  const kbMs = [];
  const chairMs = [];
  const personMs = [];
  const screenBuckets = labScreens().map((tex) => ({ tex, ms: [] }));
  const M = (x, y, z, ry = 0) => new Matrix4().makeRotationY(ry).setPosition(x, y, z);

  for (let r = 0; r < rows; r++) {
    const z = rowZ(r);
    for (const side of [-1, 1]) {
      const x0 = side * 1.05;
      const x1 = side * (1.05 + perSide * 1.1);
      deskMs.push(new Matrix4().makeScale(Math.abs(x1 - x0), 1, 1).setPosition((x0 + x1) / 2, 0, z));
      for (let i = 0; i < perSide; i++) {
        const x = seatX(side, i);
        const isTarget = r === TARGET.row && side === TARGET.side && i === TARGET.i;
        monMs.push(M(x, 0, z - 0.2));
        kbMs.push(M(x + (rand() - 0.5) * 0.04, 0, z + 0.06));
        chairMs.push(M(x + (rand() - 0.5) * 0.05, 0, z + 0.62, (rand() - 0.5) * 0.25));
        if (isTarget || rand() > 0.14) personMs.push(M(x + (rand() - 0.5) * 0.04, 0, z + 0.66, (rand() - 0.5) * 0.12));
        if (!isTarget) screenBuckets[Math.floor(rand() * screenBuckets.length)].ms.push(M(x, 1.05, z - 0.2 + 0.0131));
      }
    }
  }

  // desk template: unit-width top + modesty panel (scaled along x per row)
  const deskT = new Group();
  const top = new Mesh(new BoxGeometry(1, 0.035, 0.72), mat.deskLight);
  top.position.set(0, 0.74, 0);
  const panel = new Mesh(new BoxGeometry(1, 0.55, 0.02), mat.plastic);
  panel.position.set(0, 0.45, -0.34);
  deskT.add(top, panel);
  group.add(instanceTemplate(deskT, deskMs));

  const monT = new Group();
  const bez = new Mesh(new BoxGeometry(MON_W + 0.02, MON_H + 0.02, 0.025), mat.plastic);
  bez.position.y = 1.05;
  const neck = new Mesh(new BoxGeometry(0.035, 0.2, 0.03), mat.plastic);
  neck.position.set(0, 0.82, -0.04);
  const foot = new Mesh(new BoxGeometry(0.2, 0.012, 0.15), mat.plastic);
  foot.position.set(0, 0.763, -0.03);
  monT.add(bez, neck, foot);
  group.add(instanceTemplate(monT, monMs));

  const kbT = new Group();
  const kb = new Mesh(new BoxGeometry(0.42, 0.016, 0.13), mat.plastic);
  kb.position.y = 0.766;
  kbT.add(kb);
  group.add(instanceTemplate(kbT, kbMs));

  group.add(instanceTemplate(officeChair(), chairMs));

  // students — per-instance clothing / skin tones (muted palette)
  const cloth = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
  const skin = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.75 });
  const studentT = seatedPerson();
  studentT.traverse((o) => {
    if (!o.isMesh) return;
    if (o.material === mat.skin) o.material = skin;
    else if (o.material !== mat.hair) o.material = cloth;
  });
  // everyday clothing: checks, plain tees, college polos, a few lighter shirts
  const shirts = ['#2b2e34', '#3b4452', '#6b6e73', '#22252b', '#8a8f96', '#394049', '#a39e94', '#2f3a48', '#5a5048', '#7d8a94', '#c9c6be', '#4a3f3a'];
  const skins = ['#6b4c3a', '#5a3f30', '#7a5843', '#4e3628', '#83614b', '#8d6a52'];
  group.add(
    instanceTemplate(studentT, personMs, (m, i) => {
      if (m === cloth) return new Color(shirts[(i * 7 + 3) % shirts.length]).convertSRGBToLinear();
      if (m === skin) return new Color(skins[(i * 5 + 1) % skins.length]).convertSRGBToLinear();
      return null;
    })
  );

  // student screens — one instanced plane per desktop texture
  const scrGeo = new PlaneGeometry(MON_W, MON_H);
  for (const b of screenBuckets) {
    if (!b.ms.length) continue;
    const im = new InstancedMesh(scrGeo, new MeshBasicMaterial({ map: b.tex, color: new Color(0.8, 0.8, 0.8) }), b.ms.length);
    b.ms.forEach((m, i) => im.setMatrixAt(i, m));
    im.instanceMatrix.needsUpdate = true;
    group.add(im);
  }

  // THE screen: the one that opens WayFinder
  const target = new Vector3(seatX(TARGET.side, TARGET.i), 1.05, rowZ(TARGET.row) - 0.2 + 0.0132);
  const mapScreen = new Mesh(scrGeo, new MeshBasicMaterial({ map: campusMapScreen() }));
  mapScreen.position.copy(target);
  group.add(mapScreen);

  /* ---------- instructor area ---------- */
  const iDesk = new Mesh(new BoxGeometry(2.6, 0.78, 0.8), mat.desk);
  iDesk.position.set(0, 0.39, -12.4);
  group.add(iDesk);
  const iMon = new Mesh(new BoxGeometry(0.6, 0.36, 0.03), mat.plastic);
  iMon.position.set(0.5, 1.02, -12.55);
  iMon.rotation.y = Math.PI;
  group.add(iMon);
  const big = new Group();
  const bigBezel = new Mesh(new BoxGeometry(5.4, 3.06, 0.08), mat.plastic);
  const bigScreen = new Mesh(new PlaneGeometry(5.28, 2.97), new MeshBasicMaterial({ map: labStatusScreen(), color: new Color(0.9, 0.9, 0.9) }));
  bigScreen.position.z = 0.041;
  big.add(bigBezel, bigScreen);
  big.position.set(0, 2.35, -HALL.d / 2 + 0.06);
  group.add(big);
  const boardM = new MeshStandardMaterial({ color: 0xb9bcc0, roughness: 0.35 });
  for (const sx of [-1, 1]) {
    const board = new Mesh(new BoxGeometry(3.4, 1.3, 0.03), boardM);
    board.position.set(sx * 5.4, 2.0, -HALL.d / 2 + 0.03);
    group.add(board);
  }
  // infrastructure, subtly: two racks in the front-right corner
  group.add(rackRows([{ x: 11.1, z: -13.4, rotY: -Math.PI / 2 }, { x: 11.1, z: -12.78, rotY: -Math.PI / 2 }], 2, 700));

  group.traverse((o) => {
    if (o.isMesh && !(o.material && o.material.isMeshBasicMaterial)) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  return {
    group,
    anchors: {
      target, // world-local position of the WayFinder screen
      targetSeat: new Vector3(seatX(TARGET.side, TARGET.i), 0, rowZ(TARGET.row)),
      bigScreen: new Vector3(0, 2.35, -HALL.d / 2 + 0.1),
      monSize: [MON_W, MON_H],
    },
  };
}
