import { parseItems } from './items.js?v=44';
import { play as sound } from '../../sound.js?v=44';
import { lampStates, litCount, leverPosition, LEVER_THRESHOLD, pad, SLOTS } from './panel.js?v=44';

// Home controller: drag the lever up past its threshold (or tap) → self-test → lamps settle on real progress.
export function createPanel(cover, { reduced }) {
  const root = cover.querySelector('.panel'), lamps = [...root.querySelectorAll('.lamp')], digits = root.querySelector('.panel-lcd .digits');
  let states = null, epoch = 0, on = false, lever = 0;
  const timers = new Set(), frames = new Set();
  const wait = ms => new Promise(resolve => { const id = setTimeout(() => { timers.delete(id); resolve(); }, reduced() ? 0 : ms); timers.add(id); });
  const loading = import(`./data.js?t=${Date.now()}`).then(module => parseItems(module.default).items, () => []).then(items => {
    const now = new Date().getFullYear();
    states = lampStates(items, now, now);
    lamps.forEach((lamp, i) => lamp.classList.toggle('is-empty', states[i] === 'empty'));
  });

  function setLever(value, snap = 0) {
    lever = value;
    root.style.setProperty('--lever-t', `${snap}s`);
    root.style.setProperty('--lever', value.toFixed(3));
  }
  // While held: the lever follows the finger, with a little stiffness near the top.
  function hold(dy) {
    if (on) return;
    const position = leverPosition(dy);
    setLever(position < LEVER_THRESHOLD ? position : LEVER_THRESHOLD + (position - LEVER_THRESHOLD) * .45);
  }
  async function release() {
    if (on) return true;
    if (lever >= LEVER_THRESHOLD * .98) return powerOn();
    setLever(0, .45); return false;
  }
  // Tap / Enter: the lever is thrown for you.
  async function auto() {
    if (on) return true;
    setLever(1, .22); await wait(200);
    return powerOn();
  }

  function count(to, duration) {
    return new Promise(resolve => {
      if (reduced() || !to) { digits.textContent = `${pad(to)}/${SLOTS}`; resolve(); return; }
      const start = performance.now();
      const step = time => {
        const t = Math.min(1, (time - start) / duration), eased = 1 - (1 - t) ** 3;
        digits.textContent = `${pad(Math.round(to * eased))}/${SLOTS}`;
        if (t < 1) { const id = requestAnimationFrame(step); frames.add(id); } else resolve();
      };
      frames.add(requestAnimationFrame(step));
    });
  }

  async function powerOn() {
    const run = epoch;
    on = true; setLever(1, .12); sound('lever');
    root.dataset.power = 'on'; root.classList.add('is-testing');
    digits.textContent = 'TEST';
    await loading; if (run !== epoch) return false;
    // Self-test: every written lamp flashes in reading order, then settles on its real state.
    await wait(560 + Math.min(states.filter(state => state !== 'empty').length, 60) * 7); if (run !== epoch) return false;
    root.classList.remove('is-testing');
    lamps.forEach((lamp, i) => { lamp.classList.toggle('is-done', states[i] === 'done'); lamp.classList.toggle('is-todo', states[i] === 'todo'); lamp.classList.toggle('is-mark', states[i] === 'mark'); });
    await count(litCount(states), 650); if (run !== epoch) return false;
    await wait(260);
    return run === epoch;
  }

  function reset() {
    epoch++; on = false;
    timers.forEach(clearTimeout); timers.clear(); frames.forEach(cancelAnimationFrame); frames.clear();
    root.dataset.power = 'off'; root.classList.remove('is-testing');
    lamps.forEach(lamp => lamp.classList.remove('is-done', 'is-todo', 'is-mark'));
    digits.textContent = ''; setLever(0);
  }
  return { hold, release, auto, reset, get on() { return on; } };
}
