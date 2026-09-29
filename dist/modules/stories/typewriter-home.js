import { play as sound } from '../../sound.js?v=33';

// Home controller for the typewriter: press the red RETURN key down (drag, or tap / Enter for an automatic press).
// Past the threshold the bell rings and the sheet feeds up out of the platen; short of it the key springs back.
export const PRESS_DEPTH = 26, PRESS_THRESHOLD = .62;
export const keyPress = dy => Math.max(0, Math.min(1, dy / PRESS_DEPTH));

export function createTypewriter(cover, { reduced }) {
  const root = cover.querySelector('.tw'), sheet = root.querySelector('.tw-sheet');
  let press = 0, on = false, epoch = 0, feed = null;
  const set = value => { press = value; root.style.setProperty('--press', value.toFixed(3)); };
  const wait = ms => new Promise(resolve => setTimeout(resolve, reduced() ? 0 : ms));

  function hold(dy) { if (!on) set(keyPress(dy)); }
  async function release() {
    if (on) return true;
    if (press >= PRESS_THRESHOLD) return carriageReturn();
    root.style.setProperty('--press', '0'); press = 0; return false;
  }
  async function auto() {
    if (on) return true;
    set(1); sound('key'); await wait(120);
    return carriageReturn();
  }
  // Ding, two line feeds, then the sheet rolls up and out.
  async function carriageReturn() {
    const run = ++epoch; on = true; set(1);
    sound('bell');
    await wait(90); set(0);
    if (!reduced()) {
      const u = root.getBoundingClientRect().width / 440, height = sheet.offsetHeight;
      sound('feed');
      feed = sheet.animate([
        { transform: 'translateY(0)', height: `${height}px` },
        { transform: `translateY(${-14 * u}px)`, height: `${height + 14 * u}px`, offset: .18 },
        { transform: `translateY(${-28 * u}px)`, height: `${height + 28 * u}px`, offset: .36 },
        { transform: `translateY(${-150 * u}px)`, height: `${height + 150 * u}px`, opacity: 1, offset: .85 },
        { transform: `translateY(${-190 * u}px)`, height: `${height + 190 * u}px`, opacity: 0 },
      ], { duration: 760, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' });
      await feed.finished.catch(() => {});
    }
    return run === epoch;
  }
  function reset() { epoch++; on = false; feed?.cancel(); feed = null; set(0); }
  return { hold, release, auto, reset, get on() { return on; } };
}
