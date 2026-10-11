// One scroll loop for every scroll-driven exhibit. Progress is 0 when an element's top meets the bottom of
// the viewport and 1 when its bottom leaves the top.

const items = [];
let scheduled = false;

function tick() {
  scheduled = false;
  const vh = window.innerHeight || 800;
  for (const it of items) {
    const r = it.el.getBoundingClientRect();
    if (r.bottom < -50 || r.top > vh + 50) continue;
    const p = Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height)));
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

export function onScroll(el, fn) {
  items.push({ el, fn });
  schedule();
}

window.addEventListener('scroll', schedule, { passive: true });
window.addEventListener('resize', schedule);
