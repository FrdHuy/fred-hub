import data from './data.js?v=56';
import { parseTapes, runtime, sideLength, offsetOf, locate, counter, clock } from './tapes.js?v=56';
import { walkmanMarkup, cassetteMarkup } from './walkman.js?v=56';
import { createDeck } from './deck.js?v=56';
import { collectionPath } from '../../router.js';
import { play as sound } from '../../sound.js?v=56';

const esc = text => String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pad2 = n => String(n).padStart(2, '0');
const LINK = '<svg viewBox="0 0 12 12"><path d="M4.5 2.5h5v5M9.5 2.5 3 9"/></svg>';
const SECONDS_PER_TURN = 6;   // turning a reel by hand one full turn moves the tape this far

// 磁带: the walkman on the desk, the J-card of the tape inside, and the tapes lying below.
// Drag a tape (or tap it) into the walkman; PLAY / STOP·EJECT / REW / FF are real keys; turn a reel by hand to wind;
// tap the tape in the window to turn it over. A side ends with the PLAY key springing up.
export function mount({ container, route }) {
  const events = new AbortController(), { signal } = events;
  const motion = matchMedia('(prefers-reduced-motion: reduce)'), reduced = () => motion.matches;
  const tapes = parseTapes(data);
  const deck = createDeck();
  let tape = null, side = 'a', index = 0, playing = false, busy = false, winding = 0;
  let spinL = 0, spinR = 0, vu = -38, frame = 0, last = 0;

  const room = document.createElement('section'); room.className = 'mx'; room.lang = 'zh-CN';
  room.innerHTML = `<h1 class="mx-sr">磁带</h1>
<div class="mx-stage"><div class="mx-deck">${walkmanMarkup()}</div><aside class="mx-jcard" aria-live="polite"></aside></div>
<ol class="mx-shelf">${tapes.map(t => `<li><button class="mx-tape" type="button" data-id="${esc(t.id)}" aria-label="${esc(t.title)}">${cassetteMarkup(t)}</button></li>`).join('')}</ol>`;
  container.append(room);
  const wm = room.querySelector('.wm'), glass = wm.querySelector('.wm-glass'), jcard = room.querySelector('.mx-jcard');
  const drums = [...wm.querySelectorAll('.wm-count i')];

  const tracks = () => tape ? tape[side] : [];
  const elapsed = () => tape ? offsetOf(tracks(), index) + (deck.audio.currentTime || 0) : 0;
  const setKey = (name, value) => wm.style.setProperty(`--${name}`, value);

  // ——— The J-card: the tape's title, its side, the tracks; the playing one is marked ———
  function card() {
    if (!tape) { jcard.innerHTML = '<p class="mx-idle"><svg viewBox="0 0 40 26"><rect x="1" y="1" width="38" height="24" rx="2.5"/><circle cx="13" cy="13" r="3.5"/><circle cx="27" cy="13" r="3.5"/></svg></p>'; return; }
    const list = tracks();
    jcard.innerHTML = `<div class="mx-jhead" data-color="${tape.color}"><i></i><b>${esc(tape.title)}</b><button class="mx-side" type="button" data-flip aria-label="翻面"><span${side === 'a' ? ' class="on"' : ''}>A</span><span${side === 'b' ? ' class="on"' : ''}>B</span></button></div>
<ol class="mx-tracks">${list.map((t, i) => `<li${i === index ? ' class="is-now"' : ''}><button type="button" data-track="${i}"><span class="mx-n">${pad2(i + 1)}</span><span class="mx-t">${esc(t.title)}<small>${esc(t.artist)}</small></span><span class="mx-len">${clock(runtime(t))}</span></button>${t.link ? `<a href="${esc(t.link)}" target="_blank" rel="noopener" aria-label="在 Apple Music 打开">${LINK}</a>` : ''}</li>`).join('')}</ol>
<p class="mx-foot"><span>${clock(sideLength(list))}</span><span>${tape.note ? esc(tape.note) : ''}</span></p>`;
  }
  function mark() { jcard.querySelectorAll('.mx-tracks li').forEach((li, i) => li.classList.toggle('is-now', i === index)); }

  // ——— The motor: reels, tape packs, counter, the VU needle ———
  function draw(now) {
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
    const total = tape ? sideLength(tracks()) || 1 : 1, done = Math.min(1, elapsed() / total);
    // The supply reel empties as the take-up reel fills; the smaller pack turns faster.
    const packL = tape ? 1 - done : .5, packR = tape ? done : .5;
    const speed = winding ? winding * 900 : playing ? 110 : 0;
    spinL -= speed * dt / (.5 + packL * .9); spinR -= speed * dt / (.5 + packR * .9);
    const level = playing ? deck.level() : 0;
    vu += ((-38 + level * 70) - vu) * Math.min(1, dt * (level > (vu + 38) / 70 ? 22 : 7));
    wm.style.setProperty('--spin-l', `${spinL.toFixed(1)}deg`); wm.style.setProperty('--spin-r', `${spinR.toFixed(1)}deg`);
    wm.style.setProperty('--pack-l', packL.toFixed(3)); wm.style.setProperty('--pack-r', packR.toFixed(3));
    wm.style.setProperty('--vu', `${vu.toFixed(1)}deg`);
    const digits = counter(elapsed()); drums.forEach((drum, i) => { if (drum.textContent !== digits[i]) drum.textContent = digits[i]; });
    frame = requestAnimationFrame(draw);
  }
  frame = requestAnimationFrame(draw);

  // ——— Transport ———
  async function play() {
    if (!tape || playing || busy) return;
    const list = tracks(); if (!list.length) return;
    deck.load(list[index], deck.audio.currentTime || 0);
    playing = true; setKey('play', .72); wm.classList.add('is-running'); sound('play');
    try { await deck.play({ reduced: reduced() }); } catch { playing = false; setKey('play', 0); wm.classList.remove('is-running'); }
  }
  async function stop({ halt = false } = {}) {
    if (!playing) return;
    playing = false; setKey('play', 0); wm.classList.remove('is-running'); sound(halt ? 'halt' : 'key');
    await deck.stop({ reduced: reduced() });
  }
  // Wind to another track: the reels race, then the tape settles at the start of it.
  async function wind(to, { resume = playing } = {}) {
    const list = tracks(); if (!tape || !list.length || busy) return;
    const target = Math.max(0, Math.min(list.length - 1, to)); busy = true;
    if (playing) { playing = false; wm.classList.remove('is-running'); await deck.stop({ reduced: reduced(), wind: false }); }
    const dir = target >= index ? 1 : -1;
    winding = dir; sound('wind');
    await new Promise(resolve => setTimeout(resolve, reduced() ? 0 : 480));
    winding = 0; index = target; deck.load(list[index], 0); mark(); busy = false;
    if (resume) { setKey('play', 0); await play(); } else setKey('play', 0);
  }
  deck.audio.addEventListener('ended', () => {
    if (!playing) return;
    if (index < tracks().length - 1) { index++; deck.load(tracks()[index], 0); mark(); deck.play({ reduced: true }).catch(() => {}); }
    else { stop({ halt: true }); index = 0; deck.load(tracks()[0], 0); mark(); }   // end of the side: the key springs up
  }, { signal });
  // A preview is 30 s even when its file is longer: stop it there so the tape counter stays true.
  deck.audio.addEventListener('timeupdate', () => {
    const t = tracks()[index]; if (t && !t.audio && deck.audio.currentTime >= runtime(t)) deck.audio.dispatchEvent(new Event('ended'));
  }, { signal });

  // ——— Tapes: in and out of the walkman ———
  function seat(next, nextSide = 'a') {
    tape = next; side = nextSide; index = 0;
    glass.innerHTML = cassetteMarkup({ ...tape, side });
    deck.load(tracks()[0], 0);
    room.querySelectorAll('.mx-tape').forEach(b => b.classList.toggle('is-out', b.dataset.id === tape.id));
    card(); sound('clack');
    if (!reduced()) glass.firstElementChild.animate([{ transform: 'translateY(-14%) scale(.96)', opacity: .4 }, { transform: 'none', opacity: 1 }], { duration: 240, easing: 'cubic-bezier(.3,.8,.3,1)' });
  }
  // The cassette flies from where it lay on the desk into the window (and the one inside goes back to its place).
  async function insert(id, from) {
    const next = tapes.find(t => t.id === id); if (!next || busy || next === tape) return;
    busy = true; await stop();
    if (!reduced() && from) {
      const to = glass.getBoundingClientRect(), ghost = document.createElement('div');
      ghost.className = 'mx-ghost'; ghost.innerHTML = cassetteMarkup(next);
      Object.assign(ghost.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
      document.body.append(ghost);
      const dx = to.left + 14 - from.left, dy = to.top + 12 - from.top, k = (to.width - 28) / from.width;
      await ghost.animate([{ transform: 'none' }, { transform: `translate(${dx}px,${dy - 30}px) scale(${k})`, offset: .75 }, { transform: `translate(${dx}px,${dy}px) scale(${k})` }], { duration: 520, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' }).finished.catch(() => {});
      ghost.remove();
    }
    seat(next); busy = false;
    if (location.hash !== collectionPath('music', id)) history.replaceState(null, '', collectionPath('music', id));
  }
  async function eject() {
    if (!tape || busy) return;
    busy = true; await stop(); sound('clack');
    const out = glass.firstElementChild;
    if (!reduced() && out) await out.animate([{ transform: 'none' }, { transform: 'translateY(-120%)', opacity: 0 }], { duration: 320, easing: 'cubic-bezier(.5,0,.7,.4)' }).finished.catch(() => {});
    glass.innerHTML = '<div class="wm-empty"></div>'; tape = null; index = 0; deck.load(null);
    room.querySelectorAll('.mx-tape').forEach(b => b.classList.remove('is-out')); card(); busy = false;
    history.replaceState(null, '', collectionPath('music'));
  }
  // Turn the tape over: it lifts, turns, and drops back in on the other side.
  async function flip() {
    if (!tape || busy) return;
    busy = true; const was = playing; await stop();
    const cs = glass.firstElementChild;
    if (!reduced() && cs) await cs.animate([{ transform: 'none' }, { transform: 'translateY(-8%) rotateY(90deg)' }], { duration: 180, easing: 'ease-in' }).finished.catch(() => {});
    side = side === 'a' ? 'b' : 'a'; index = 0; glass.innerHTML = cassetteMarkup({ ...tape, side }); deck.load(tracks()[0], 0); card();
    if (!reduced()) await glass.firstElementChild.animate([{ transform: 'translateY(-8%) rotateY(-90deg)' }, { transform: 'none' }], { duration: 200, easing: 'ease-out' }).finished.catch(() => {});
    sound('clack'); busy = false; if (was) play();
  }

  // ——— Keys: they go down under the finger, act on release ———
  let held = null, holdTimer = 0, repeat = 0;
  wm.addEventListener('pointerdown', e => {
    const key = e.target.closest('.wm-key'); if (!key) return;
    e.preventDefault(); held = key.dataset.k; key.setPointerCapture?.(e.pointerId);
    if (held !== 'play' || !playing) setKey(held, 1);
    if (held === 'rew' || held === 'ff') {
      // Held down: keep winding, a track at a time.
      holdTimer = setTimeout(() => { const step = held === 'ff' ? 1 : -1; repeat = 1; const go = async () => { if (!repeat) return; await wind(index + step, { resume: false }); if (repeat) holdTimer = setTimeout(go, 120); }; go(); }, 380);
    }
  }, { signal });
  const up = async e => {
    if (!held) return;
    const key = held; held = null; clearTimeout(holdTimer); const wasRepeat = repeat; repeat = 0;
    if (key !== 'play') setKey(key, 0);
    if (key === 'play') { if (playing) return; setKey('play', 0); if (tape) play(); else sound('key'); }
    else if (key === 'stop') { if (playing) stop(); else eject(); }
    else if (!wasRepeat) wind(index + (key === 'ff' ? 1 : -1));
    e?.preventDefault?.();
  };
  wm.addEventListener('pointerup', up, { signal });
  wm.addEventListener('pointercancel', () => { if (held && held !== 'play') setKey(held, 0); held = null; clearTimeout(holdTimer); repeat = 0; }, { signal });

  // ——— Turning a reel by hand (the pencil trick): the angle you draw around the hub winds the tape ———
  let crank = null;
  glass.addEventListener('pointerdown', e => {
    if (!tape || e.button !== 0) return;
    const hub = e.target.closest('.cs-window') && [...glass.querySelectorAll('.cs-hub')].map(h => h.getBoundingClientRect()).sort((a, b) => Math.hypot(e.clientX - a.left - a.width / 2, e.clientY - a.top - a.height / 2) - Math.hypot(e.clientX - b.left - b.width / 2, e.clientY - b.top - b.height / 2))[0];
    crank = { id: e.pointerId, x: e.clientX, y: e.clientY, hub: hub ? { x: hub.left + hub.width / 2, y: hub.top + hub.height / 2 } : null, angle: null, turned: 0, was: playing, moved: false };
    glass.setPointerCapture(e.pointerId); e.preventDefault();
  }, { signal });
  glass.addEventListener('pointermove', async e => {
    if (!crank || crank.id !== e.pointerId || !crank.hub) return;
    if (!crank.moved && Math.hypot(e.clientX - crank.x, e.clientY - crank.y) < 6) return;
    if (!crank.moved) { crank.moved = true; glass.classList.add('is-winding'); if (playing) { playing = false; wm.classList.remove('is-running'); setKey('play', 0); await deck.stop({ reduced: true, wind: false }); } }
    const angle = Math.atan2(e.clientY - crank.hub.y, e.clientX - crank.hub.x);
    if (crank.angle !== null) {
      let d = angle - crank.angle; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
      // Clockwise winds forward.
      const list = tracks(), total = sideLength(list), at = Math.max(0, Math.min(total - .5, elapsed() + d / (2 * Math.PI) * SECONDS_PER_TURN));
      const spot = locate(list, at);
      if (spot.index !== index) { index = spot.index; deck.load(list[index], spot.at); mark(); sound('tick'); } else { try { deck.audio.currentTime = spot.at; } catch {} }
      spinL += d * 57.3; spinR += d * 57.3;
    }
    crank.angle = angle;
  }, { signal });
  const release = e => {
    if (!crank || crank.id !== e.pointerId) return;
    const { moved, was } = crank; crank = null; glass.classList.remove('is-winding');
    if (!moved) { flip(); return; }   // a tap on the tape turns it over
    if (was) { setKey('play', 0); play(); }
  };
  glass.addEventListener('pointerup', release, { signal });
  glass.addEventListener('pointercancel', release, { signal });

  // ——— Tapes on the desk: drag one up into the walkman, or tap it ———
  let lift = null;
  room.querySelector('.mx-shelf').addEventListener('pointerdown', e => {
    const button = e.target.closest('.mx-tape'); if (!button || e.button !== 0 || button.classList.contains('is-out')) return;
    e.preventDefault(); button.setPointerCapture(e.pointerId);
    lift = { id: e.pointerId, button, x: e.clientX, y: e.clientY, moved: false };
  }, { signal });
  room.querySelector('.mx-shelf').addEventListener('pointermove', e => {
    if (!lift || lift.id !== e.pointerId) return;
    const dx = e.clientX - lift.x, dy = e.clientY - lift.y;
    if (!lift.moved && Math.hypot(dx, dy) < 4) return;
    lift.moved = true; lift.button.classList.add('is-lifted');
    lift.button.style.transform = `translate(${dx}px,${dy}px) rotate(${Math.max(-6, Math.min(6, dx * .02))}deg)`;
    const g = glass.getBoundingClientRect(), over = e.clientX > g.left - 40 && e.clientX < g.right + 40 && e.clientY > g.top - 60 && e.clientY < g.bottom + 40;
    wm.classList.toggle('is-open', over);
  }, { signal });
  const drop = async e => {
    if (!lift || lift.id !== e.pointerId) return;
    const { button, moved } = lift; lift = null;
    const over = wm.classList.contains('is-open'); wm.classList.remove('is-open');
    const from = button.querySelector('.cs').getBoundingClientRect();
    button.classList.remove('is-lifted');
    if (!moved || over) { button.style.transform = ''; await insert(button.dataset.id, from); return; }
    // Not over the walkman: it goes back where it lay.
    if (!reduced()) await button.animate([{ transform: button.style.transform }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.3,.8,.3,1)' }).finished.catch(() => {});
    button.style.transform = '';
  };
  room.querySelector('.mx-shelf').addEventListener('pointerup', drop, { signal });
  room.querySelector('.mx-shelf').addEventListener('pointercancel', drop, { signal });
  room.querySelector('.mx-shelf').addEventListener('click', e => { if (e.target.closest('.mx-tape')) e.preventDefault(); }, { signal });

  // ——— The J-card: a track wind to it; A/B turns the tape over ———
  jcard.addEventListener('click', e => {
    if (e.target.closest('[data-flip]')) { flip(); return; }
    const row = e.target.closest('[data-track]'); if (row) { const i = +row.dataset.track; if (i === index && !playing) play(); else if (i !== index) wind(i, { resume: true }); }
  }, { signal });

  // Keyboard: space plays / stops, ←/→ wind a track.
  document.addEventListener('keydown', e => {
    if (e.target.closest?.('input,textarea') || document.getElementById('module-menu')?.hidden === false) return;
    if (e.key === ' ') { e.preventDefault(); playing ? stop() : play(); }
    else if (e.key === 'ArrowRight') wind(index + 1);
    else if (e.key === 'ArrowLeft') wind(index - 1);
  }, { signal });

  function show(sub) {
    const next = sub && tapes.find(t => t.id === sub);
    if (next && next !== tape) { stop().then(() => seat(next)); }
    else if (!next && !tape) card();
  }
  show(route ?? tapes[0]?.id);
  const cleanup = () => { events.abort(); cancelAnimationFrame(frame); clearTimeout(holdTimer); deck.destroy(); document.querySelectorAll('.mx-ghost').forEach(g => g.remove()); };
  cleanup.route = sub => show(sub);
  return cleanup;
}
