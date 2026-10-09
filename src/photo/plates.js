/**
 * Photographic plates — real photographs the camera moves across.
 * Coordinates are normalised photo space: x → right, y → down, 0..1.
 *
 * `screen` is the visible display area of a real monitor in the photo
 * (TL, TR, BR, BL). Live UI is mapped onto it with a homography so the
 * interface stays sharp at any zoom.
 *
 * `grade`: [saturation, exposure, contrast, warmth] — a restrained, unified
 * documentary grade (cables and LEDs read as ordinary, not neon).
 *
 * Photos: Unsplash License (free for commercial use). Sources in
 * public/photos/_sources.json — swap any file for your own photography.
 */

export const plates = {
  'server-room': { aspect: 2400 / 1347, grade: [0.3, 1.0, 1.06, -0.2] },
  rack: { aspect: 2400 / 1600, grade: [0.38, 1.0, 1.04, -0.1] },
  'patch-panel': { aspect: 2400 / 1600, grade: [0.42, 0.95, 1.05, 0] },
  switch: { aspect: 2400 / 1253, grade: [0.32, 0.95, 1.05, -0.1] },
  'office-monitor': {
    aspect: 2400 / 1600,
    grade: [0.85, 1.0, 1.02, 0.2],
    screen: { quad: [[0.505, 0.375], [0.98, 0.423], [0.948, 0.886], [0.472, 0.796]], ui: 'proxmox', gain: 0.95 },
  },
  workstation: {
    aspect: 2400 / 1800,
    grade: [0.85, 1.0, 1.04, 0.15],
    screen: { quad: [[0.272, 0.372], [0.477, 0.366], [0.476, 0.521], [0.274, 0.534]], ui: 'workstation', gain: 0.9 },
  },
  drives: { aspect: 2400 / 1590, grade: [0.35, 0.42, 1.08, -0.2] },
  'lab-room': { aspect: 2400 / 1600, grade: [0.85, 1.0, 1.02, 0.05], bake: 'lab-room' },
  'lab-students': { aspect: 2400 / 1350, grade: [0.8, 1.0, 1.04, 0.05] },
  'lab-monitor': {
    aspect: 2400 / 1600,
    grade: [0.85, 1.0, 1.02, 0],
    screen: { quad: [[0.187, 0.265], [0.471, 0.274], [0.477, 0.75], [0.193, 0.852]], ui: 'map', gain: 0.97 },
  },
  map: { aspect: 2400 / 1350, grade: [1.0, 1.0, 1.0, 0], generated: 'map' },
  'campus-path': { aspect: 2400 / 1600, grade: [0.8, 0.98, 1.04, 0.05] },
  'campus-road': { aspect: 2400 / 1600, grade: [0.8, 0.98, 1.04, 0.05] },
};

/** Load order: the opening plates first (needed before the reveal), the rest streams in. */
export const loadOrder = [
  'server-room', 'rack', 'patch-panel', 'switch',
  'office-monitor', 'workstation', 'drives', 'lab-room', 'lab-students', 'lab-monitor',
  'campus-path', 'campus-road',
];
export const criticalCount = 4;

/** Building facade in the campus-road photo (for AR "building identified"). */
export const arTarget = { plate: 'campus-road', box: [0.02, 0.05, 0.42, 0.68] };
