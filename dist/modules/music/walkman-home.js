import { play as sound } from '../../sound.js?v=55';

// Home controller for the walkman: press the red PLAY key down (drag, or tap / Enter for an automatic press).
// Past the threshold the key latches, the motor starts — reels turning, the running light on, the VU needle lifting —
// and after a moment of music the room opens. Short of the threshold the key springs back.
// Same controller shape as the Life List panel and the typewriter: hold / release / auto / reset / on.
export const PRESS_DEPTH = 22, PRESS_THRESHOLD = .6, LATCHED = .72;
export const keyPress = dy => Math.max(0, Math.min(1, dy / PRESS_DEPTH));

export function createWalkman(cover, { reduced }) {
  const root = cover.querySelector('.wm');
  let press = 0, on = false, epoch = 0, frame = 0;
  const set = value => { press = value; root.style.setProperty('--play', value.toFixed(3)); };
  const wait = ms => new Promise(resolve => setTimeout(resolve, reduced() ? 0 : ms));

  function hold(dy) { if (!on) set(keyPress(dy)); }
  async function release() {
    if (on) return true;
    if (press >= PRESS_THRESHOLD) return run();
    set(0); return false;
  }
  async function auto() { return on || run(); }

  // The motor: reels turn (the take-up reel slower as its pack is larger), the needle rides the music.
  function motor() {
    const start = performance.now();
    const step = now => {
      const t = (now - start) / 1000, speed = Math.min(1, t * 3);
      root.style.setProperty('--spin-l', `${-t * 160 * speed}deg`);
      root.style.setProperty('--spin-r', `${-t * 220 * speed}deg`);
      const level = speed * (.55 + .25 * Math.sin(t * 9) + .15 * Math.sin(t * 23.7));
      root.style.setProperty('--vu', `${-38 + level * 58}deg`);
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  }
  async function run() {
    const token = ++epoch; on = true; set(1); sound('play');
    await wait(90); set(LATCHED);
    root.classList.add('is-running');
    if (!reduced()) motor();
    await wait(1100);
    return token === epoch;
  }
  function reset() {
    epoch++; on = false; cancelAnimationFrame(frame); set(0); root.classList.remove('is-running');
    for (const name of ['--spin-l', '--spin-r', '--vu']) root.style.removeProperty(name);
  }
  return { hold, release, auto, reset, get on() { return on; } };
}
