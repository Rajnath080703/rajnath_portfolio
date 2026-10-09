/**
 * Device capability tiers. Mobile keeps the full story but with lighter scenes.
 */
const mq = (q) => typeof window !== 'undefined' && window.matchMedia(q).matches;

export const reducedMotion = mq('(prefers-reduced-motion: reduce)');
export const finePointer = mq('(pointer: fine)');

const narrow = window.innerWidth < 820;
const coarse = mq('(pointer: coarse)');
const lowMem = (navigator.deviceMemory || 8) <= 4;
const fewCores = (navigator.hardwareConcurrency || 8) <= 4;

export const isMobile = narrow || coarse;
const tier = isMobile || (lowMem && fewCores) ? 'low' : 'high';

export const quality = {
  tier,
  maxDpr: tier === 'low' ? 1.25 : 1.75,
  minDpr: 0.6, // adaptive resolution floor
  antialias: tier === 'high',
  dust: false, // floating particles read as CGI — off
  shadows: tier === 'high',
  rowRacks: tier === 'low' ? 34 : 68, // per side
  labRows: tier === 'low' ? 6 : 8,
  labSeats: tier === 'low' ? 5 : 8, // per side of the centre aisle
  trees: tier === 'low' ? 140 : 300,
};
