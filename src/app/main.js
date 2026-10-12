// Qontext Atelier entry point: wires tabs, global shortcuts, Wavefunction deep links and module rendering.

import { $, $$, storage, toast } from './dom.js';
import { store, subscribe, setTab, remeasure, replaceProject } from './store.js';
import { decodeProject } from '../engine/index.js';
import * as grid from './modules/grid.js';
import * as learn from './modules/learn.js';
import * as harmony from './modules/harmony.js';
import * as mixer from './modules/mixer.js';
import * as penta from './modules/penta.js';
import * as entangle from './modules/entangle.js';
import * as shapes from './modules/shapes.js';
import * as hardware from './modules/hardware.js';
import * as exporter from './modules/export.js';
import * as guide from './guide.js';

const MODULES = { grid, learn, harmony, mixer, penta, entangle, shapes, hardware, export: exporter };
const TAB_KEY = 'qontext-tab-v1';
const TABS = Object.keys(MODULES);

function safe(fn) {
  try {
    fn();
  } catch (e) {
    console.error(e);
    toast('Something went wrong. The rest of the studio still works.');
  }
}

function renderActive(kind) {
  safe(() => MODULES[store.tab].render(kind));
  safe(() => grid.renderBrand());
}

function showTab(name, { focus = false } = {}) {
  if (!TABS.includes(name)) name = 'grid';
  for (const t of $$('.tab')) {
    const on = t.dataset.tab === name;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    if (on && focus) t.focus();
    if (on) t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  for (const s of $$('main > section')) s.hidden = s.id !== `tab-${name}`;
  shapes.setVisible(name === 'shapes');
  if (name !== 'harmony') harmony.stop();
  storage.set(TAB_KEY, name);
  setTab(name);
}

function initTabs() {
  const tabs = $$('.tab');
  for (const t of tabs) t.addEventListener('click', () => showTab(t.dataset.tab));
  $('tabs').addEventListener('keydown', (e) => {
    const i = tabs.findIndex((t) => t.dataset.tab === store.tab);
    let next = null;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    if (next === null) return;
    e.preventDefault();
    showTab(tabs[next].dataset.tab, { focus: true });
  });
  for (const b of $$('[data-goto]')) {
    b.addEventListener('click', () => {
      showTab(b.dataset.goto, { focus: true });
      window.scrollTo({ top: 0 });
    });
  }
}

function initGlobal() {
  $('vision').addEventListener('change', (e) => {
    $('work').className = e.target.value === 'none' ? '' : `cvd-${e.target.value}`;
  });
  // Shortcuts: 1 to 9 open a room, T does the room's "Try this", Space measures again in Janus.
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const tag = (e.target && e.target.tagName ? e.target.tagName : '').toLowerCase();
    if (['input', 'textarea', 'select'].includes(tag) || (e.target && e.target.isContentEditable)) return;
    if (/^[1-9]$/.test(e.key)) {
      showTab(TABS[Number(e.key) - 1]);
      return;
    }
    if (e.key === 't' || e.key === 'T') {
      const go = document.querySelector('main > section:not([hidden]) [data-try]');
      if (go) go.click();
      return;
    }
    if (e.code !== 'Space' || store.tab !== 'grid' || ['button', 'canvas'].includes(tag)) return;
    e.preventDefault();
    remeasure();
  });
  window.addEventListener('error', (e) => console.error('Qontext error', e.error || e.message));
  window.addEventListener('unhandledrejection', (e) => console.error('Qontext rejection', e.reason));
}

function boot() {
  document.documentElement.lang = document.documentElement.lang || 'en';
  for (const m of Object.values(MODULES)) safe(() => m.init());
  safe(() => guide.init());
  initTabs();
  initGlobal();
  subscribe((kind) => {
    renderActive(kind);
    safe(() => guide.afterRender(kind));
  });
  const fromHash = (location.hash || '').replace('#', '');
  if (fromHash.startsWith('QX1.')) {
    // A Wavefunction from the site: open that exact world on Janus.
    try {
      replaceProject(decodeProject(fromHash));
      try {
        history.replaceState(null, '', location.pathname + location.search);
      } catch {
        /* sandboxed frames may refuse history changes */
      }
      showTab('grid');
      toast(`Opened ${store.project.name}`);
      return;
    } catch {
      toast('That Wavefunction could not be read');
    }
  }
  showTab(TABS.includes(fromHash) ? fromHash : storage.get(TAB_KEY, 'grid'));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
