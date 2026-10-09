/**
 * SCENE 16 — Final interactive terminal. Every answer comes from profile.js.
 */
import { profile } from '../data/profile.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const PROMPT = 'rajnath@portfolio:~$';

const COMMANDS = {
  help: 'List available commands',
  about: 'Who I am',
  skills: 'Technical skills by category',
  experience: 'Professional experience',
  projects: 'Featured projects',
  infrastructure: 'Infrastructure I work with',
  contact: 'How to reach me',
  resume: 'Download my resume',
  'lab-status': 'Simulated lab status (visualisation)',
  clear: 'Clear the terminal',
};

function out() {
  const p = profile;
  const c = p.contact;
  return {
    help: () =>
      `<span class="t-dim">Available commands</span>\n` +
      Object.entries(COMMANDS)
        .map(([k, v]) => `  <button class="t-cmd" data-cmd="${k}">${k.padEnd(16)}</button><span class="t-dim">${v}</span>`)
        .join('\n'),
    about: () =>
      `<strong>${esc(p.name)}</strong>\n${esc(p.title)} — ${p.focus.map(esc).join(' · ')}\n\n` +
      `${esc(p.summary)}\n\n` +
      `<span class="t-dim">Based in ${esc(p.location)}. Certification: ${p.certification.map(esc).join(', ')}.</span>\n` +
      `<span class="t-dim">Languages: ${p.languages.map(esc).join(', ')}.</span>`,
    skills: () =>
      p.skills
        .map((s) => `<span class="t-head">${esc(s.title.toUpperCase())}</span>\n  ${s.items.map(esc).join('  ·  ')}`)
        .join('\n\n'),
    experience: () =>
      p.experience
        .map((e) => {
          const head = `<span class="t-head">${esc(e.role.toUpperCase())}</span>  <span class="t-dim">${esc(e.company)}${e.client ? ' · Client: ' + esc(e.client) : ''} · ${esc(e.period)}</span>`;
          const body = (e.highlights || e.items).map((it) => `  ▸ ${esc(it)}`).join('\n');
          return `${head}\n${body}`;
        })
        .join('\n\n'),
    projects: () =>
      p.projects
        .map((pr) => `<span class="t-head">${esc(pr.name)}</span>  <span class="t-dim">${esc(pr.place)}</span>\n${pr.points.map((pt) => `  ▸ ${esc(pt)}`).join('\n')}`)
        .join('\n\n'),
    infrastructure: () => p.infrastructure.map((s) => `  ▸ ${esc(s)}`).join('\n'),
    contact: () =>
      [
        c.email && `  email     <a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`,
        c.phone && `  phone     <a href="tel:${esc(c.phone.replace(/\s/g, ''))}">${esc(c.phone)}</a>`,
        c.linkedin && `  linkedin  <a href="${esc(c.linkedin)}" target="_blank" rel="noopener">${esc(c.linkedin.replace(/^https?:\/\/(www\.)?/, ''))}</a>`,
        `  location  ${esc(p.location)}`,
      ]
        .filter(Boolean)
        .join('\n'),
    resume: () => `  <a class="t-btn" href="${esc(p.resumeUrl)}" download>↓ Download resume (PDF)</a>`,
    'lab-status': () => {
      const rows = [
        ['virtualization host', 'ONLINE'],
        ['windows environments', 'RUNNING'],
        ['linux environments', 'RUNNING'],
        ['security testing network', 'ISOLATED'],
        ['snapshots', 'READY'],
      ];
      return (
        `<span class="t-head">CYBER SECURITY LAB — STATUS</span>  <span class="t-tag">SIMULATED</span>\n` +
        `<span class="t-dim">${'─'.repeat(46)}</span>\n` +
        rows.map(([a, b]) => `  ${a.padEnd(28, '.')} <span class="t-ok">● ${b}</span>`).join('\n') +
        `\n<span class="t-dim">${'─'.repeat(46)}</span>\n<span class="t-dim">Portfolio visualisation only — not live infrastructure data.</span>`
      );
    },
  };
}

export class Terminal {
  constructor(root) {
    this.root = root;
    this.body = root.querySelector('.term__body');
    this.input = root.querySelector('.term__input');
    this.form = root.querySelector('.term__form');
    this.history = [];
    this.hi = 0;
    this.handlers = out();
    this.started = false;

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = this.input.value;
      this.input.value = '';
      this.run(v);
    });
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' && this.history.length) {
        this.hi = Math.max(0, this.hi - 1);
        this.input.value = this.history[this.hi] || '';
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        this.hi = Math.min(this.history.length, this.hi + 1);
        this.input.value = this.history[this.hi] || '';
        e.preventDefault();
      } else if (e.key === 'Tab') {
        const m = Object.keys(COMMANDS).filter((k) => k.startsWith(this.input.value.trim()));
        if (m.length === 1) this.input.value = m[0];
        e.preventDefault();
      } else if (e.key === 'l' && e.ctrlKey) {
        this.clear();
        e.preventDefault();
      }
    });
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cmd]');
      if (b) {
        this.run(b.dataset.cmd);
        return;
      }
      if (!e.target.closest('a,button') && window.getSelection().isCollapsed) this.input.focus({ preventScroll: true });
    });
  }

  print(html, cls = '') {
    const pre = document.createElement('pre');
    pre.className = `term__line ${cls}`;
    pre.innerHTML = html;
    this.body.appendChild(pre);
    this.body.scrollTop = this.body.scrollHeight;
  }

  clear() {
    this.body.innerHTML = '';
  }

  run(raw) {
    const cmd = raw.trim().toLowerCase();
    this.print(`<span class="t-prompt">${PROMPT}</span> ${esc(raw)}`, 'term__echo');
    if (!cmd) return;
    this.history.push(cmd);
    this.hi = this.history.length;
    if (cmd === 'clear') return this.clear();
    const h = this.handlers[cmd];
    if (h) this.print(h(), 'term__out');
    else if (cmd === 'sudo' || cmd.startsWith('sudo ')) this.print(`<span class="t-dim">Nice try. This incident will be documented. (Try </span><button class="t-cmd" data-cmd="help">help</button><span class="t-dim">)</span>`, 'term__out');
    else this.print(`<span class="t-err">command not found:</span> ${esc(cmd)} — type <button class="t-cmd" data-cmd="help">help</button>`, 'term__out');
  }

  /** Typed intro the first time the terminal scrolls into view. */
  boot() {
    if (this.started) return;
    this.started = true;
    this.print(`<span class="t-dim">Last login: ${new Date().toDateString()} on ttys001</span>`);
    const word = 'help';
    let i = 0;
    const echo = document.createElement('pre');
    echo.className = 'term__line term__echo';
    this.body.appendChild(echo);
    const tick = () => {
      echo.innerHTML = `<span class="t-prompt">${PROMPT}</span> ${word.slice(0, i)}<span class="t-caret"></span>`;
      if (i++ < word.length) setTimeout(tick, 110);
      else {
        echo.remove();
        this.run(word);
      }
    };
    setTimeout(tick, 350);
  }
}

export function terminalMarkup() {
  return `
    <div class="term" role="region" aria-label="Interactive terminal">
      <div class="term__bar"><i></i><i></i><i></i><span class="mono">rajnath@portfolio — bash</span></div>
      <div class="term__body mono" aria-live="polite" data-lenis-prevent></div>
      <form class="term__form mono" autocomplete="off">
        <label for="term-input" class="t-prompt">${PROMPT}</label>
        <input id="term-input" class="term__input" type="text" spellcheck="false" autocapitalize="off" aria-label="Terminal command" />
      </form>
      <div class="term__chips mono">${Object.keys(COMMANDS)
        .map((k) => `<button class="t-chip" data-cmd="${k}">${k}</button>`)
        .join('')}</div>
    </div>`;
}
