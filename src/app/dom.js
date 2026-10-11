// Small DOM helpers. No framework: every module renders into stable elements by id.

export const $ = (id) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
};

export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

let toastTimer = null;
export function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

export const reducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

export const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** localStorage that never throws (private windows, blocked storage, previews). */
export const storage = {
  get(key, fallback = null) {
    try {
      const v = window.localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  remove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
  },
};

/** Copies text inside a click handler; falls back to selecting the text in `el`. */
export async function copyText(text, el) {
  try {
    if (!navigator.clipboard) throw new Error('no clipboard');
    await navigator.clipboard.writeText(text);
    toast('Copied');
  } catch {
    if (el && typeof el.select === 'function') {
      el.focus();
      el.select();
      toast('Selected. Press copy on your keyboard.');
    } else {
      toast('Copy is blocked here. Select the text by hand.');
    }
  }
}

export function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** Sets aria-pressed on a group of toggle buttons. */
export function pressOne(buttons, active) {
  for (const b of buttons) b.setAttribute('aria-pressed', String(b === active));
}

export const sign = (v) => (v > 0 ? '+1' : '−1');
