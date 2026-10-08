import { play as sound } from '../../sound.js?v=52';
import { eggMarkup, random, pickKind } from './machine.js?v=52';

// Home controller for the gacha machine: hold anywhere on it and draw a circle round the crank, clockwise.
// The crank follows your hand; the ratchet clicks every 30°. One full turn and a capsule drops into the chute —
// then the room opens. Let go short of a turn and the crank springs back. Tap / Enter turns it for you.
// Same controller shape as the Life List panel and the typewriter: hold / release / auto / reset / on.
export const STEP = 30, FULL = 360;
// The angle turned since the last position, unwrapped into (-180°, 180°].
export function unwrap(delta) { let d = delta % 360; if (d > 180) d -= 360; if (d <= -180) d += 360; return d; }

export function createGacha(cover, { reduced }) {
  const root = cover.querySelector('.gc'), crank = root.querySelector('.gc-crank'), drop = root.querySelector('.gc-drop'), flap = root.querySelector('.gc-flap');
  let turn = 0, last = null, on = false, epoch = 0, running = null, frame = 0;
  const set = deg => { turn = deg; root.style.setProperty('--turn', `${deg.toFixed(1)}deg`); };
  const wait = ms => new Promise(resolve => setTimeout(resolve, reduced() ? 0 : ms));
  const angleOf = e => { const r = crank.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; };

  function hold(dy, e) {
    if (on || !e) return;
    const a = angleOf(e);
    if (last === null) { last = a; return; }
    // Clockwise on screen is a growing angle; the crank will not go back past its rest.
    const next = Math.max(0, Math.min(FULL, turn + unwrap(a - last))); last = a;
    if (Math.floor(next / STEP) > Math.floor(turn / STEP)) sound('tick');
    set(next);
    if (next >= FULL) running = run();
  }
  async function release() {
    last = null;
    if (running) return running;
    if (on) return true;
    if (turn >= FULL - 20) return (running = run());
    springBack(); return false;
  }
  function springBack() {
    const from = turn, start = performance.now();
    cancelAnimationFrame(frame);
    if (reduced() || !from) { set(0); return; }
    const step = now => { const k = Math.min(1, (now - start) / 380); set(from * (1 - k) ** 3); if (k < 1) frame = requestAnimationFrame(step); };
    frame = requestAnimationFrame(step);
  }
  // Tap / Enter: the crank is turned for you, one steady turn.
  async function auto() {
    if (on) return true;
    const token = ++epoch;
    if (!reduced()) {
      const start = performance.now(), from = turn;
      await new Promise(resolve => { const step = now => { const k = Math.min(1, (now - start) / 900), deg = from + (FULL - from) * (1 - (1 - k) ** 2); if (Math.floor(deg / STEP) > Math.floor(turn / STEP)) sound('tick'); set(deg); if (k < 1 && token === epoch) frame = requestAnimationFrame(step); else resolve(); }; frame = requestAnimationFrame(step); });
      if (token !== epoch) return false;
    }
    return run();
  }
  // A full turn: the crank clunks home, a capsule falls into the chute behind the flap and settles.
  async function run() {
    const token = ++epoch; on = true; set(FULL); sound('reading');
    const rnd = random(Date.now()), kind = pickKind(rnd);
    drop.innerHTML = eggMarkup(kind, { x: 42, y: 20, s: 34, r: Math.round((rnd() - .5) * 50) });
    const egg = drop.firstElementChild;
    if (!reduced()) {
      await wait(160); sound('roll');
      flap.animate([{ transform: 'none' }, { transform: 'perspective(200px) rotateX(-55deg)' }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.3,.7,.3,1)' });
      await egg.animate([{ translate: '0 -140%' }, { translate: '0 8%', offset: .7 }, { translate: '0 0' }], { duration: 520, easing: 'cubic-bezier(.5,0,.7,1)' }).finished.catch(() => {});
      await wait(380);
    }
    running = null;
    return token === epoch;
  }
  function reset() { epoch++; on = false; running = null; last = null; cancelAnimationFrame(frame); set(0); drop.innerHTML = ''; }
  return { hold, release, auto, reset, get on() { return on; } };
}
