# Rajnath Tamizh Selvan — Cinematic Infrastructure Portfolio

A scroll-driven 3D portfolio. **Scroll = camera movement.** One continuous WebGL world takes the visitor from a working server rack, along an ordinary patch cable through the cable managers to a network switch, into a NOC (Proxmox → install → monitoring → backup/DR), across a cyber security training hall, into a student's screen, onto the WayFinder campus map and a Live AR view. It then opens into the professional portfolio (profile, experience, projects, skills, certification) and an interactive terminal.

Built with **Three.js** (WebGL), **GSAP ScrollTrigger**, **Lenis** (smooth scroll) and **Vite**. The 3D world is built from code, and its textures are drawn on canvases at load time.

## Run

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build → dist/
npm run preview   # serve the production build (http://localhost:4173)
```

### Deploy

Upload `dist/` to any static host. The build uses relative paths, so it also works from a sub-folder.

Set your live address when building, so the canonical link, absolute social-preview URLs and `sitemap.xml` are generated:

```bash
# PowerShell
$env:SITE_URL="https://your-domain"; npm run build
# bash
SITE_URL=https://your-domain npm run build
```

- **Security headers** ship with the site: `public/_headers` (Netlify, Cloudflare Pages) and `vercel.json` (Vercel). A Content-Security-Policy and a referrer policy are also embedded in `index.html`.
- **Fonts** (Inter Tight, JetBrains Mono, SIL Open Font License) are self-hosted in `src/assets/fonts`, so the site makes no third-party requests.

## Content

- All resume content (contact, summary, experience, projects, skills, education) is in **`src/data/profile.js`**. The page sections, the terminal and the pre-rendered HTML are all generated from that file.
- The resume PDF is at **`public/resume/Rajnath_Tamizh_Selvan_Resume.pdf`**. Replace it with your own file using the same name.
- The social preview image is **`public/og-image.jpg`** (1200×630).

## File structure

```
├─ index.html                 Page shell: canvas, HUD, overlay roots
├─ vite.config.js             Build: pre-render, SEO/social tags, CSP, robots/sitemap
├─ vercel.json                Security headers for Vercel
├─ public/
│  ├─ _headers                Security headers for Netlify / Cloudflare Pages
│  ├─ favicon.svg, og-image.jpg
│  ├─ resume/                 Resume PDF
│  └─ photos/                 Development-only photo experiment (not deployed)
└─ src/
   ├─ main.js                 Boot, loader, the single render/scroll loop
   ├─ assets/fonts/           Self-hosted woff2 fonts
   ├─ data/
   │  ├─ profile.js           ALL personal/resume content (single source of truth)
   │  └─ chapters.js          Cinematic timeline: chapter ranges, captions, dips to black
   ├─ core/
   │  ├─ quality.js           Device tiers (desktop / mobile / low-power), reduced motion
   │  ├─ smoothScroll.js      Lenis + GSAP ticker + ScrollTrigger wiring
   │  ├─ stage.js             Renderer, scene, camera, adaptive resolution
   │  └─ cameraRig.js         Shots: scroll progress → camera path (Catmull-Rom), AR walk
   ├─ world/
   │  ├─ engine3d.js          Staged loading: opening scene first, rest in the background
   │  ├─ world.js             Scenes, light-rig timeline, culling, async shader compile, shadows
   │  ├─ layout.js            World offsets, rack dimensions, campus layout + route
   │  ├─ materials.js         Shared materials + GPU shaders (LEDs, data pulse)
   │  ├─ instancing.js        Template → InstancedMesh per material (students, chairs, desks)
   │  ├─ textures/            Canvas textures: rack faces, screens, surfaces
   │  └─ scenes/              rack, serverRoom, noc, lab, campus
   ├─ photo/                  Development-only photographic engine (?engine=photo in dev)
   ├─ ui/                     captions, hud, labels3d, wayfinder, portfolio, terminal, backupFlow
   └─ styles/                 fonts, base, cinema, sections, terminal
```

## Performance

- **Fast first load.** Only the opening server room is built and compiled before the reveal. The NOC, lab and campus are built in the background while the visitor watches the opening.
- **Shaders compile asynchronously** (`compileAsync`). Production builds skip three.js shader error checks, which would otherwise force synchronous compiles. No pre-filtered environment map is generated, which saves about 4 s on a cold first visit.
- **One loop.** Lenis, ScrollTrigger, the camera, the world and the overlays all advance in the GSAP ticker. Layout values are cached on resize.
- **Few draw calls.** Racks, cables, students, chairs, trees and lamps are merged or instanced. LED blinking runs in a shader.
- **Adaptive.** If frames slow down, resolution drops a step. Integrated and mobile GPUs start a step lower and skip real-time shadows.
- **Accessible.** Reduced motion holds a still frame for each chapter, and a no-WebGL fallback keeps the text and portfolio. Keyboard focus is visible, a skip link leads to the profile, and muted text meets 4.5:1 contrast.

## Accuracy

On-screen numbers in dashboards (Proxmox, monitoring, lab status) are labelled **DEMO DATA** or **simulated**. They are visuals, not professional claims.
