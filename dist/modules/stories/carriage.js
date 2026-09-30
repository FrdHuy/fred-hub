import { play as sound } from '../../sound.js?v=41';

// The typewriter's moving parts, shared by the home object and the password screen.
// The carriage (platen, paper, knobs, bail) steps left one character per keystroke, so the typing point stays put while the
// line grows across the paper; RETURN throws it back to the right against its stop; the platen then feeds the paper.
export const STEP = 7.2;                 // one character of the 9u mono line, in u
const u = root => root.getBoundingClientRect().width / 440;

export function strike(root, char) {
  const key = root.querySelector(`[data-k="${CSS.escape(char)}"]`) ?? root.querySelector('[data-k=" "]');
  if (!key) return;
  key.classList.add('is-down'); setTimeout(() => key.classList.remove('is-down'), 110);
}

// Put the carriage at `steps` characters into the line (a quick ratchet step, like a real escapement).
export function setCarriage(root, steps, animate = true) {
  const carriage = root.querySelector('.tw-carriage');
  carriage.style.transition = animate ? 'transform .07s cubic-bezier(.2,.7,.3,1)' : 'none';
  root.style.setProperty('--carriage', String(-Math.min(steps, 22) * STEP));
}

// Put the carriage at an exact offset in u (for proportional text: the typed width so far).
export function setCarriageOffset(root, offset, animate = true) {
  const carriage = root.querySelector('.tw-carriage');
  carriage.style.transition = animate ? 'transform .07s cubic-bezier(.2,.7,.3,1)' : 'none';
  root.style.setProperty('--carriage', String(-Math.min(offset, 170)));
}
export const widthInU = (root, node) => { const range = document.createRange(); range.selectNodeContents(node); return range.getBoundingClientRect().width / u(root); };

// RETURN: bell, then the carriage slides right and hits its stop (a small bounce).
export async function carriageReturn(root, { reduced, bell = true }) {
  const carriage = root.querySelector('.tw-carriage');
  const from = parseFloat(getComputedStyle(root).getPropertyValue('--carriage')) || 0;
  if (bell) sound('bell');
  root.style.setProperty('--carriage', '0'); carriage.style.transition = 'none';
  if (reduced() || !from) return;
  sound('ret');
  const px = from * u(root);
  await carriage.animate([
    { transform: `translateX(${px}px)`, easing: 'cubic-bezier(.5,0,.75,.2)' },
    { transform: `translateX(${Math.abs(px) * .045}px)`, offset: .78, easing: 'cubic-bezier(.3,0,.4,1)' },
    { transform: 'translateX(0)' },
  ], { duration: 420 }).finished.catch(() => {});
}

// The sheet rises by `lines` line spaces (its foot stays in the platen), or — with `out` — rolls up and away.
export async function feed(root, { reduced, lines = 1, out = false }) {
  if (reduced()) return;
  const sheet = root.querySelector('.tw-sheet'), k = u(root), base = 172 * k;
  const from = parseFloat(sheet.dataset.fed || '0'), to = from + (out ? 190 : 14 * lines);
  const at = (d, extra = {}) => ({ transform: `translateY(${-d * k}px)`, height: `${base + d * k}px`, ...extra });
  sheet.dataset.fed = String(to);
  sheet.getAnimations().forEach(a => a.cancel());
  if (!out) sound('feed');
  const frames = out ? [at(from, { opacity: 1 }), at(to - 40, { opacity: 1, offset: .8 }), at(to, { opacity: 0 })] : [at(from), at(to)];
  await sheet.animate(frames, { duration: out ? 560 : 150 * lines, easing: out ? 'cubic-bezier(.4,0,.6,1)' : `steps(${lines * 2}, end)`, fill: 'forwards' }).finished.catch(() => {});
}

export function resetSheet(root) {
  const sheet = root.querySelector('.tw-sheet'); sheet.getAnimations().forEach(a => a.cancel()); sheet.style.removeProperty('transform'); sheet.style.removeProperty('height'); delete sheet.dataset.fed;
  const carriage = root.querySelector('.tw-carriage'); carriage.getAnimations().forEach(a => a.cancel()); carriage.style.transition = 'none'; root.style.setProperty('--carriage', '0');
}
