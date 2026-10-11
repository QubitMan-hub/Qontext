// Phase Dial: the site's theme is an angle. Light is 0 degrees, dark is 180, and every whole degree between is an
// interference blend that Bouncer has made readable (src/engine/phase.js). The page follows the system setting
// until the visitor turns the dial; after that their angle is kept in local storage, if the browser allows it.

import { phaseTheme, normalizeDeg, allTileColors } from '../../engine/index.js';
import { $ } from '../../app/dom.js';
import { site, onWorld, retheme, setPaper } from '../world.js';

const KEY = 'qontext:phase';
const VARS = { paper: '--paper', paper2: '--paper-2', sheet: '--sheet', ink: '--ink', ink2: '--ink-2', rule: '--rule', ok: '--ok', no: '--no' };
const state = { deg: 0, follows: true };
const watchers = new Set();

function stored() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null || raw.trim() === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? normalizeDeg(n) : null;
  } catch {
    return null;
  }
}

function store(value) {
  try {
    if (value === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, String(value));
  } catch {
    /* private windows: the angle lasts until the page closes */
  }
}

function systemDeg() {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 180 : 0;
  } catch {
    return 0;
  }
}

/** The theme at an angle in the current world (the Wall Wash mixes in this world's tiles). */
export const themeAt = (deg) => phaseTheme(deg, site.palette ? allTileColors(site.palette).map((c) => c.hex) : []);

function apply() {
  const theme = themeAt(state.deg);
  const root = document.documentElement;
  for (const [k, name] of Object.entries(VARS)) root.style.setProperty(name, theme.tokens[k]);
  root.style.colorScheme = theme.scheme;
  root.dataset.phase = String(state.deg);
  if (theme.tokens.paper !== site.paper) {
    setPaper(theme.tokens.paper);
    if (site.result) retheme();
  }
  for (const fn of watchers) fn(theme, state);
}

/** Turns the dial. `remember` keeps the angle for this visitor and stops following the system. */
export function setPhase(deg, { remember = true } = {}) {
  state.deg = normalizeDeg(deg);
  if (remember) {
    state.follows = false;
    store(state.deg);
  }
  apply();
}

/** Back to the system's light or dark, and forget the visitor's angle. */
export function followSystem() {
  state.follows = true;
  store(null);
  setPhase(systemDeg(), { remember: false });
}

export const currentPhase = () => ({ deg: state.deg, followsSystem: state.follows });
export const onPhase = (fn) => watchers.add(fn);

/* ---------- the Moon and the dial ---------- */

/** The Moon at an angle: lit fraction (1 + cos φ) / 2, waning from light to dark and waxing back. */
function moonPath(deg) {
  const R = 11;
  const c = Math.cos((deg * Math.PI) / 180);
  const waning = deg <= 180;
  const outer = waning ? 0 : 1; // the lit half: left while waning, right while waxing
  const inner = waning === c > 0 ? 0 : 1; // the terminator bulges into the dark half when gibbous
  return `M0 ${-R}A${R} ${R} 0 0 ${outer} 0 ${R}A${(Math.abs(c) * R).toFixed(2)} ${R} 0 0 ${inner} 0 ${-R}Z`;
}

function valueText(deg) {
  if (deg === 0) return '0°, light';
  if (deg === 180) return '180°, dark';
  return `${deg}°, dusk on the way ${deg < 180 ? 'to dark' : 'back to light'}`;
}

let ringWorld = null;

/** The ring shows the paper at every 10 degrees of this world. Painted when the dial opens, not at boot. */
function paintRing() {
  if (ringWorld === site.seed) return;
  ringWorld = site.seed;
  const stops = [];
  for (let k = 0; k <= 36; k++) stops.push(`${themeAt(k * 10).tokens.paper} ${k * 10}deg`);
  $('phaseRing').style.setProperty('--ring', `conic-gradient(${stops.join(', ')})`);
}

function paintDial(theme) {
  $('moonLit').setAttribute('d', moonPath(state.deg));
  const ring = $('phaseRing');
  ring.setAttribute('aria-valuenow', String(state.deg));
  ring.setAttribute('aria-valuetext', valueText(state.deg));
  ring.style.setProperty('--a', `${state.deg}deg`);
  $('phaseDeg').textContent = `${state.deg}°`;
  const floor = (Math.floor(theme.minContrast * 10) / 10).toFixed(1);
  $('phaseLine').textContent = `Phase ${state.deg}°. All text reads at ${floor} : 1 or better. Bouncer checked all 360 angles.`;
}

function initDial() {
  const btn = $('phaseBtn');
  const pop = $('phase');
  const ring = $('phaseRing');
  if (!btn || !pop || !ring) return;
  onPhase(paintDial);
  paintDial(themeAt(state.deg));
  onWorld((kind) => kind === 'world' && !pop.hidden && paintRing());

  const outside = (e) => {
    if (!pop.contains(e.target) && !btn.contains(e.target)) close(false);
  };
  const open = () => {
    paintRing();
    pop.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    ring.focus();
    document.addEventListener('pointerdown', outside, true);
  };
  const close = (focusMoon = true) => {
    pop.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside, true);
    if (focusMoon) btn.focus();
  };
  btn.addEventListener('click', () => (pop.hidden ? open() : close()));
  pop.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });

  const STEPS = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 45, PageDown: -45 };
  ring.addEventListener('keydown', (e) => {
    if (e.key === 'Home') setPhase(0);
    else if (e.key === 'End') setPhase(180);
    else if (e.key in STEPS) setPhase(state.deg + STEPS[e.key] * (e.shiftKey && Math.abs(STEPS[e.key]) === 1 ? 15 : 1));
    else return;
    e.preventDefault();
  });

  // Drag the handle or tap the ring: 0 degrees at the top, clockwise. At most one change a frame.
  let pending = null;
  const fromPointer = (e) => {
    const r = ring.getBoundingClientRect();
    const deg = (Math.atan2(e.clientX - r.left - r.width / 2, r.top + r.height / 2 - e.clientY) * 180) / Math.PI;
    if (pending === null) requestAnimationFrame(() => {
      setPhase(pending);
      pending = null;
    });
    pending = deg;
  };
  ring.addEventListener('pointerdown', (e) => {
    ring.setPointerCapture(e.pointerId);
    fromPointer(e);
  });
  ring.addEventListener('pointermove', (e) => ring.hasPointerCapture(e.pointerId) && fromPointer(e));

  for (const b of pop.querySelectorAll('[data-phase-to]')) b.addEventListener('click', () => setPhase(Number(b.dataset.phaseTo)));
  $('phaseSystem').addEventListener('click', followSystem);
}

export function initPhase() {
  const saved = stored();
  state.follows = saved === null;
  state.deg = saved ?? systemDeg();
  apply();
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (state.follows) setPhase(systemDeg(), { remember: false });
    });
  } catch {
    /* old browsers: the system setting is read once */
  }
  // A new world brings new tiles to the Wall Wash, so Bouncer checks the theme again.
  onWorld((kind) => kind === 'world' && apply());
  initDial();
}
