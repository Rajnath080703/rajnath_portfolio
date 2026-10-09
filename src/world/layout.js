/**
 * World layout — every scene lives in one continuous world, offset along -Z.
 * Camera choreography (core/cameraRig.js) and the scenes both read from here.
 */
import { Vector3 } from 'three';

export const OFFSET = {
  server: new Vector3(0, 0, 0), // hero rack + aisle + network rack
  noc: new Vector3(0, 0, -120), // workstation / NOC room + backup void
  lab: new Vector3(0, 0, -260), // cyber security training hall
  campus: new Vector3(0, 0, -700), // WayFinder campus
};

export const RACK = { w: 0.6, d: 1.07, h: 2.0, base: 0.066 };
export const AISLE_X = 1.5; // row centre lines at ±AISLE_X
export const NET_RACK_Z = -46; // network rack at the end of the aisle
export const TRAY_Y = 2.42;

/* ---------------- Campus (WayFinder) — metres, local to OFFSET.campus ---------------- */

export const campus = {
  size: 320,
  buildings: [
    { name: 'Admin Block', x: -40, z: 55, w: 30, d: 20, h: 14 },
    { name: 'Classrooms', x: -45, z: -2, w: 36, d: 26, h: 20 },
    { name: 'CSE Department', x: 30, z: 60, w: 28, d: 18, h: 15 },
    { name: 'Auditorium', x: 95, z: 30, w: 30, d: 34, h: 12 },
    { name: 'Canteen', x: -10, z: -48, w: 22, d: 16, h: 7 },
    { name: 'Hostel', x: -62, z: -62, w: 40, d: 18, h: 22 },
    { name: 'Cyber Security Lab', x: 98, z: -42, w: 26, d: 30, h: 16 },
    { name: 'Library', x: 45, z: -52, w: 34, d: 22, h: 16, destination: true },
    { name: 'Workshop', x: -82, z: 30, w: 20, d: 30, h: 9 },
    { name: 'ECE Department', x: 18, z: -8, w: 18, d: 14, h: 10 },
  ],
  // Roads / walkways: [x1, z1, x2, z2, width]
  roads: [
    [0, 125, 0, -80, 7],
    [-100, 20, 125, 20, 7],
    [45, 20, 45, -34, 5],
    [-100, -32, 125, -32, 6],
    [-25, 20, -25, 90, 4],
    [70, 20, 70, 80, 4],
  ],
  // The walking route: start at the gate, right turn, left turn, arrive.
  route: [
    [0, 98],
    [0, 20],
    [45, 20],
    [45, -30],
  ],
};
