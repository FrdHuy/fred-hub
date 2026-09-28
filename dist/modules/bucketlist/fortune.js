import { parseItems } from './items.js?v=27';

const DIGITS = '零一二三四五六七八九';
export function chineseNumber(n) {
  if (n < 10) return DIGITS[n];
  if (n < 100) { const tens = Math.floor(n / 10), ones = n % 10; return `${tens > 1 ? DIGITS[tens] : ''}十${ones ? DIGITS[ones] : ''}`; }
  return String(n);
}

// A shake is a change of direction after travelling at least `reach` px.
export function shakeMeter(reach = 14) {
  let anchor = null, direction = 0, peak = 0;
  return y => {
    if (anchor === null) { anchor = peak = y; return false; }
    const step = Math.sign(y - peak);
    if (!step) return false;
    if (!direction || step === direction) { if (!direction && Math.abs(y - anchor) >= 2) direction = step; peak = y; return false; }
    const shook = Math.abs(peak - anchor) >= reach;
    anchor = peak; peak = y; direction = step;
    return shook;
  };
}

export function pickIndex(count, last, random = Math.random) {
  if (count < 2) return 0;
  const index = Math.floor(random() * (count - 1));
  return index >= last && last >= 0 ? index + 1 : index;
}

export const SHAKES = 4;

// Home-page controller: shaking, rising stick, drop and collect. The DOM is the cover from cover.js.
export function createFortune(cover, { reduced }) {
  const root = cover.querySelector('.fortune'), body = root.querySelector('.fortune-body');
  const sticks = [...root.querySelectorAll('.fortune-stick')], drop = root.querySelector('.fortune-drop');
  const running = new Set();
  const play = (element, frames, options) => {
    if (reduced()) return Promise.resolve();
    const animation = element.animate(frames, options); running.add(animation);
    return animation.finished.catch(() => {}).finally(() => running.delete(animation));
  };
  let items = null, last = -1, chosen = -1, shakes = 0, meter = null, drawn = false, lean = 0, epoch = 0;
  const loading = import(`./data.js?t=${Date.now()}`).then(module => { items = parseItems(module.default).items; }, () => { items = []; });
  const stick = () => sticks[chosen % sticks.length];

  function rise() {
    const target = stick(); if (!target) return;
    target.style.setProperty('--rise', String(Math.min(shakes, SHAKES) / SHAKES));
  }
  function rattle() {
    sticks.forEach((element, i) => {
      if (element === stick()) return;
      const hop = 2 + ((i * 7 + shakes * 5) % 9);
      play(element, [{ translate: '0 0' }, { translate: `0 -${hop}%` }, { translate: '0 0' }], { duration: 180 + (i % 3) * 40, easing: 'cubic-bezier(.3,.8,.4,1)' });
    });
  }
  function begin() {
    collect();
    const count = items?.length || 1;
    chosen = pickIndex(count, last); shakes = 0; meter = shakeMeter();
    root.classList.add('is-shaking');
  }
  function hit() {
    shakes++; rattle(); rise();
    return shakes >= SHAKES;
  }

  // Finger / mouse: dy is the vertical offset since the press.
  function hold(dy) {
    if (!meter) begin();
    lean = Math.max(-34, Math.min(34, dy * .8));
    body.style.translate = `0 ${lean}px`; body.style.rotate = `${-10 + lean * .12}deg`;
    if (meter(dy) && hit()) return true;
    return false;
  }
  async function letGo() {
    root.classList.remove('is-shaking'); meter = null;
    const from = body.style.translate || '0 0';
    body.style.translate = ''; body.style.rotate = '';
    play(body, [{ translate: from }, { translate: '0 0' }], { duration: 420, easing: 'cubic-bezier(.3,1.4,.5,1)' });
    if (shakes >= SHAKES) return reveal();
    stick()?.style.setProperty('--rise', '0'); shakes = 0; return false;
  }

  // Tap or keyboard: three hands-free shakes, then the stick falls.
  async function auto() {
    const run = epoch; await loading; if (run !== epoch) return false; begin();
    for (let i = 0; i < SHAKES; i++) {
      await play(body, [{ translate: '0 0', rotate: '-10deg' }, { translate: '0 -18px', rotate: '-13deg' }, { translate: '0 10px', rotate: '-8deg' }, { translate: '0 0', rotate: '-10deg' }], { duration: 260, easing: 'ease-in-out' });
      if (run !== epoch) return false;
      hit();
    }
    root.classList.remove('is-shaking'); meter = null;
    return reveal();
  }

  // One real shake of the phone.
  async function nudge() {
    if (drawn && !meter) collect();
    if (!meter) begin();
    play(body, [{ translate: '0 0', rotate: '-10deg' }, { translate: '0 -14px', rotate: '-12deg' }, { translate: '0 0', rotate: '-10deg' }], { duration: 220, easing: 'ease-out' });
    if (!hit()) return false;
    root.classList.remove('is-shaking'); meter = null;
    return reveal();
  }

  async function reveal() {
    const run = epoch; await loading; if (run !== epoch) return false;
    const list = items || [];
    if (chosen >= list.length && list.length) chosen = pickIndex(list.length, last);
    const entry = list[chosen];
    drop.querySelector('b').textContent = entry ? `Nº ${String(chosen + 1).padStart(2, '0')}` : 'Nº 00';
    drop.querySelector('span').textContent = entry ? entry.text : '尚未落笔';
    drop.querySelector('em').textContent = entry?.done ? '已成' : '';
    drop.classList.toggle('is-done', !!entry?.done);
    const source = stick(); source?.classList.add('is-out');
    drop.hidden = false; drawn = true; last = chosen;
    // Leaves the mouth upward, tumbles over the rim and settles on the floor in front of the tube.
    await play(drop, [
      { opacity: 0, transform: 'translate(-6%, -150%) rotate(-84deg) scale(.9)' },
      { opacity: 1, transform: 'translate(-2%, -190%) rotate(-62deg) scale(.95)', offset: .28 },
      { transform: 'translate(3%, 12%) rotate(-3deg)', offset: .72 },
      { transform: 'translate(2%, -9%) rotate(-7deg)', offset: .84 },
      { opacity: 1, transform: 'translate(2%, 0) rotate(-6deg)' },
    ], { duration: 950, easing: 'cubic-bezier(.35,.1,.3,1)' });
    return run === epoch;
  }

  function collect() {
    if (!drawn) return;
    drawn = false; drop.hidden = true;
    sticks.forEach(element => { element.classList.remove('is-out'); element.style.setProperty('--rise', '0'); });
  }
  function reset() {
    epoch++;
    running.forEach(animation => animation.cancel()); running.clear();
    root.classList.remove('is-shaking'); meter = null; shakes = 0;
    body.style.translate = ''; body.style.rotate = '';
    collect();
  }
  return { hold, letGo, auto, nudge, reset, collect, get drawn() { return drawn; }, get drop() { return drop; }, loading };
}

// Phone shake (devicemotion). iOS asks for permission, which must come from a tap.
export async function allowMotion() {
  const request = globalThis.DeviceMotionEvent?.requestPermission;
  if (typeof request !== 'function') return !!globalThis.DeviceMotionEvent;
  try { return (await request.call(DeviceMotionEvent)) === 'granted'; } catch { return false; }
}
export function watchMotion(onShake, signal) {
  let lastPeak = 0, count = 0;
  addEventListener('devicemotion', e => {
    const a = e.acceleration || e.accelerationIncludingGravity; if (!a) return;
    const force = Math.hypot(a.x || 0, a.y || 0, a.z || 0) - (e.acceleration ? 0 : 9.8);
    const now = performance.now();
    if (force > 11 && now - lastPeak > 140) { lastPeak = now; count++; onShake(count); }
    if (now - lastPeak > 1200) count = 0;
  }, { signal });
}
