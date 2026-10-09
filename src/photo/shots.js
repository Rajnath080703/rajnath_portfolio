/**
 * The documentary camera. Each shot is one photographic plate with slow,
 * deliberate camera keys over scroll progress `p`:
 *   { p, x, y, z }  — focus point (normalised photo coords) and zoom (1 = fill frame).
 *
 * Shots overlap; inside an overlap the two plates dissolve while BOTH keep
 * moving, so each transition is carried by a physical object: rack → patch
 * cable → switch port → monitor → screen → map → street.
 */
import { mapProject } from './campusMap.js';

const [mx, my] = mapProject(0, 98); // the "you are here" dot

export const shots = [
  {
    plate: 'server-room',
    keys: [
      { p: 0.0, x: 0.47, y: 0.5, z: 1.0 },
      { p: 0.045, x: 0.44, y: 0.47, z: 1.12 },
      { p: 0.085, x: 0.38, y: 0.42, z: 1.38 },
    ],
  },
  {
    plate: 'rack',
    keys: [
      { p: 0.07, x: 0.46, y: 0.42, z: 1.05 },
      { p: 0.11, x: 0.43, y: 0.27, z: 1.45 },
      { p: 0.155, x: 0.42, y: 0.13, z: 2.3 },
    ],
  },
  {
    // one ordinary patch cable carries the eye out of the rack
    plate: 'patch-panel',
    keys: [
      { p: 0.14, x: 0.43, y: 0.53, z: 2.3 },
      { p: 0.17, x: 0.47, y: 0.52, z: 1.55 },
      { p: 0.2, x: 0.66, y: 0.62, z: 1.6 },
      { p: 0.235, x: 0.87, y: 0.8, z: 2.05 },
    ],
  },
  {
    plate: 'switch',
    keys: [
      { p: 0.22, x: 0.83, y: 0.27, z: 2.0 },
      { p: 0.245, x: 0.6, y: 0.34, z: 1.7 },
      { p: 0.268, x: 0.5, y: 0.47, z: 1.1 },
      { p: 0.288, x: 0.3, y: 0.34, z: 2.6 },
      { p: 0.31, x: 0.275, y: 0.335, z: 4.6 },
    ],
  },
  {
    // out of the port, onto a real monitor: Proxmox VE
    plate: 'office-monitor',
    dip: 0.92,
    keys: [
      { p: 0.293, x: 0.725, y: 0.62, z: 2.6 },
      { p: 0.335, x: 0.7, y: 0.6, z: 1.65 },
      { p: 0.385, x: 0.56, y: 0.52, z: 1.05 },
    ],
  },
  {
    // an engineer at the workstation — the install runs on the left monitor
    plate: 'workstation',
    keys: [
      { p: 0.365, x: 0.5, y: 0.5, z: 1.0 },
      { p: 0.405, x: 0.45, y: 0.47, z: 1.14 },
      { p: 0.44, x: 0.4, y: 0.455, z: 1.6 },
      { p: 0.472, x: 0.375, y: 0.448, z: 5.0 },
      { p: 0.522, x: 0.375, y: 0.448, z: 5.15 },
      { p: 0.55, x: 0.375, y: 0.45, z: 2.6 },
    ],
  },
  {
    plate: 'drives',
    dip: 0.6,
    keys: [
      { p: 0.525, x: 0.32, y: 0.45, z: 1.25 },
      { p: 0.615, x: 0.66, y: 0.42, z: 1.42 },
    ],
  },
  {
    plate: 'lab-room',
    dip: 0.7,
    keys: [
      { p: 0.6, x: 0.5, y: 0.62, z: 1.05 },
      { p: 0.64, x: 0.5, y: 0.5, z: 1.25 },
      { p: 0.675, x: 0.5, y: 0.46, z: 1.45 },
    ],
  },
  {
    plate: 'lab-students',
    keys: [
      { p: 0.658, x: 0.5, y: 0.5, z: 1.05 },
      { p: 0.735, x: 0.56, y: 0.56, z: 1.35 },
    ],
  },
  {
    // one student's monitor fills the frame…
    plate: 'lab-monitor',
    keys: [
      { p: 0.715, x: 0.45, y: 0.48, z: 1.1 },
      { p: 0.75, x: 0.37, y: 0.52, z: 1.6 },
      { p: 0.79, x: 0.332, y: 0.535, z: 4.3 },
    ],
  },
  {
    // …and its WayFinder map becomes the frame
    plate: 'map',
    keys: [
      { p: 0.775, x: 0.5, y: 0.5, z: 1.0 },
      { p: 0.83, x: 0.52, y: 0.52, z: 1.12 },
      { p: 0.875, x: mx, y: my - 0.06, z: 1.9 },
    ],
  },
  {
    // LIVE AR VIEW — walking the campus path, then turning right
    plate: 'campus-path',
    keys: [
      { p: 0.862, x: 0.52, y: 0.6, z: 1.0 },
      { p: 0.905, x: 0.56, y: 0.61, z: 1.5 },
      { p: 0.935, x: 0.74, y: 0.6, z: 1.6 },
    ],
  },
  {
    // the road to the destination, turning left towards the building
    plate: 'campus-road',
    keys: [
      { p: 0.92, x: 0.64, y: 0.58, z: 1.15 },
      { p: 0.948, x: 0.6, y: 0.6, z: 1.5 },
      { p: 0.968, x: 0.3, y: 0.44, z: 1.3 },
      { p: 1.0, x: 0.26, y: 0.4, z: 1.45 },
    ],
  },
];

/** AR guidance cues by progress (the photographs define the turns). */
export function arCue(p) {
  if (p < 0.902) return 'up';
  if (p < 0.932) return 'right';
  if (p < 0.948) return 'up';
  if (p < 0.962) return 'left';
  return 'up';
}
export const AR_IDENTIFIED = 0.962;
export const AR_ARRIVED = 0.978;
