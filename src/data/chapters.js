/**
 * The cinematic timeline. `p` is the normalised scroll progress (0 → 1) through
 * the #cinema track. Chapters drive the HUD, captions and reduced-motion holds.
 */

// Length of the cinematic scroll track in viewport heights.
export const CINEMA_VH = 3000;
export const CINEMA_VH_MOBILE = 1600;

export const chapters = [
  { id: 'hero', num: '01', label: 'Origin', start: 0.0, end: 0.07, hold: 0.02 },
  { id: 'rack', num: '02', label: 'Server Infrastructure', start: 0.07, end: 0.14, hold: 0.11 },
  { id: 'cable', num: '02', label: 'Physical Layer', start: 0.14, end: 0.23, hold: 0.19 },
  { id: 'network', num: '03', label: 'Network', start: 0.23, end: 0.3, hold: 0.265 },
  { id: 'proxmox', num: '04', label: 'Virtualization', start: 0.3, end: 0.37, hold: 0.34 },
  { id: 'install', num: '05', label: 'Human + Infrastructure', start: 0.37, end: 0.46, hold: 0.45 },
  { id: 'monitor', num: '06', label: 'Monitoring', start: 0.46, end: 0.53, hold: 0.5 },
  { id: 'backup', num: '07', label: 'Backup & Recovery', start: 0.53, end: 0.61, hold: 0.58 },
  { id: 'lab', num: '08', label: 'Cyber Security Lab', start: 0.61, end: 0.71, hold: 0.665 },
  { id: 'labmove', num: '09', label: 'Into the Screen', start: 0.71, end: 0.77, hold: 0.75 },
  { id: 'wayfinder', num: '10', label: 'WayFinder', start: 0.77, end: 0.87, hold: 0.82 },
  { id: 'ar', num: '11', label: 'Live AR View', start: 0.87, end: 1.0, hold: 0.95 },
];

/** Hard cuts hidden behind a dip to black: [centre, half-width]. */
export const blackouts = [
  [0.3, 0.008], // dive into the switch port → NOC wall display
  [0.61, 0.01], // backup void → lab doors
  [0.77, 0.006], // student monitor → campus map
];

/**
 * Captions. `in`/`out` are scroll progress values; `pos` is a layout modifier.
 * HTML is trusted, static, authored here.
 */
export const captions = [
  {
    in: -1,
    out: 0.05,
    pos: 'hero',
    html: `
      <p class="cap__kicker mono">System Engineer — Portfolio</p>
      <h1 class="cap__name"><span>Rajnath</span> <span>Tamizh Selvan</span></h1>
      <p class="cap__role">System Engineer</p>
      <p class="cap__focus mono">Linux <i>•</i> Virtualization <i>•</i> IT Infrastructure</p>
      <p class="cap__lede">Infrastructure is not just hardware.<br/>It is the system that keeps everything connected.</p>`,
  },
  {
    in: 0.08,
    out: 0.135,
    pos: 'left',
    html: `
      <p class="cap__kicker mono">02 — Server Infrastructure</p>
      <h2 class="cap__title">The rack</h2>
      <ul class="cap__list mono"><li>Rack servers</li><li>Patch panels</li><li>Power distribution</li><li>Storage</li><li>Network equipment</li></ul>`,
  },
  {
    in: 0.155,
    out: 0.215,
    pos: 'right',
    html: `
      <p class="cap__kicker mono">02.1 — Physical Layer</p>
      <p class="cap__statement">Every service begins with one connection.</p>`,
  },
  {
    in: 0.24,
    out: 0.29,
    pos: 'left',
    html: `
      <p class="cap__kicker mono">03 — Network</p>
      <h2 class="cap__title">Network</h2>
      <ul class="cap__list mono cap__list--grid"><li>TCP/IP</li><li>DNS</li><li>DHCP</li><li>VLAN</li><li>Routing</li><li>Network Diagnostics</li></ul>`,
  },
  {
    in: 0.312,
    out: 0.365,
    pos: 'left',
    html: `
      <p class="cap__kicker mono">04 — Virtualization</p>
      <h2 class="cap__title">Proxmox VE</h2>
      <ul class="cap__list mono"><li>Ubuntu</li><li>Windows Server</li><li>Linux</li></ul>
      <p class="cap__status mono"><i></i>Running</p>`,
  },
  {
    in: 0.38,
    out: 0.455,
    pos: 'right',
    html: `
      <p class="cap__kicker mono">05 — Human + Infrastructure</p>
      <h2 class="cap__title cap__title--sm">Installing Proxmox</h2>
      <div class="cap__progress"><span data-install-bar></span></div>
      <p class="cap__pct mono"><span data-install-pct>0</span>%</p>
      <p class="cap__note mono">Cinematic visualisation</p>`,
  },
  {
    in: 0.47,
    out: 0.525,
    pos: 'left',
    html: `
      <p class="cap__kicker mono">06 — Monitoring</p>
      <h2 class="cap__title">Monitoring</h2>
      <ul class="cap__list mono"><li>Grafana</li><li>Monitoring Scripts</li><li>System Health</li><li>Performance Monitoring</li></ul>
      <p class="cap__note mono">Dashboard values are demo data</p>`,
  },
  {
    in: 0.545,
    out: 0.6,
    pos: 'top',
    html: `
      <p class="cap__kicker mono">07 — Backup &amp; Disaster Recovery</p>
      <h2 class="cap__title cap__title--sm">Wasabi Cloud Storage</h2>
      <ul class="cap__list mono cap__list--inline"><li>Backup</li><li>Cloud Storage</li><li>Disaster Recovery</li></ul>`,
  },
  {
    in: 0.625,
    out: 0.7,
    pos: 'left',
    html: `
      <p class="cap__kicker mono">08 — Project · Rathinam College, Coimbatore</p>
      <h2 class="cap__title">Cyber Security Lab</h2>
      <ul class="cap__list mono"><li>Training Environment</li><li>Virtualization</li><li>Windows &amp; Linux</li><li>Security Testing</li><li>System Administration</li></ul>`,
  },
  {
    in: 0.715,
    out: 0.755,
    pos: 'right',
    html: `
      <p class="cap__kicker mono">09 — Every desk, its own environment</p>
      <p class="cap__statement">One screen opens the next project.</p>`,
  },
  {
    in: 0.785,
    out: 0.86,
    pos: 'left',
    html: `
      <p class="cap__kicker mono">10 — Project</p>
      <h2 class="cap__title">WayFinder</h2>
      <p class="cap__sub">Smart Campus Navigation System</p>`,
  },
  {
    in: 0.875,
    out: 0.905,
    pos: 'left',
    html: `
      <p class="cap__kicker mono">11 — WayFinder</p>
      <h2 class="cap__title">Live AR View</h2>`,
  },
];
