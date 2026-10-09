/**
 * SCENES 12–17 — The professional portfolio after the cinematic journey.
 * Rendered from profile.js; motion is scroll-scrubbed (GSAP ScrollTrigger),
 * transforms/opacity/clip-path only.
 */
import { profile } from '../data/profile.js';
import { Terminal, terminalMarkup } from './terminal.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pad = (n) => String(n).padStart(2, '0');
const split = (s) =>
  esc(s)
    .split(' ')
    .map((w) => `<span class="w"><span class="w__i">${w}</span></span>`)
    .join(' ');

/** Pure HTML string — also used at build time to pre-render the page for crawlers. */
export function renderPortfolio() {
  const p = profile;
  const [current, previous] = p.experience;
  const c = p.contact;
  const contactRows = [
    c.email && ['Email', `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`],
    c.phone && ['Phone', `<a href="tel:${esc(c.phone.replace(/\s/g, ''))}">${esc(c.phone)}</a>`],
    c.linkedin && ['LinkedIn', `<a href="${esc(c.linkedin)}" target="_blank" rel="noopener">${esc(c.linkedin.replace(/^https?:\/\/(www\.)?/, ''))}</a>`],
    ['Location', esc(p.location.split(',')[0])],
  ].filter(Boolean);

  return `
  <div class="pf-bridge" aria-hidden="true"></div>

  <section id="about" class="sec about" data-hud="12|Profile">
    <div class="sec__inner about__grid">
      <p class="kicker mono">12 — Professional Summary</p>
      <p class="about__text reveal-line">${esc(p.summary)}</p>
      <ul class="about__meta mono">
        <li>${esc(p.location)}</li>
        ${c.phone ? `<li><a href="tel:${esc(c.phone.replace(/\s/g, ''))}">${esc(c.phone)}</a></li>` : ''}
        ${c.email ? `<li><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></li>` : ''}
        ${c.linkedin ? `<li><a href="${esc(c.linkedin)}" target="_blank" rel="noopener">${esc(c.linkedin.replace(/^https?:\/\/(www\.)?/, ''))}</a></li>` : ''}
      </ul>
    </div>
  </section>

  <section id="experience" class="sec exp" data-hud="13|Experience">
    <div class="sec__inner exp__grid">
      <header class="exp__head">
        <p class="kicker mono">13 — Experience</p>
        <h2 class="display split">${split(current.role)}</h2>
        <p class="exp__company">${esc(current.company)}</p>
        <p class="exp__note mono">${esc(current.period)} · ${esc(current.note)}</p>
      </header>
      <div class="exp__groups">
        ${current.groups
          .map(
            (g, i) => `
          <article class="grp reveal">
            <header class="grp__h"><span class="mono grp__i">${pad(i + 1)}</span><h3>${esc(g.title)}</h3><i class="rule"></i></header>
            <ul class="grp__list">${g.items.map((it) => `<li>${esc(it)}</li>`).join('')}</ul>
          </article>`
          )
          .join('')}
        <article class="grp reveal">
          <header class="grp__h"><span class="mono grp__i">${pad(current.groups.length + 1)}</span><h3>Key responsibilities</h3><i class="rule"></i></header>
          <ul class="hl__list">${current.highlights.map((it) => `<li>${esc(it)}</li>`).join('')}</ul>
        </article>
      </div>
    </div>
  </section>

  <section id="previous" class="sec prev" data-hud="14|Previous Experience">
    <div class="sec__inner prev__grid">
      <div>
        <p class="kicker mono">14 — Previous Experience</p>
        <h2 class="display display--md split">${split(previous.role)}</h2>
        <p class="prev__company">${esc(previous.company)}</p>
        <p class="prev__client mono">Client — ${esc(previous.client)}</p>
        <p class="prev__client mono">${esc(previous.period)} · ${esc(previous.note)}</p>
      </div>
      <ul class="prev__list">${previous.items.map((it, i) => `<li class="reveal-line"><span class="mono">${pad(i + 1)}</span>${esc(it)}</li>`).join('')}</ul>
    </div>
  </section>

  <section id="projects" class="sec projects" data-hud="15|Projects">
    <div class="sec__inner">
      <p class="kicker mono">15 — Projects</p>
      <h2 class="display display--md split">${split('Projects')}</h2>
      <div class="proj__grid">
        ${p.projects
          .map(
            (pr, i) => `
          <article class="proj reveal-line">
            <p class="mono proj__i">${pad(i + 1)}</p>
            <h3 class="proj__t">${esc(pr.name)}</h3>
            <p class="proj__place mono">${esc(pr.place)}</p>
            <ul class="hl__list">${pr.points.map((pt) => `<li>${esc(pt)}</li>`).join('')}</ul>
            <ul class="proj__tags mono">${pr.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
          </article>`
          )
          .join('')}
      </div>
    </div>
  </section>

  <section id="skills" class="sec skills" data-hud="16|Skills">
    <div class="skills__ghost" aria-hidden="true">INFRASTRUCTURE · NETWORK · SYSTEMS · </div>
    <div class="sec__inner">
      <p class="kicker mono">16 — Skills</p>
      <h2 class="display display--md split">${split('The skill wall')}</h2>
      <div class="wall">
        ${p.skills
          .map(
            (s, i) => `
          <div class="wall__col" data-speed="${[0.0, 0.12, -0.06, 0.08, -0.1][i % 5]}">
            <h3 class="wall__h mono"><span>${pad(i + 1)}</span>${esc(s.title)}</h3>
            <ul>${s.items.map((it) => `<li class="chip">${esc(it)}</li>`).join('')}</ul>
          </div>`
          )
          .join('')}
      </div>
    </div>
  </section>

  <section id="credentials" class="sec cred" data-hud="17|Certification & Education">
    <div class="sec__inner cred__grid">
      <div class="cred__cert">
        <p class="kicker mono">17 — Certification</p>
        ${p.certification.map((ct) => `<p class="cred__big">${esc(ct)}</p>`).join('')}
        <p class="cred__sub mono">${esc(p.certificationFull)}</p>
      </div>
      <div class="cred__edu">
        <p class="kicker mono">Education</p>
        ${p.education.map((e) => `<div class="cred__item reveal-line"><h3>${esc(e.title)}</h3><p>${esc(e.school)}</p></div>`).join('')}
      </div>
      <div class="cred__lang">
        <p class="kicker mono">Languages</p>
        ${p.languages.map((l) => `<p class="cred__l reveal-line">${esc(l)}</p>`).join('')}
      </div>
    </div>
  </section>

  <section id="terminal" class="sec term-sec" data-hud="18|Terminal">
    <div class="sec__inner">
      <p class="kicker mono">18 — Terminal</p>
      <h2 class="display display--sm split">${split('Ask the system.')}</h2>
      ${terminalMarkup()}
    </div>
  </section>

  <section id="contact" class="sec contact" data-hud="19|Contact">
    <div class="sec__inner">
      <p class="kicker mono">19 — Contact</p>
      <h2 class="contact__name"><span class="line"><span>${esc(p.firstName)}</span></span><span class="line"><span>${esc(p.lastName)}</span></span></h2>
      <p class="contact__role">${esc(p.title)}</p>
      <p class="contact__focus mono">${p.focus.map(esc).join(' | ')}</p>
      <dl class="contact__list">
        ${contactRows.map(([k, v]) => `<div><dt class="mono">${k}</dt><dd>${v}</dd></div>`).join('')}
      </dl>
      <a class="btn" href="${esc(p.resumeUrl)}" download>
        <span class="mono">Download Resume</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v12M6 11l6 6 6-6M5 20h14"/></svg>
      </a>
    </div>
    <footer class="foot mono">
      <span>© ${new Date().getFullYear()} ${esc(p.name)}</span>
      <a href="#top">Back to the server room ↑</a>
    </footer>
  </section>`;
}

export function initPortfolio(root, { gsap, ScrollTrigger, reducedMotion, hud }) {
  root.innerHTML = renderPortfolio();
  const terminal = new Terminal(root.querySelector('.term'));

  // HUD label per section
  root.querySelectorAll('[data-hud]').forEach((sec) => {
    const [num, label] = sec.dataset.hud.split('|');
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: (self) => self.isActive && (hud.sectionLabel = [num, label]),
    });
  });

  ScrollTrigger.create({
    trigger: '#terminal',
    start: 'top 70%',
    once: true,
    onEnter: () => terminal.boot(),
  });

  if (reducedMotion) {
    root.classList.add('no-motion');
    return;
  }

  // Word-by-word masked title reveals (scrubbed)
  root.querySelectorAll('.split').forEach((el) => {
    gsap.fromTo(
      el.querySelectorAll('.w__i'),
      { yPercent: 110 },
      { yPercent: 0, ease: 'none', stagger: 0.12, scrollTrigger: { trigger: el, start: 'top 92%', end: 'top 55%', scrub: true } }
    );
  });

  // Experience groups: clip-path wipe + rule draw + staggered items
  root.querySelectorAll('.grp').forEach((g) => {
    const tl = gsap.timeline({ scrollTrigger: { trigger: g, start: 'top 88%', end: 'top 45%', scrub: true } });
    tl.fromTo(g, { clipPath: 'inset(0 0 100% 0)', y: 60 }, { clipPath: 'inset(0 0 0% 0)', y: 0, ease: 'none' }, 0)
      .fromTo(g.querySelector('.rule'), { scaleX: 0 }, { scaleX: 1, ease: 'none' }, 0.1)
      .fromTo(g.querySelectorAll('li'), { opacity: 0, x: -14 }, { opacity: 1, x: 0, stagger: 0.05, ease: 'none' }, 0.2);
  });

  // Lines (previous experience, education, languages)
  root.querySelectorAll('.reveal-line').forEach((li) => {
    gsap.fromTo(li, { opacity: 0, y: 26 }, { opacity: 1, y: 0, ease: 'none', scrollTrigger: { trigger: li, start: 'top 94%', end: 'top 70%', scrub: true } });
  });

  // Skill wall: columns drift at different speeds, chips settle into place
  const wall = root.querySelector('.wall');
  root.querySelectorAll('.wall__col').forEach((col) => {
    const sp = parseFloat(col.dataset.speed);
    gsap.fromTo(col, { y: () => 260 * sp }, { y: () => -260 * sp, ease: 'none', scrollTrigger: { trigger: wall, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo(
      col.querySelectorAll('.chip'),
      { opacity: 0, y: 30, letterSpacing: '0.12em' },
      { opacity: 1, y: 0, letterSpacing: '0em', stagger: 0.06, ease: 'none', scrollTrigger: { trigger: col, start: 'top 90%', end: 'top 40%', scrub: true } }
    );
  });
  gsap.fromTo('.skills__ghost', { xPercent: 0 }, { xPercent: -35, ease: 'none', scrollTrigger: { trigger: '#skills', start: 'top bottom', end: 'bottom top', scrub: true } });

  // Certification: the big mark resolves from wide tracking
  gsap.fromTo(
    '.cred__big',
    { letterSpacing: '0.5em', opacity: 0.15, filter: 'blur(6px)' },
    { letterSpacing: '-0.02em', opacity: 1, filter: 'blur(0px)', ease: 'none', scrollTrigger: { trigger: '.cred__big', start: 'top 95%', end: 'top 55%', scrub: true } }
  );

  // Terminal rises out of the dark
  gsap.fromTo('.term', { y: 80, scale: 0.96, opacity: 0.2 }, { y: 0, scale: 1, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.term', start: 'top 98%', end: 'top 55%', scrub: true } });

  // Contact name lines
  gsap.fromTo('.contact__name .line > span', { yPercent: 105 }, { yPercent: 0, stagger: 0.15, ease: 'none', scrollTrigger: { trigger: '.contact__name', start: 'top 95%', end: 'top 50%', scrub: true } });
}
