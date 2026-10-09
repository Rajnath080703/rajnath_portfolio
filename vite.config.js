import { defineConfig, createServer } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Your live address, e.g. SITE_URL=https://rajnath.dev npm run build
 * Used for the canonical link, absolute social-preview URLs and sitemap.xml.
 * Without it the build still works; those three items are simply omitted / relative.
 */
const SITE_URL = (process.env.SITE_URL || '').replace(/\/+$/, '');

// Content-Security-Policy: everything is self-hosted; only inline *styles* are allowed
// (GSAP / runtime-set styles). No inline or third-party scripts.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

/**
 * Production-only build step:
 *  • pre-renders the portfolio + captions into index.html (crawlers / no-JS readers get real content)
 *  • adds social preview tags, structured data (schema.org Person), CSP + referrer policy
 *  • emits robots.txt (+ sitemap.xml when SITE_URL is set)
 *  • keeps the development-only photo experiment out of the deployed site
 */
function portfolioBuild() {
  let outDir = 'dist';
  return {
    name: 'portfolio-build',
    apply: 'build',
    configResolved(c) {
      outDir = path.resolve(c.root, c.build.outDir);
    },
    async transformIndexHtml(html) {
      const server = await createServer({
        configFile: false,
        root: process.cwd(),
        base: './',
        logLevel: 'error',
        appType: 'custom',
        server: { middlewareMode: true, hmr: false, ws: false },
        optimizeDeps: { noDiscovery: true, include: [] },
      });
      try {
        const { renderPortfolio } = await server.ssrLoadModule('/src/ui/portfolio.js');
        const { renderCaptions } = await server.ssrLoadModule('/src/ui/captions.js');
        const { profile: p } = await server.ssrLoadModule('/src/data/profile.js');

        html = html
          .replace('<div id="portfolio"></div>', `<div id="portfolio">${renderPortfolio()}</div>`)
          .replace('<div id="captions" aria-hidden="false"></div>', `<div id="captions" aria-hidden="false">${renderCaptions()}</div>`);

        const title = `${p.name} — ${p.title}`;
        const desc = `${p.title} in ${p.location} — ${p.focus.join(', ')}. Proxmox, VMware, Hyper-V, Microsoft 365, networking, monitoring and backup & disaster recovery.`;
        const image = SITE_URL ? `${SITE_URL}/og-image.jpg` : './og-image.jpg';
        const person = {
          '@context': 'https://schema.org',
          '@type': 'Person',
          name: p.name,
          jobTitle: p.title,
          email: `mailto:${p.contact.email}`,
          telephone: p.contact.phone.replace(/\s/g, ''),
          address: { '@type': 'PostalAddress', addressLocality: 'Chennai', addressCountry: 'IN' },
          sameAs: [p.contact.linkedin],
          worksFor: { '@type': 'Organization', name: p.experience[0].company },
          hasCredential: { '@type': 'EducationalOccupationalCredential', name: p.certificationFull },
          alumniOf: p.education.map((e) => ({ '@type': 'EducationalOrganization', name: e.school })),
          knowsAbout: p.skills.flatMap((s) => s.items).slice(0, 30),
          ...(SITE_URL ? { url: `${SITE_URL}/` } : {}),
        };
        const head = [
          `<meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
          `<meta name="referrer" content="strict-origin-when-cross-origin" />`,
          `<meta name="robots" content="index, follow" />`,
          `<meta name="author" content="${esc(p.name)}" />`,
          SITE_URL && `<link rel="canonical" href="${SITE_URL}/" />`,
          `<meta property="og:type" content="profile" />`,
          `<meta property="og:title" content="${esc(title)}" />`,
          `<meta property="og:description" content="${esc(desc)}" />`,
          `<meta property="og:image" content="${image}" />`,
          `<meta property="og:image:width" content="1200" />`,
          `<meta property="og:image:height" content="630" />`,
          `<meta property="og:image:alt" content="${esc(p.name)} — ${esc(p.title)}: a server rack in a data centre" />`,
          SITE_URL && `<meta property="og:url" content="${SITE_URL}/" />`,
          `<meta property="profile:first_name" content="${esc(p.firstName)}" />`,
          `<meta property="profile:last_name" content="${esc(p.lastName)}" />`,
          `<meta name="twitter:card" content="summary_large_image" />`,
          `<meta name="twitter:title" content="${esc(title)}" />`,
          `<meta name="twitter:description" content="${esc(desc)}" />`,
          `<meta name="twitter:image" content="${image}" />`,
          `<script type="application/ld+json">${JSON.stringify(person).replace(/</g, '\\u003c')}</script>`,
        ]
          .filter(Boolean)
          .map((l) => `    ${l}`)
          .join('\n');
        return html.replace('</head>', `${head}\n  </head>`);
      } finally {
        await server.close();
      }
    },
    generateBundle() {
      const robots = ['User-agent: *', 'Allow: /', SITE_URL && `Sitemap: ${SITE_URL}/sitemap.xml`].filter(Boolean).join('\n') + '\n';
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots });
      if (SITE_URL) {
        const today = new Date().toISOString().slice(0, 10);
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE_URL}/</loc><lastmod>${today}</lastmod></url>\n</urlset>\n`,
        });
      } else {
        this.warn('SITE_URL not set — canonical link and sitemap.xml omitted. Build with SITE_URL=https://your-domain to include them.');
      }
    },
    closeBundle() {
      // the photographic experiment (?engine=photo) is development-only
      fs.rmSync(path.join(outDir, 'photos'), { recursive: true, force: true });
    },
  };
}

export default defineConfig({
  // Relative base so the build works from any sub-path (GitHub Pages, Netlify, etc.)
  base: './',
  server: { port: 5173, open: true },
  plugins: [portfolioBuild()],
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Split heavy vendors so the browser can cache them independently.
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/gsap') || id.includes('node_modules/lenis')) return 'motion';
        },
      },
    },
  },
});
