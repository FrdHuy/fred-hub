import { play as sound } from '../../sound.js?v=37';
import { strike, setCarriageOffset, widthInU, carriageReturn, feed, resetSheet } from './carriage.js?v=37';

// Home controller for the typewriter: press the red RETURN key down (drag, or tap / Enter for an automatic press).
// Past the threshold the machine types the latest note's title onto the blank sheet — the carriage stepping left by each
// glyph's real width, so the typing point stays put — the bell rings, the carriage is thrown back to the right against its
// stop, the platen feeds two lines and the sheet rolls out: the page it just typed is handed to you.
// Short of the threshold the key springs back.
export const PRESS_DEPTH = 26, PRESS_THRESHOLD = .62;
export const keyPress = dy => Math.max(0, Math.min(1, dy / PRESS_DEPTH));

export function createTypewriter(cover, { reduced }) {
  const root = cover.querySelector('.tw'), title = root.querySelector('.tw-sheet b'), text = [...(root.dataset.ink || 'Fred')].slice(0, 16);
  const ink = title.firstChild?.nodeType === Node.TEXT_NODE ? title.firstChild : title.insertBefore(document.createTextNode(''), title.firstChild);
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
      // Typing: an uneven human rhythm; letters strike their own key, Chinese characters a random one.
      ink.data = '';
      const keys = 'asdfghjklqwertyuiopzxcvbnm';
      for (const char of text) {
        if (token !== epoch) return false;
        const key = /[a-z]/i.test(char) ? char.toLowerCase() : char === ' ' ? ' ' : keys[Math.floor(Math.random() * keys.length)];
        strike(root, key); sound('type'); ink.data += char; setCarriageOffset(root, widthInU(root, ink));
        await wait(70 + Math.random() * 60);
      }
      await wait(60);
      await carriageReturn(root, { reduced }); if (token !== epoch) return false;
      await feed(root, { reduced, lines: 2 }); if (token !== epoch) return false;
      await feed(root, { reduced, out: true });
    }
    return token === epoch;
  }
  function reset() { epoch++; on = false; set(0); resetSheet(root); ink.data = ''; }
  return { hold, release, auto, reset, get on() { return on; } };
}
