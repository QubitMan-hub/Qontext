// Studio state. The project (persisted) holds every design setting; the session holds measurements,
// the loaded pool and UI state. Modules subscribe and re-render on change.

import {
  DEFAULT_PROJECT, sanitizeProject, paletteOf, makeState, measureAll, mulberry32, hashSeed, poolDrawer,
} from '../engine/index.js';
import { debounce, storage } from './dom.js';

const PROJECT_KEY = 'qontext-project-v1';

export const store = {
  project: sanitizeProject(storage.get(PROJECT_KEY, DEFAULT_PROJECT)),
  out: null,
  count: 1,
  pool: null,
  usePool: false,
  drawer: null,
  tab: 'grid',
};

const listeners = new Set();
export const subscribe = (fn) => listeners.add(fn);

function emit(kind) {
  for (const fn of listeners) {
    try {
      fn(kind);
    } catch (e) {
      console.error(e);
    }
  }
}

const persist = debounce(() => storage.set(PROJECT_KEY, store.project), 250);

export const palette = () => paletteOf(store.project);

/** Seed for collapse number `count` of this project, optionally for visitor k. */
export const collapseSeed = (count, k = 0) => hashSeed(store.project.measureSeed, store.project.stateSeed, count, k);

export function measureRound(count, k = 0, usePool = store.usePool) {
  const p = store.project;
  const psi = makeState(p.state, p.stateSeed);
  return measureAll(psi, mulberry32(collapseSeed(count, k)), usePool && store.drawer ? store.drawer : null);
}

/** Applies a project patch. `remeasure` re-collapses the grid (state changes). */
export function setProject(patch, { remeasure = false } = {}) {
  store.project = sanitizeProject({ ...store.project, ...patch });
  persist();
  if (remeasure) store.out = measureRound(store.count);
  emit('project');
}

export function replaceProject(p) {
  store.project = sanitizeProject(p);
  store.count = 1;
  store.out = measureRound(store.count);
  persist();
  emit('project');
}

export function remeasure() {
  store.count += 1;
  store.out = measureRound(store.count);
  emit('measure');
}

export function setPool(pool) {
  store.pool = pool;
  store.drawer = pool ? poolDrawer(pool) : null;
  store.usePool = !!pool;
  store.count += 1;
  store.out = measureRound(store.count);
  emit('pool');
}

export function setUsePool(on) {
  store.usePool = !!(on && store.pool);
  store.count += 1;
  store.out = measureRound(store.count);
  emit('pool');
}

export function setTab(tab) {
  store.tab = tab;
  emit('tab');
}

store.out = measureRound(store.count);
