// Guide dialog + gesture hints used by the tutorial.
const box = () => document.getElementById('dialog');
const hint = () => document.getElementById('gestureHint');

// Shows a line. If `next` is true, resolves when the player taps NEXT;
// otherwise the line stays up (resolves immediately) until replaced.
export function say(text, { next = false, title = 'GUIDE' } = {}) {
  const el = box();
  el.hidden = false;
  el.querySelector('.dlg-tag').textContent = title;
  el.querySelector('.dlg-text').innerHTML = text;
  const btn = el.querySelector('.dlg-next');
  btn.hidden = !next;
  el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
  if (!next) return Promise.resolve();
  return new Promise(resolve => {
    btn.onclick = e => { e.stopPropagation(); btn.onclick = null; resolve(); };
  });
}

export function hideDialog() { box().hidden = true; }

// kind: 'tap' | 'swipe' | null
export function gesture(kind) {
  const el = hint();
  el.hidden = !kind;
  el.className = kind ? `gesture-${kind}` : '';
}

export function highlight(selector, on = true) {
  document.querySelectorAll('.tut-highlight').forEach(e => e.classList.remove('tut-highlight'));
  if (on && selector) document.querySelectorAll(selector).forEach(e => e.classList.add('tut-highlight'));
}
