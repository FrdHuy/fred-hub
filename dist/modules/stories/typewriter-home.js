import { play as sound } from '../../sound.js?v=33';
import { strike, setCarriage, carriageReturn, feed, resetSheet } from './carriage.js?v=33';

// Home controller for the typewriter: press the red RETURN key down (drag, or tap / Enter for an automatic press).
// Past the threshold the machine finishes its line — R·E·A·D·␣·O·N, the carriage stepping left with each strike — the bell rings,
// the carriage is thrown back to the right against its stop, the platen feeds two lines and the sheet rolls out.
// Short of the threshold the key springs back.
export const PRESS_DEPTH = 26, PRESS_THRESHOLD = .62;
export const keyPress = dy => Math.max(0, Math.min(1, dy / PRESS_DEPTH));

export function createTypewriter(cover, { reduced }) {
  const root = cover.querySelector('.tw'), line = root.querySelector('.tw-line');
  let press = 0, on = false, epoch = 0;
  const set = value => { press = value; root.style.setProperty('--press', value.toFixed(3)); };
  const wait = ms => new Promise(resolve => setTimeout(resolve, reduced() ? 0 : ms));

  function hold(dy) { if (!on) set(keyPress(dy)); }
  async function release() {
    if (on) return true;
    if (press >= PRESS_THRESHOLD) return run();
    set(0); return false;
  }
  async function auto() { return on || run(); }

  async function run() {
    const token = ++epoch; on = true; set(1); sound('key');
    await wait(90); set(0);
    if (!reduced()) {
      // The end of the line: seven strikes, the carriage ratcheting left one character each.
      line.textContent = '';
      for (const [i, char] of [...'read on'].entries()) {
        if (token !== epoch) return false;
        strike(root, char); sound('type'); line.textContent += char.toUpperCase(); setCarriage(root, i + 1);
        await wait(78);
      }
      await wait(60);
      await carriageReturn(root, { reduced }); if (token !== epoch) return false;
      await feed(root, { reduced, lines: 2 }); if (token !== epoch) return false;
      await feed(root, { reduced, out: true });
    }
    return token === epoch;
  }
  function reset() { epoch++; on = false; set(0); resetSheet(root); line.textContent = ''; }
  return { hold, release, auto, reset, get on() { return on; } };
}
