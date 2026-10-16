// Touch / mouse gestures on the battle canvas: tap = attack, swipe = skill.
// Keyboard for desktop testing: Space/J = attack, K/↑ = skill, 1-3 = switch.
const SWIPE_MIN_PX = 55;
const SWIPE_MAX_MS = 600;

export function bindBattleInput(canvas, getBattle) {
  let start = null;

  const down = e => {
    start = { x: e.clientX, y: e.clientY, t: performance.now() };
  };
  const up = e => {
    const b = getBattle();
    if (!start || !b) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y;
    const dist = Math.hypot(dx, dy), ms = performance.now() - start.t;
    start = null;
    if (dist >= SWIPE_MIN_PX && ms <= SWIPE_MAX_MS) {
      showSwipeTrail(e.clientX - dx, e.clientY - dy, e.clientX, e.clientY);
      b.skill();
    } else if (dist < SWIPE_MIN_PX) {
      const r = canvas.getBoundingClientRect();
      b.tap({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 });
    }
  };
  const key = e => {
    const b = getBattle();
    if (!b || e.repeat) return;
    if (e.code === 'Space' || e.code === 'KeyJ') { e.preventDefault(); b.tap(null); }
    else if (e.code === 'KeyK' || e.code === 'ArrowUp') b.skill();
    else if (/^Digit[1-3]$/.test(e.code)) b.switchTo(+e.code.slice(5) - 1);
  };

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', () => { start = null; });
  window.addEventListener('keydown', key);
}

function showSwipeTrail(x1, y1, x2, y2) {
  const el = document.createElement('div');
  el.className = 'swipe-trail';
  const len = Math.hypot(x2 - x1, y2 - y1);
  Object.assign(el.style, {
    left: `${x1}px`, top: `${y1}px`, width: `${len}px`,
    transform: `rotate(${Math.atan2(y2 - y1, x2 - x1)}rad)`,
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 350);
}
