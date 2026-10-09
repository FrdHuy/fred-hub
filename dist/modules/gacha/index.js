import { machineMarkup, eggMarkup, random, pickKind } from './machine.js?v=53';
import { unwrap, STEP, FULL } from './machine-home.js?v=53';
import { todaySlip, reading, today, SIGN_NAMES } from './fortune.js?v=53';
import { BANK, parseBank, createDeck } from './games.js?v=53';
import { setGuest } from '../stories/guest.js?v=53';
import { collectionPath } from '../../router.js';
import { play as sound } from '../../sound.js?v=53';
import SEALED from './couple.js?v=53';
import { unseal } from '../stories/seal.js?v=53';

const esc = t => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const OPEN_AT = 200;          // degrees of twisting that open a capsule
const MAX_WAITING = 6, MAX_PAPERS = 6, MAX_SHELLS = 12;
// Behind the hidden door the 8th capsule is always the pearl egg and the 9th the lamp egg; after that they turn up by chance.
const PEARL_TURN = 8, LAMP_TURN = 9;
// Coming back from reading the letter, the door is still open and the box and the envelope are still on the desk.
let resume = null;

// 扭蛋机 room (docs/design/gashapon.md): the machine on the left, a clean desk on the right (phones: above / below).
// Turn the crank a full circle → a capsule rolls onto the desk → hold it and twist → it pops open and its slip or card
// lies on the desk, the halves go to the corner. The knob picks the sign, the slider picks 签 or 游戏.
export function mount({ container }) {
  const events = new AbortController(), { signal } = events;
  const motion = matchMedia('(prefers-reduced-motion: reduce)'), reduced = () => motion.matches;
  const narrow = matchMedia('(max-width: 900px)');
  const rnd = random(Date.now() % 1e9);
  const everyone = parseBank(BANK); let draw = createDeck(everyone, rnd);
  let sign = Math.max(0, Math.min(11, Number(store.get('fred-gacha-sign')) || 0)), mode = store.get('fred-gacha-mode') === '1' ? 1 : 0;
  let layer = 0;

  const room = document.createElement('section'); room.className = 'gcr'; room.lang = 'zh-CN';
  room.innerHTML = `<h1 class="gcr-sr">扭蛋机</h1><div class="gcr-machine">${machineMarkup({ seed: Date.now() % 1e9, mode, sign })}</div>
<div class="gcr-desk"><button class="gcr-clear" type="button" aria-label="清空桌面"><svg viewBox="0 0 20 20"><path d="M4 15.5h12M6 12.5h9M8.5 9.5h6"/><path d="M15.5 4.5 11 9"/></svg></button><div class="gcr-shells" aria-hidden="true"></div><div class="gcr-papers" aria-live="polite"></div><div class="gcr-eggs"></div></div>
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
    if (next >= FULL) { next -= FULL; turned(); }
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
    if (reduced()) { turned(); turning = false; return; }
    const from = turn, start = performance.now();
    const step = now => {
      const k = Math.min(1, (now - start) / 820), deg = from + (FULL - from) * (1 - (1 - k) ** 2);
      if (Math.floor(deg / STEP) > Math.floor(turn / STEP)) sound('tick');
      setTurn(deg);
      if (k < 1) spring = requestAnimationFrame(step); else { setTurn(0); turned(); turning = false; }
    };
    spring = requestAnimationFrame(step);
  }

  // ——— The hidden door (for two): slider up, up, down, down · knob left, right, left, right · one turn of the crank ———
  // The presses themselves are the key: the extra questions are sealed with them (couple.js), nothing in the site says what they are.
  const presses = []; let couple = null, turns = 0, planted = [];   // couple: the unsealed things (questions, letter) while the door is open
  const press = k => { presses.push(k); if (presses.length > 8) presses.shift(); };
  async function turned() {
    const tried = presses.length === 8 ? presses.join('') : ''; presses.length = 0;
    const found = tried ? await unseal(SEALED, tried) : null;
    if (!found) { dispense(); return; }
    if (couple) { leave(); return; }
    enter(found, true);
  }
  function enter(found, celebrate) {
    couple = found; turns = 0;
    const extra = found.questions ?? [];
    draw = createDeck([...everyone, ...extra.map((q, i) => ({ ...q, no: everyone.length + i + 1, ours: true }))], rnd);
    const settle = () => { machine.classList.add('is-couple'); plant(); };
    if (!celebrate || reduced()) { settle(); return; }
    // the chamber blooms into warm pink, every capsule jumps, the third mark lights up, a small chime
    sound('chime');
    machine.classList.add('is-blooming');
    for (const egg of machine.querySelectorAll('.gc-chamber .gc-egg')) egg.animate([{ translate: '0 0' }, { translate: `${(Math.random() - .5) * 6}px -${6 + Math.random() * 10}px` }, { translate: '0 2px' }, { translate: '0 0' }], { duration: 520 + Math.random() * 260, delay: Math.random() * 260, easing: 'cubic-bezier(.3,.7,.3,1)' });
    setTimeout(settle, 340);
    setTimeout(() => machine.classList.remove('is-blooming'), 1300);
  }
  // Two capsules in the pile turn out to be the pearl egg and the lamp egg (they only exist behind the door).
  function plant() {
    const front = [...machine.querySelectorAll('.gc-layer.l2 .gc-egg')], mid = [...machine.querySelectorAll('.gc-layer.l1 .gc-egg')];
    const swap = (el, kind) => { if (!el) return; planted.push([el, el.className, el.innerHTML]); el.className = `gc-egg ${kind}`; el.innerHTML = `<b class="gc-in"></b><b class="gc-out"></b><b class="gc-lip"></b>${kind === 'frost' ? '<b class="gc-core"></b>' : ''}`; };
    swap(front[Math.floor(front.length * .3)], 'pearl'); swap(mid[Math.floor(mid.length * .7)] ?? front[front.length - 1], 'frost');
  }
  function leave() {
    couple = null; draw = createDeck(everyone, rnd); machine.classList.remove('is-couple'); sound('key');
    for (const [el, cls, html] of planted.splice(0)) { el.className = cls; el.innerHTML = html; }
    papers.querySelectorAll('.gcr-box,.gcr-letter').forEach(el => el.remove());
  }
  // The door closes behind you: leaving the room (or reloading) brings back the ordinary machine.
  try { localStorage.removeItem('fred-gacha-key'); } catch {}   // a key remembered by an earlier version

  // ——— A capsule falls into the chute and rolls out onto the desk ———
  function dispense() {
    if (eggs.children.length >= MAX_WAITING) {
      // the desk is full: the flap rattles and the waiting capsules shake — open one first
      sound('error');
      if (!reduced()) { flap.animate([{ transform: 'none' }, { transform: 'perspective(200px) rotateX(-22deg)' }, { transform: 'none' }], { duration: 260 }); [...eggs.children].forEach((e, i) => e.animate([{ rotate: '0deg' }, { rotate: '-12deg' }, { rotate: '10deg' }, { rotate: '-5deg' }, { rotate: '0deg' }], { duration: 460, delay: i * 50 })); }
      return;
    }
    const n = couple ? ++turns : 0;
    const kind = n === PEARL_TURN ? 'pearl' : n === LAMP_TURN ? 'frost' : pickKind(rnd, n > LAMP_TURN);
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
  // What is inside: the pearl egg holds the jewellery box, the lamp egg the letter (both only behind the door);
  // otherwise a slip (签) or a question (游戏).
  function content(egg) {
    if (egg.kind === 'pearl') return { type: 'gift' };
    if (egg.kind === 'frost') return { type: 'letter' };
    if (egg.mode === 1) return { type: 'card', ...draw() };
    return { type: 'slip', ...todaySlip(today(), egg.sign) };
  }
  const stars = n => '★'.repeat(n) + '<i>' + '★'.repeat(5 - n) + '</i>';
  const backHTML = r => `<div class="gcr-back-in"><p class="k">解签 · <b>${esc(r.rank)}</b> · ${esc(r.name)}</p><p class="meaning">${esc(r.meaning)}</p>
<p class="jie">${r.jie.map(esc).join('　')}</p>
<p class="xj">${Object.entries(r.xianji).map(([k, v]) => `<span><em>${esc(k)}</em>${esc(v)}</span>`).join('')}</p>
<p class="k">今日 · ${esc(r.officer)}</p><p class="day"><span><b>宜</b>${r.yi.map(esc).join(' ')}</span><span><b>忌</b>${r.ji.map(esc).join(' ')}</span><span class="c">${esc(r.clash)}</span></p>
<p class="k">${r.glyph} ${esc(r.sign)}座</p><ul class="luck">${r.fortunes.map(f => `<li><span class="n">${esc(f.name)}</span><span class="s" aria-label="${f.stars} 星">${stars(f.stars)}</span><span class="t">${esc(f.text)}</span></li>`).join('')}</ul></div>`;
  const twoSided = s => `<div class="gcr-turn"><div class="gcr-face front">${slipHTML(s)}</div><div class="gcr-face back">${backHTML(reading(today(), s.sign))}</div></div>`;
  const slipHTML = s => `<div class="gcr-slip-in"><div class="head">${esc(s.head)}</div>
<div class="rank">${esc(s.rankText)}</div>
<div class="poem">${s.poem.map(esc).join('<br>')}</div>
<div class="jie">解曰　${s.jie.filter(l => !l.endsWith("：")).map(esc).join("　")}</div>
<div class="seal">${s.glyph}<br>${esc(s.signName)}</div></div>`;
  function lay(item, at) {
    const el = document.createElement('div'); el.style.zIndex = ++layer;
    const tilt = ((rnd() - .5) * 5).toFixed(1), ox = Math.round((rnd() - .5) * 26), oy = Math.round((rnd() - .5) * 20);
    if (item.type === 'slip' && narrow.matches) {
      // phones: a folded slip on the desk; tap to read it unfolded
      el.className = 'gcr-folded'; el.setAttribute('role', 'button'); el.tabIndex = 0; el.setAttribute('aria-label', `打开签：${item.rankText}`);
      el.innerHTML = `<b>${esc(item.rankText)}</b><span>${item.glyph}</span>`; el.slip = item;
    } else if (item.type === 'slip') {
      el.className = 'gcr-slip'; el.setAttribute('role', 'button'); el.tabIndex = 0; el.setAttribute('aria-label', '翻面'); el.innerHTML = twoSided(item);
    } else if (item.type === 'card') {
      el.className = 'gcr-card'; el.innerHTML = `<small>Nº ${String(item.no).padStart(3, '0')} · ${item.kind === 'truth' ? 'TRUTH' : 'DARE'}${item.ours ? ' · ♡' : ''}</small><b>${item.kind === 'truth' ? '真心话' : '大冒险'}</b><p>${esc(item.text)}</p>`;
    } else if (item.type === 'gift') {
      papers.querySelectorAll('.gcr-box').forEach(old => old.remove());   // there is only one box
      el.className = 'gcr-box' + (item.open ? ' is-open' : ''); el.setAttribute('role', 'button'); el.tabIndex = 0; el.setAttribute('aria-label', '打开首饰盒'); el.innerHTML = BOX; el.style.zIndex = 900;
    } else {
      papers.querySelectorAll('.gcr-letter').forEach(old => old.remove());
      el.className = 'gcr-letter' + (item.stay ? ' is-aside' : ''); el.setAttribute('role', 'button'); el.tabIndex = 0; el.setAttribute('aria-label', '打开信'); el.innerHTML = ENVELOPE; el.style.zIndex = 901;
    }
    el.style.setProperty('--tilt', `${item.type === 'gift' ? 0 : item.stay ? -7 : tilt}deg`); el.style.setProperty('--ox', `${ox}px`); el.style.setProperty('--oy', `${oy}px`);
    papers.append(el);
    // older papers settle back; only the last few stay on the desk
    [...papers.children].forEach((p, i, all) => p.classList.toggle('is-under', i < all.length - 1));
    while (papers.children.length > MAX_PAPERS) (papers.querySelector(':scope > :not(.gcr-box,.gcr-letter)') ?? papers.firstElementChild).remove();
    fit(el);
    // the flap lifts, the sheet draws out, and then it is read in 手记
    if (item.type === 'letter' && !item.stay) { setTimeout(() => { el.classList.add('is-open'); sound('paper'); }, reduced() ? 0 : 700); setTimeout(openLetter, reduced() ? 400 : 2700); }
    if (!reduced() && !item.stay && !(item.type === 'gift' && item.open)) {
      const r = el.getBoundingClientRect(), d = desk.getBoundingClientRect(), cx = r.left - d.left + r.width / 2, cy = r.top - d.top + r.height / 2;
      el.animate([{ transform: `translate(${at.x - cx}px,${at.y - cy}px) scale(.12) rotate(${tilt}deg)`, opacity: 0 }, { opacity: 1, offset: .3 }, { transform: getComputedStyle(el).transform }], { duration: 560, easing: 'cubic-bezier(.22,.75,.2,1)' });
      sound('paper');
    }
  }
  // ——— The jewellery box and the letter ———
  const slices = n => Array.from({ length: n }, (_, i) => { const t = i / (n - 1), k = (.42 * (1 - t) ** 1.4).toFixed(3); return `<i class="jb-slice" style="--t:${t.toFixed(3)};background-image:linear-gradient(rgba(20,22,14,${k}),rgba(20,22,14,${k})),linear-gradient(90deg,#0003,#0000 9%,#ffffff24 34%,#0000 62%,#0003 100%)"></i>`; }).join('');
  const PEARL = `<svg viewBox="0 0 100 100" aria-hidden="true"><defs>
<radialGradient id="pl-body" cx=".39" cy=".33" r=".74"><stop offset="0" stop-color="#fff"/><stop offset=".14" stop-color="#fbf7f5"/><stop offset=".36" stop-color="#ede4e1"/><stop offset=".6" stop-color="#ddd0d0"/><stop offset=".8" stop-color="#c2b1b7"/><stop offset=".94" stop-color="#a08d96"/><stop offset="1" stop-color="#96838d"/></radialGradient>
<radialGradient id="pl-core" cx=".35" cy=".29" r=".8"><stop offset=".52" stop-color="#5f4c58" stop-opacity="0"/><stop offset=".76" stop-color="#5f4c58" stop-opacity=".38"/><stop offset=".88" stop-color="#5f4c58" stop-opacity=".3"/><stop offset="1" stop-color="#5f4c58" stop-opacity=".04"/></radialGradient>
<radialGradient id="pl-rose" cx=".6" cy=".62" r=".36"><stop offset="0" stop-color="#ffc9d3" stop-opacity=".3"/><stop offset="1" stop-color="#ffc9d3" stop-opacity="0"/></radialGradient>
<radialGradient id="pl-bounce" cx=".55" cy="1" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".5" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="pl-halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".5" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<filter id="pl-soft" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation=".9"/></filter><filter id="pl-hair" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation=".35"/></filter>
<clipPath id="pl-clip"><circle cx="50" cy="50" r="48"/></clipPath></defs>
<circle cx="50" cy="50" r="48" fill="url(#pl-body)"/><circle cx="50" cy="50" r="48" fill="url(#pl-core)"/><circle cx="50" cy="50" r="48" fill="url(#pl-rose)"/>
<g clip-path="url(#pl-clip)"><path d="M14 74a44 44 0 0 0 72 0" fill="none" stroke="#4d5a47" stroke-opacity=".2" stroke-width="5" filter="url(#pl-soft)"/><ellipse cx="54" cy="98" rx="33" ry="12" fill="url(#pl-bounce)" filter="url(#pl-soft)"/>
<path d="M7.5 60a44 44 0 0 0 26 34" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2" stroke-linecap="round" filter="url(#pl-soft)"/>
<ellipse cx="35" cy="30" rx="21" ry="15" fill="url(#pl-halo)" opacity=".8" transform="rotate(-34 35 30)"/></g>
<ellipse cx="33" cy="27" rx="11.5" ry="7" fill="#fff" transform="rotate(-36 33 27)" filter="url(#pl-hair)"/><circle cx="24.5" cy="41" r="1.9" fill="#fff" opacity=".9" filter="url(#pl-hair)"/><circle cx="63" cy="74" r="1.6" fill="#fff" opacity=".6" filter="url(#pl-soft)"/>
<circle cx="50" cy="50" r="47.6" fill="none" stroke="#8f7c86" stroke-opacity=".6" stroke-width=".7"/></svg>`;
  const GEM = `<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="#eef0f2" stroke="#a9adb2" stroke-width="1.6"/><path d="M20 5 30.6 9.4 35 20 30.6 30.6 20 35 9.4 30.6 5 20 9.4 9.4z" fill="#fff" stroke="#c3cad1" stroke-width=".8"/><path d="M20 5 25 15 35 20 25 25 20 35 15 25 5 20 15 15z" fill="#dfe6ec"/><path d="M15 15h10v10H15z" fill="#fff"/><path d="M20 5 15 15 9.4 9.4zM35 20 25 25 30.6 30.6z" fill="#b9c4ce"/><path class="jb-twinkle" d="M20 -8v56M-8 20h56" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>`;
  const CHAIN = `<svg class="jb-chain" viewBox="0 0 200 200" aria-hidden="true"><path d="M46 -6 L100 92 L154 -6" fill="none" stroke="#3d3f2a" stroke-opacity=".2" stroke-width="1.6" transform="translate(1.4 2.6)"/><path d="M46 -6 L100 92 L154 -6" fill="none" stroke="#c4c8cc" stroke-width="1.5" stroke-dasharray="2 1"/><path d="M46 -6 L100 92 L154 -6" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width=".55" stroke-dasharray="2 1"/></svg>`;
  const BOX = `<div class="jb"><div class="jb-body"><i class="jb-shadow"></i><div class="jb-base">${slices(46)}<div class="jb-rim"><div class="jb-pad">${CHAIN}<i class="jb-cast"></i><i class="jb-gem">${GEM}</i><i class="jb-pearl">${PEARL}</i></div></div></div><div class="jb-lid">${slices(30)}<i class="jb-slice trim" style="--t:0"></i><i class="jb-slice trim" style="--t:.035"></i><div class="jb-top"></div><div class="jb-lining"><div class="jb-satin"></div></div><i class="jb-clasp"></i></div></div></div>`;
  const ENVELOPE = `<div class="env"><div class="env-body"><i class="env-shadow"></i><i class="env-back"></i><i class="env-sheet"></i><i class="env-front"></i><div class="env-flap"><i class="env-out"><i></i></i><i class="env-in"></i><i class="env-seal"><svg viewBox="0 0 16 15"><path d="M8 14.2C3 10.4.6 7.8.6 4.9.6 2.6 2.4.9 4.6.9c1.4 0 2.6.7 3.4 1.9C8.8 1.6 10 .9 11.4.9c2.2 0 4 1.7 4 4 0 2.9-2.4 5.5-7.4 9.3z"/></svg></i></div></div></div>`;
  const toggleBox = el => { el.classList.toggle('is-open'); sound(el.classList.contains('is-open') ? 'clack' : 'key'); el.setAttribute('aria-label', el.classList.contains('is-open') ? '合上首饰盒' : '打开首饰盒'); };
  // The letter is read in 手记, on a sheet of its own; the arrow there comes back to this desk.
  function openLetter() {
    const letter = couple?.letter; if (!letter || signal.aborted) return;
    const text = letter.paragraphs.join('');
    setGuest({ id: 'letter', type: 'letter', title: letter.title, date: letter.date, sign: letter.sign, minutes: Math.max(1, Math.round(text.length / 400)), back: collectionPath('gacha'), html: letter.paragraphs.map(p => `<p>${esc(p)}</p>`).join('') });
    // the whole desk is kept as it is (capsules still waiting, papers, the box, the shells) for the way back
    const target = collectionPath('stories', 'letter');
    resume = { found: couple, turns: Math.max(turns, LAMP_TURN), layer, papers: [...papers.children], shells: [...shells.children], eggs: [...eggs.children] };
    // …but only for coming straight back: going anywhere else closes the door
    const watch = () => { if (location.hash === target) return; removeEventListener('hashchange', watch); if (!location.hash.startsWith(collectionPath('gacha'))) resume = null; };
    addEventListener('hashchange', watch);
    sound('paper'); location.hash = target;
  }
  papers.addEventListener('click', e => { const box = e.target.closest('.gcr-box'); if (box) { toggleBox(box); return; } if (e.target.closest('.gcr-letter')) openLetter(); }, { signal });
  papers.addEventListener('keydown', e => { if (e.key !== 'Enter' && e.key !== ' ') return; const box = e.target.closest('.gcr-box'); if (box) { e.preventDefault(); toggleBox(box); } else if (e.target.closest('.gcr-letter')) { e.preventDefault(); openLetter(); } }, { signal });
  // Slips are drawn at one size and scaled to the desk.
  function fit(el) {
    if (el.classList.contains('gcr-box')) { el.style.setProperty('--b', `${Math.round(Math.min(250, desk.clientWidth * .6, desk.clientHeight * .46))}px`); return; }
    if (!el.classList.contains('gcr-slip')) return;
    const k = Math.min(1, desk.clientWidth * .78 / 400, desk.clientHeight * .82 / 500);
    el.style.setProperty('--k', k.toFixed(3));
  }
  addEventListener('resize', () => papers.querySelectorAll('.gcr-slip,.gcr-box').forEach(fit), { signal });

  // ——— Clearing the desk: everything slides off the far edge ———
  room.querySelector('.gcr-clear').addEventListener('click', () => {
    const all = [...papers.children, ...shells.children, ...eggs.children]; if (!all.length) return;
    sound('paper');
    if (reduced()) { all.forEach(el => el.remove()); return; }
    all.forEach((el, i) => el.animate([{ translate: '0 0', opacity: 1 }, { translate: `${desk.clientWidth}px 0`, opacity: 0 }], { duration: 420, delay: i * 25, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' }).finished.then(() => el.remove(), () => el.remove()));
  }, { signal });

  // ——— Reading a folded slip on a phone ———
  const flip = el => { el.classList.toggle('is-flipped'); el.style.zIndex = ++layer; sound('paper'); };
  papers.addEventListener('click', e => { const f = e.target.closest('.gcr-folded'); if (f) { read(f.slip); return; } const s = e.target.closest('.gcr-slip'); if (s) flip(s); }, { signal });
  papers.addEventListener('keydown', e => { const s = e.target.closest('.gcr-slip'); if (s && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); flip(s); } }, { signal });
  papers.addEventListener('keydown', e => { const f = e.target.closest('.gcr-folded'); if (f && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); read(f.slip); } }, { signal });
  function read(slip) {
    const k = Math.min(1, (innerWidth - 32) / 400, (innerHeight - 60) / 500);
    reader.firstElementChild.innerHTML = `<div class="gcr-slip open" role="button" tabindex="0" aria-label="翻面" style="--k:${k.toFixed(3)}">${twoSided(slip)}</div>`;
    reader.hidden = false; sound('paper');
    if (!reduced()) reader.querySelector('.gcr-slip').animate([{ transform: `scale(${k}) scaleY(.34)`, opacity: .4 }, { transform: `scale(${k})`, opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.22,.75,.2,1)' });
  }
  const closeRead = () => { reader.hidden = true; reader.firstElementChild.innerHTML = ''; };
  reader.addEventListener('click', e => { const s = e.target.closest('.gcr-slip'); if (s) flip(s); else closeRead(); }, { signal });

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
  const knobUp = e => { if (!knobDrag || knobDrag.id !== e.pointerId) return; const tap = knobDrag.moved < 4; knobDrag = null; if (!tap) return; const r = knob.getBoundingClientRect(), left = e.clientX < r.left + r.width / 2; press(left ? 'l' : 'r'); setSign(sign + (left ? -1 : 1)); };
  knob.addEventListener('pointerup', knobUp, { signal });
  knob.addEventListener('pointercancel', knobUp, { signal });
  // ——— The slider: 签 above, 游戏 below ———
  machine.addEventListener('click', e => {
    const hit = e.target.closest('.gc-switch'); if (!hit) return;
    const r = hit.getBoundingClientRect(), want = e.clientY > r.top + r.height / 2 ? 1 : 0;
    press(want ? 'd' : 'u');
    if (want !== mode) { setMode(want); return; }
    // already there: the thumb knocks against its stop and springs back, like a real switch
    sound('tick');
    if (!reduced()) machine.querySelector('.gc-thumb').animate([{ translate: '0 0' }, { translate: `0 ${want ? 3 : -3}px` }, { translate: '0 0' }], { duration: 160, easing: 'ease-out' });
  }, { signal });

  // Keyboard: Enter turns the crank; ←/→ turn the knob; Esc closes the slip first.
  document.addEventListener('keydown', e => {
    if (document.getElementById('module-menu')?.hidden === false || e.target.closest?.('input,textarea')) return;
    if (e.key === 'Escape' && !reader.hidden) { e.stopPropagation(); closeRead(); return; }
    if (e.target.closest?.('.gcr-egg,.gcr-folded,.gcr-box,.gcr-letter')) return;
    if (e.key === 'Enter') { e.preventDefault(); autoTurn(); }
    else if (e.key === 'ArrowRight') setSign(sign + 1);
    else if (e.key === 'ArrowLeft') setSign(sign - 1);
  }, { signal, capture: true });

  // back from the letter: the door is still open and the desk is as it was; the envelope now lies to one side
  if (resume) {
    const was = resume; resume = null;
    enter(was.found, false); turns = was.turns; layer = was.layer;
    for (const el of was.papers) { if (el.classList.contains('gcr-letter')) continue; el.getAnimations().forEach(a => a.cancel()); papers.append(el); fit(el); }
    for (const el of was.shells) shells.append(el);
    for (const el of was.eggs) { el.style.setProperty('--twist', '0deg'); el.style.setProperty('--open', '0'); eggs.append(el); }
    lay({ type: 'letter', stay: true }, { x: desk.clientWidth / 2, y: desk.clientHeight / 2 });
  }

  return () => { events.abort(); cancelAnimationFrame(spring); document.querySelectorAll('.gcr-ghost').forEach(g => g.remove()); };
}
