// One scroll loop for every scroll-driven exhibit. Only exhibits near the viewport are measured, all reads
// happen before any writes (no layout thrash), and nothing runs while the page is still.
//
// Progress is 0 when an element's top meets the bottom of the viewport and 1 when its bottom leaves the top.

const items = [];
let scheduled = false;

function tick() {
  scheduled = false;
  const vh = window.innerHeight || 800;
  const due = [];
  for (const it of items) {
    if (!it.near) continue;
    const r = it.el.getBoundingClientRect();
    due.push([it, Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height)))]);
  }
  for (const [it, p] of due) {
    try {
      it.fn(p);
    } catch (e) {
      console.error(e);
    }
  }
}

function schedule() {
  if (!scheduled) {
    scheduled = true;
    requestAnimationFrame(tick);
  }
}

const io =
  typeof IntersectionObserver === 'function'
    ? new IntersectionObserver((entries) => {
        for (const e of entries) {
          const it = items.find((x) => x.el === e.target);
          if (it) it.near = e.isIntersecting;
        }
        schedule();
      }, { rootMargin: '100px 0px' })
    : null;

/** Calls fn(progress) on every frame the page scrolls while `el` is near the viewport. */
export function onScroll(el, fn) {
  const it = { el, fn, near: !io };
  items.push(it);
  if (io) io.observe(el);
  schedule();
}

window.addEventListener('scroll', schedule, { passive: true });
window.addEventListener('resize', schedule);
