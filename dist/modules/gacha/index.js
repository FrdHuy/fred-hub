import { machineMarkup, eggMarkup, random, VARIETIES, VARIETY_ODDS, SPECIAL_ODDS } from './machine.js?v=42';
import { unwrap, STEP, FULL } from './machine-home.js?v=42';
import { todaySlip, today, SIGN_GLYPHS, SIGN_NAMES } from './fortune.js?v=42';
import { BANK, parseBank, createDeck, SPECIAL, VARIETY_NOTE } from './games.js?v=42';
import { play as sound } from '../../sound.js?v=42';

const esc = t => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const OPEN_AT = 200;          // degrees of twisting that open a capsule
const MAX_WAITING = 4, MAX_PAPERS = 6, MAX_SHELLS = 12;

// 扭蛋机 room (docs/design/gashapon.md): the machine on the left, a clean desk on the right (phones: above / below).
// Turn the crank a full circle → a capsule rolls onto the desk → hold it and twist → it pops open and its slip or card
// lies on the desk, the halves go to the corner. The knob picks the sign, the slider picks 签 or 游戏.
export function mount({ container }) {
  const events = new AbortController(), { signal } = events;
  const motion = matchMedia('(prefers-reduced-motion: reduce)'), reduced = () => motion.matches;
  const narrow = matchMedia('(max-width: 900px)');
  const rnd = random(Date.now() % 1e9);
  const questions = parseBank(BANK), draw = createDeck(questions, rnd);
  let sign = Math.max(0, Math.min(11, Number(store.get('fred-gacha-sign')) || 0)), mode = store.get('fred-gacha-mode') === '1' ? 1 : 0;
  let layer = 0;

  const room = document.createElement('section'); room.className = 'gcr'; room.lang = 'zh-CN';
  room.innerHTML = `<h1 class="gcr-sr">扭蛋机</h1><div class="gcr-machine">${machineMarkup({ seed: Date.now() % 1e9, mode, sign })}</div>
<div class="gcr-desk"><div class="gcr-shells" aria-hidden="true"></div><div class="gcr-papers" aria-live="polite"></div><div class="gcr-eggs"></div></div>
<div class="gcr-read" hidden><div class="gcr-read-in"></div></div>`;
  container.append(room);
  const machine = room.querySelector('.gc'), desk = room.querySelector('.gcr-desk'), papers = room.querySelector('.gcr-papers'), shells = room.querySelector('.gcr-shells'), eggs = room.querySelector('.gcr-eggs');
  const crank = machine.querySelector('.gc-crank'), knob = machine.querySelector('.gc-zod'), drop = machine.querySelector('.gc-drop'), flap = machine.querySelector('.gc-flap'), reader = room.querySelector('.gcr-read');
  const setSign = s => { if (s === sign) return; sign = (s + 12) % 12; machine.style.setProperty('--sign', sign); store.set('fred-gacha-sign', sign); sound('tick'); knob.setAttribute('aria-label', `星座：${SIGN_NAMES[sign]}座`); };
  const setMode = m => { mode = m; machine.style.setProperty('--mode', mode); store.set('fred-gacha-mode', mode); sound('key'); };
  knob.setAttribute('role', 'slider'); knob.setAttribute('aria-label', `星座：${SIGN_NAMES[sign]}座`);

  // ——— The crank: draw a circle round it, clockwise. Every full turn gives a capsule. ———
  let turn = 0, crankDrag = null, spring = 0;
  const setTurn = deg => { turn = deg; machine.style.setProperty('--turn', `${deg.toFixed(1)}deg`); };
  const angleAround = (el, e) => { const r = el.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; };
  crank.addEventListener('pointerdown', e => {
    if (e.button !== 0) return; e.preventDefault(); cancelAnimationFrame(spring);
    crank.setPointerCapture(e.pointerId); crankDrag = { id: e.pointerId, last: angleAround(crank, e), moved: 0 };
  }, { signal });
  crank.addEventListener('pointermove', e => {
    if (!crankDrag || crankDrag.id !== e.pointerId) return;
    const a = angleAround(crank, e), d = unwrap(a - crankDrag.last); crankDrag.last = a; crankDrag.moved += Math.abs(d);
    let next = Math.max(0, turn + d);
    if (Math.floor(next / STEP) > Math.floor(turn / STEP)) sound('tick');
    if (next >= FULL) { next -= FULL; dispense(); }
    setTurn(next);
  }, { signal });
  const crankUp = e => {
    if (!crankDrag || crankDrag.id !== e.pointerId) return;
    const tapped = crankDrag.moved < 6; crankDrag = null;
    if (tapped) { autoTurn(); return; }
    springBack();
  };
  crank.addEventListener('pointerup', crankUp, { signal });
  crank.addEventListener('pointercancel', crankUp, { signal });
  function springBack() {
    const from = turn, start = performance.now();
    if (reduced() || !from) { setTurn(0); return; }
    const step = now => { const k = Math.min(1, (now - start) / 360); setTurn(from * (1 - k) ** 3); if (k < 1) spring = requestAnimationFrame(step); };
    spring = requestAnimationFrame(step);
  }
  // A tap (or Enter) turns it for you, one steady turn.
  let turning = false;
  function autoTurn() {
    if (turning) return; turning = true;
    if (reduced()) { dispense(); turning = false; return; }
    const from = turn, start = performance.now();
    const step = now => {
      const k = Math.min(1, (now - start) / 820), deg = from + (FULL - from) * (1 - (1 - k) ** 2);
      if (Math.floor(deg / STEP) > Math.floor(turn / STEP)) sound('tick');
      setTurn(deg);
      if (k < 1) spring = requestAnimationFrame(step); else { setTurn(0); dispense(); turning = false; }
    };
    spring = requestAnimationFrame(step);
  }

  // ——— A capsule falls into the chute and rolls out onto the desk ———
  function dispense() {
    if (eggs.children.length >= MAX_WAITING) { sound('error'); return; }
    const roll = rnd(), kind = roll < SPECIAL_ODDS ? 'frost' : roll < SPECIAL_ODDS + VARIETY_ODDS ? VARIETIES[Math.floor(rnd() * VARIETIES.length)] : '';
    const egg = { kind, mode, sign, id: Date.now() + rnd() };
    sound('reading');
    const size = narrow.matches ? 56 : 68;
    const d = desk.getBoundingClientRect(), spot = landing(d, size);
    const el = document.createElement('button'); el.type = 'button'; el.className = 'gcr-egg'; el.setAttribute('aria-label', '拧开扭蛋');
    el.style.cssText = `left:${spot.x}px;top:${spot.y}px;--size:${size}px`;
    el.innerHTML = `<span class="gc" style="--u:${size / 40}px">${eggMarkup(kind, { x: 20, y: 20, s: 40, r: Math.round((rnd() - .5) * 40) })}</span>`;
    el.egg = egg;
    if (reduced()) { eggs.append(el); return; }
    // behind the flap, then out and across to the desk
    const c = drop.getBoundingClientRect(), ghost = document.createElement('div');
    ghost.className = 'gcr-ghost'; ghost.innerHTML = el.innerHTML;
    Object.assign(ghost.style, { left: `${c.left + c.width / 2 - size / 2}px`, top: `${c.top + c.height / 2 - size / 2}px`, width: `${size}px`, height: `${size}px` });
    document.body.append(ghost);
    flap.animate([{ transform: 'none' }, { transform: 'perspective(200px) rotateX(-60deg)' }, { transform: 'none' }], { duration: 600, easing: 'cubic-bezier(.3,.7,.3,1)' });
    sound('roll');
    const dx = d.left + spot.x - (c.left + c.width / 2 - size / 2), dy = d.top + spot.y - (c.top + c.height / 2 - size / 2);
    const arc = narrow.matches ? [{ transform: 'translate(0,0) scale(.6) rotate(0deg)', opacity: .4 }, { transform: 'translate(0,0) scale(.7)', opacity: 1, offset: .15 }, { transform: `translate(${dx * .5}px,${dy * .45}px) rotate(200deg)`, offset: .6 }, { transform: `translate(${dx}px,${dy}px) rotate(360deg)` }]
      : [{ transform: 'translate(0,0) scale(.6) rotate(0deg)', opacity: .4 }, { transform: 'translate(0,0) scale(.7)', opacity: 1, offset: .15 }, { transform: `translate(${dx * .5}px,${dy - 60}px) rotate(200deg)`, offset: .6 }, { transform: `translate(${dx}px,${dy}px) rotate(360deg)` }];
    ghost.animate(arc, { duration: 900, easing: 'cubic-bezier(.4,0,.3,1)' }).finished.then(() => { ghost.remove(); eggs.append(el); el.animate([{ transform: 'translateY(-6px)' }, { transform: 'none' }], { duration: 180, easing: 'ease-out' }); sound('tick'); }, () => ghost.remove());
  }
  // Where a capsule comes to rest: the lower-left part of the desk, not on top of another one.
  function landing(d, size) {
    const taken = [...eggs.children].map(e => [parseFloat(e.style.left), parseFloat(e.style.top)]);
    for (let i = 0; i < 20; i++) {
      const x = d.width * (.08 + rnd() * .3), y = d.height * (narrow.matches ? .06 + rnd() * .12 : .7 + rnd() * .16);
      if (taken.every(([tx, ty]) => Math.hypot(tx - x, ty - y) > size * 1.1)) return { x, y };
    }
    return { x: d.width * .15, y: d.height * .8 };
  }

  // ——— Twisting a capsule open ———
  let twist = null;
  eggs.addEventListener('pointerdown', e => {
    const el = e.target.closest('.gcr-egg'); if (!el || e.button !== 0) return;
    e.preventDefault(); el.setPointerCapture(e.pointerId);
    twist = { el, id: e.pointerId, last: angleAround(el, e), sum: 0, moved: 0 };
  }, { signal });
  eggs.addEventListener('pointermove', e => {
    if (!twist || twist.id !== e.pointerId) return;
    const a = angleAround(twist.el, e), d = unwrap(a - twist.last); twist.last = a; twist.sum += d; twist.moved += Math.abs(d);
    const k = Math.min(1, Math.abs(twist.sum) / OPEN_AT);
    if (Math.floor(Math.abs(twist.sum) / 40) > Math.floor((Math.abs(twist.sum) - Math.abs(d)) / 40)) sound('tick');
    twist.el.style.setProperty('--twist', `${(twist.sum * .35).toFixed(1)}deg`); twist.el.style.setProperty('--open', k.toFixed(3));
    if (k >= 1) { const el = twist.el; twist = null; open(el); }
  }, { signal });
  const twistUp = e => {
    if (!twist || twist.id !== e.pointerId) return;
    const { el, moved } = twist; twist = null;
    if (moved < 8) { if (reduced()) open(el); else { sound('tick'); el.animate([{ rotate: '0deg' }, { rotate: '-9deg' }, { rotate: '7deg' }, { rotate: '0deg' }], { duration: 360 }); } return; }
    el.style.setProperty('--twist', '0deg'); el.style.setProperty('--open', '0');   // not far enough: it closes again
  };
  eggs.addEventListener('pointerup', twistUp, { signal });
  eggs.addEventListener('pointercancel', twistUp, { signal });
  // Keyboard: Enter on a capsule opens it.
  eggs.addEventListener('keydown', e => { const el = e.target.closest('.gcr-egg'); if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(el); } }, { signal });

  function open(el) {
    const egg = el.egg, d = desk.getBoundingClientRect(), r = el.getBoundingClientRect();
    const at = { x: r.left - d.left + r.width / 2, y: r.top - d.top + r.height / 2 };
    sound('pop'); el.remove();
    shell(egg.kind, at);
    lay(content(egg), at);
  }
  // The two halves go to the corner of the desk.
  function shell(kind, at) {
    const s = narrow.matches ? 36 : 46, x = desk.clientWidth * (narrow.matches ? .66 + rnd() * .26 : .8 + rnd() * .14), y = desk.clientHeight * (narrow.matches ? .8 + rnd() * .12 : .86 + rnd() * .09);
    const pair = document.createElement('div'); pair.className = 'gcr-shell'; pair.style.cssText = `left:${x}px;top:${y}px;--size:${s}px;rotate:${Math.round((rnd() - .5) * 60)}deg`;
    const half = top => `<span class="gcr-half ${top ? 'top' : 'bottom'}"><span class="gc" style="--u:${s / 40}px">${eggMarkup(kind, { x: 20, y: top ? 20 : 0, s: 40 })}</span></span>`;
    pair.innerHTML = half(true) + half(false);
    shells.append(pair);
    while (shells.children.length > MAX_SHELLS) shells.firstElementChild.remove();
    if (!reduced()) pair.animate([{ transform: `translate(${at.x - x}px,${at.y - y}px) scale(1.3)`, opacity: .6 }, { transform: 'none', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.3,.7,.3,1)' });
  }
  // What is inside: the lamp egg and the odd eggs carry Fred's things; otherwise a slip (签) or a question (游戏).
  function content(egg) {
    if (egg.kind === 'frost') return { type: 'note', special: true, ...SPECIAL };
    if (egg.kind) return { type: 'note', ...VARIETY_NOTE };
    if (egg.mode === 1) return { type: 'card', ...draw() };
    return { type: 'slip', ...todaySlip(today(), egg.sign) };
  }
  const slipHTML = s => `<div class="gcr-slip-in"><div class="head">${esc(s.head)}</div>
<div class="rank">第${esc(s.noText)}签<small>${esc(s.rank)}</small></div>
<div class="poem">${s.poem.map(esc).join('<br>')}</div>
<div class="jie">解曰　${esc(s.jie)}</div>
<div class="yi"><b>宜</b>　${s.yi.map(esc).join('　')}</div><div class="yi"><b>忌</b>　${s.ji.map(esc).join('　')}</div>
<div class="seal">${s.glyph}<br>${esc(s.signName)}</div>${s.placeholder ? '<i class="mock">示意</i>' : ''}</div>`;
  function lay(item, at) {
    const el = document.createElement('div'); el.style.zIndex = ++layer;
    const tilt = ((rnd() - .5) * 5).toFixed(1), ox = Math.round((rnd() - .5) * 26), oy = Math.round((rnd() - .5) * 20);
    if (item.type === 'slip' && narrow.matches) {
      // phones: a folded slip on the desk; tap to read it unfolded
      el.className = 'gcr-folded'; el.setAttribute('role', 'button'); el.tabIndex = 0; el.setAttribute('aria-label', `打开签：第${item.noText}签 ${item.rank}`);
      el.innerHTML = `<b>${esc(item.rank)}</b><span>${item.glyph}</span>`; el.slip = item;
    } else if (item.type === 'slip') {
      el.className = 'gcr-slip'; el.innerHTML = slipHTML(item);
    } else if (item.type === 'card') {
      el.className = 'gcr-card'; el.innerHTML = `<small>Nº ${String(item.no).padStart(3, '0')} · ${item.kind === 'truth' ? 'TRUTH' : 'DARE'}</small><b>${item.kind === 'truth' ? '真心话' : '大冒险'}</b><p>${esc(item.text)}</p>`;
    } else {
      el.className = 'gcr-card note' + (item.special ? ' special' : ''); el.innerHTML = `<small>${item.special ? '✦' : '·'}</small><b>${esc(item.title)}</b><p>${esc(item.text)}</p>`;
    }
    el.style.setProperty('--tilt', `${tilt}deg`); el.style.setProperty('--ox', `${ox}px`); el.style.setProperty('--oy', `${oy}px`);
    papers.append(el);
    // older papers settle back; only the last few stay on the desk
    [...papers.children].forEach((p, i, all) => p.classList.toggle('is-under', i < all.length - 1));
    while (papers.children.length > MAX_PAPERS) papers.firstElementChild.remove();
    fit(el);
    if (!reduced()) {
      const r = el.getBoundingClientRect(), d = desk.getBoundingClientRect(), cx = r.left - d.left + r.width / 2, cy = r.top - d.top + r.height / 2;
      el.animate([{ transform: `translate(${at.x - cx}px,${at.y - cy}px) scale(.12) rotate(${tilt}deg)`, opacity: 0 }, { opacity: 1, offset: .3 }, { transform: getComputedStyle(el).transform }], { duration: 560, easing: 'cubic-bezier(.22,.75,.2,1)' });
      sound('paper');
    }
  }
  // Slips are drawn at one size and scaled to the desk.
  function fit(el) {
    if (!el.classList.contains('gcr-slip')) return;
    const k = Math.min(1, desk.clientWidth * .78 / 400, desk.clientHeight * .82 / 500);
    el.style.setProperty('--k', k.toFixed(3));
  }
  addEventListener('resize', () => papers.querySelectorAll('.gcr-slip').forEach(fit), { signal });

  // ——— Reading a folded slip on a phone ———
  papers.addEventListener('click', e => { const f = e.target.closest('.gcr-folded'); if (f) read(f.slip); }, { signal });
  papers.addEventListener('keydown', e => { const f = e.target.closest('.gcr-folded'); if (f && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); read(f.slip); } }, { signal });
  function read(slip) {
    const k = Math.min(1, (innerWidth - 32) / 400, (innerHeight - 60) / 500);
    reader.firstElementChild.innerHTML = `<div class="gcr-slip open" style="--k:${k.toFixed(3)}">${slipHTML(slip)}</div>`;
    reader.hidden = false; sound('paper');
    if (!reduced()) reader.querySelector('.gcr-slip').animate([{ transform: `scale(${k}) scaleY(.34)`, opacity: .4 }, { transform: `scale(${k})`, opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.22,.75,.2,1)' });
  }
  const closeRead = () => { reader.hidden = true; reader.firstElementChild.innerHTML = ''; };
  reader.addEventListener('click', closeRead, { signal });

  // ——— The zodiac knob: turn it (drag round it) or tap to step one sign ———
  let knobDrag = null;
  knob.addEventListener('pointerdown', e => { if (e.button !== 0) return; e.preventDefault(); knob.setPointerCapture(e.pointerId); knobDrag = { id: e.pointerId, moved: 0, x: e.clientX, y: e.clientY }; }, { signal });
  knob.addEventListener('pointermove', e => {
    if (!knobDrag || knobDrag.id !== e.pointerId) return;
    knobDrag.moved = Math.max(knobDrag.moved, Math.hypot(e.clientX - knobDrag.x, e.clientY - knobDrag.y));
    if (knobDrag.moved < 4) return;
    const a = (angleAround(knob, e) + 90 + 360) % 360;   // 0° = straight up = Aries
    setSign(Math.round(a / 30) % 12);
  }, { signal });
  const knobUp = e => { if (!knobDrag || knobDrag.id !== e.pointerId) return; const tap = knobDrag.moved < 4; knobDrag = null; if (tap) setSign(sign + 1); };
  knob.addEventListener('pointerup', knobUp, { signal });
  knob.addEventListener('pointercancel', knobUp, { signal });
  // ——— The slider: 签 above, 游戏 below ———
  machine.addEventListener('click', e => {
    const hit = e.target.closest('.gc-switch'); if (!hit) return;
    const r = hit.getBoundingClientRect(), want = e.clientY > r.top + r.height / 2 ? 1 : 0;
    setMode(want === mode ? 1 - mode : want);   // tap the other half to go there; tap the same half to flip
  }, { signal });

  // Keyboard: Enter turns the crank; ←/→ turn the knob; Esc closes the slip first.
  document.addEventListener('keydown', e => {
    if (document.getElementById('module-menu')?.hidden === false || e.target.closest?.('input,textarea')) return;
    if (e.key === 'Escape' && !reader.hidden) { e.stopPropagation(); closeRead(); return; }
    if (e.target.closest?.('.gcr-egg,.gcr-folded')) return;
    if (e.key === 'Enter') { e.preventDefault(); autoTurn(); }
    else if (e.key === 'ArrowRight') setSign(sign + 1);
    else if (e.key === 'ArrowLeft') setSign(sign - 1);
  }, { signal, capture: true });

  return () => { events.abort(); cancelAnimationFrame(spring); document.querySelectorAll('.gcr-ghost').forEach(g => g.remove()); };
}
