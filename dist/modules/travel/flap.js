import { flipPath } from './trips.js?v=32';
import { play as sound } from '../../sound.js?v=32';

// A row of split-flap cells. Each cell: fixed top/bottom halves plus two leaves that fall over the split.
const STEP = 72;
const glyph = c => c === ' ' ? ' ' : c;
function half(className) { const element = document.createElement('span'); element.className = `tv-h ${className}`; element.append(document.createElement('i')); return element; }
function paint(element, c) { element.firstChild.textContent = glyph(c); element.classList.toggle('is-blank', c === ' '); }
const wait = (ms, signal) => new Promise(resolve => { if (ms <= 0 || signal.aborted) return resolve(); const id = setTimeout(resolve, ms); signal.addEventListener('abort', () => { clearTimeout(id); resolve(); }, { once: true }); });

export function createWord(length, size, { signal, reduced }) {
  const el = document.createElement('span'); el.className = `tv-w tv-${size}`; el.setAttribute('aria-hidden', 'true');
  const cells = Array.from({ length }, () => {
    const cell = document.createElement('span'); cell.className = 'tv-f';
    const top = half('tv-t'), bottom = half('tv-b'), fall = half('tv-t tv-leaf'), rise = half('tv-b tv-leaf');
    cell.append(top, bottom, fall, rise); el.append(cell);
    const state = { cell, top, bottom, fall, rise, c: ' ', run: 0 };
    [top, bottom, fall, rise].forEach(part => paint(part, ' '));
    return state;
  });

  async function flip(state, to) {
    const { top, bottom, fall, rise } = state, from = state.c;
    paint(top, to); paint(bottom, from); paint(fall, from); paint(rise, to);
    fall.hidden = rise.hidden = false;
    sound('flap');
    const falling = fall.animate([{ transform: 'rotateX(0)', filter: 'brightness(1)' }, { transform: 'rotateX(-90deg)', filter: 'brightness(.55)' }], { duration: STEP / 2, easing: 'ease-in', fill: 'forwards' });
    const rising = rise.animate([{ transform: 'rotateX(90deg)', filter: 'brightness(1.5)' }, { transform: 'rotateX(0)', filter: 'brightness(1)' }], { duration: STEP / 2, delay: STEP / 2, easing: 'ease-out', fill: 'both' });
    await rising.finished.catch(() => {});
    paint(bottom, to); falling.cancel(); rising.cancel(); fall.hidden = rise.hidden = true; state.c = to;
  }

  function land(state, to) { [state.top, state.bottom].forEach(part => paint(part, to)); state.fall.hidden = state.rise.hidden = true; state.c = to; }

  // Turn every cell to `text` (padded with blanks). Cells start one after another, then each runs through a few flaps.
  async function set(text, { delay = 0, stagger = 32, steps = [2, 6] } = {}) {
    const chars = [...String(text).padEnd(length).slice(0, length)];
    await Promise.all(cells.map(async (state, index) => {
      const run = ++state.run, to = chars[index];
      if (reduced() || signal.aborted) return land(state, to);
      await wait(delay + index * stagger, signal);
      await state.busy; // an earlier run finishes its current flap first
      if (run !== state.run || state.c === to) return;
      const path = flipPath(state.c, to, steps[0] + Math.floor(Math.random() * (steps[1] - steps[0] + 1)));
      for (const c of path) { if (run !== state.run || signal.aborted) return; state.busy = flip(state, c); await state.busy; }
    }));
  }
  cells.forEach(state => { state.fall.hidden = state.rise.hidden = true; });
  return { el, set, get text() { return cells.map(state => state.c).join('').trimEnd(); } };
}
