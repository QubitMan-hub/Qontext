// Small helpers shared by the site modules. Nothing here touches the world or the engine.

import { inkFor } from '../engine/index.js';

/** 1234567 -> "1,234,567" without Intl (Intl's first call is slow on phones). */
export const fmtInt = (n) => String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const sgn = (v) => (v > 0 ? '+1' : '−1');

/** Readable ink for text on a color from the engine (whichever of Bouncer's two inks reads better). */
export const inkOn = (col) => inkFor(col.hex);

export const reduced = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

/**
 * Runs `fn` once, the first time `el` comes within `margin` of the viewport. This is how every room and
 * heavy feature stays asleep until a visitor is about to see it.
 */
export function whenNear(el, fn, margin = '800px 0px', threshold = 0) {
  if (typeof IntersectionObserver !== 'function') {
    fn();
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        fn();
      }
    },
    { rootMargin: margin, threshold },
  );
  io.observe(el);
}

/** Calls `fn(visible)` whenever `el` enters or leaves the viewport (plus margin). */
export function onVisible(el, fn, margin = '0px') {
  if (typeof IntersectionObserver !== 'function') {
    fn(true);
    return;
  }
  new IntersectionObserver((entries) => fn(entries[entries.length - 1].isIntersecting), { rootMargin: margin }).observe(el);
}

function fill(el, attrs, children) {
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'style' && typeof v === 'object') {
      // CSSOM, not a style attribute: works under a strict Content Security Policy.
      for (const [p, val] of Object.entries(v)) {
        if (p.startsWith('--')) el.style.setProperty(p, String(val));
        else el.style[p] = val;
      }
    } else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/**
 * Builds an element safely: text becomes text nodes, never markup, so nothing a visitor or a file supplies
 * can turn into HTML. h('span', { class: 'x', style: { background: hex, '--i': 2 } }, 'text', childNode)
 */
export const h = (tag, attrs = {}, ...children) => fill(document.createElement(tag), attrs, children);

/** The same for SVG elements. */
export const svg = (tag, attrs = {}, ...children) => fill(document.createElementNS('http://www.w3.org/2000/svg', tag), attrs, children);

/** Collapses bursts of calls into one per animation frame. */
export function perFrame(fn) {
  let queued = false;
  return () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      fn();
    });
  };
}
