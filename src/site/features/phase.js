// Phase Dial: the site's theme is an angle. Light is 0 degrees, dark is 180, and every whole degree between is an
// interference blend that Bouncer has made readable (src/engine/phase.js). The page follows the system setting
// until the visitor turns the dial; after that their angle is kept in local storage, if the browser allows it.

import { phaseTheme, normalizeDeg, allTileColors } from '../../engine/index.js';
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
}
