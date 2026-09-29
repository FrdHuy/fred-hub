import data from './data.js?v=33';
import { TYPES, dotDate, sortNotes, years } from './notes.js?v=33';
import { unseal } from './seal.js?v=33';
import { typewriterMarkup } from './typewriter.js?v=33';
import { strike as strikeKey, setCarriage, carriageReturn, feed } from './carriage.js?v=33';
import travelData from '../travel/data.js?v=33';
import { parseTravel, localNow, flight } from '../travel/trips.js?v=33';
import { collectionPath } from '../../router.js';
import { play as sound } from '../../sound.js?v=33';

const esc = text => String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pad3 = n => String(n).padStart(3, '0');
// A sheet's tilt comes from its id, so the desk looks the same on every visit.
const tilt = id => { let h = 7; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0; return [(h % 29) / 10 - 1.4, (h >> 5) % 22]; };

export function mount({ container, route }) {
  const events = new AbortController(), { signal } = events;
  const motion = matchMedia('(prefers-reduced-motion: reduce)'), reduced = () => motion.matches;
  const notes = sortNotes(Array.isArray(data) ? data : []);
  const numbers = new Map([...notes].reverse().map((note, i) => [note.id, i + 1]));  // Nº in the order they were written
  const unlocked = new Map();   // id → { html, excerpt }: open only while you stay in 手记; leaving the module forgets them
  let year = '', lockNote = null;

  // Flights on the travel board, to link a travel log back to its boarding pass.
  let trips = [];
  try { trips = parseTravel(travelData, localNow(travelData?.home?.timeZone || 'America/Chicago')).arrivals; } catch {}
  const tripFor = note => {
    if (!note.trip) return null;
    const at = Date.parse(note.date);
    return trips.filter(t => t.code === note.trip).sort((a, b) => Math.abs(Date.UTC(a.date.year, a.date.month - 1, a.date.day) - at) - Math.abs(Date.UTC(b.date.year, b.date.month - 1, b.date.day) - at))[0] ?? null;
  };

  const room = document.createElement('section'); room.className = 'nt'; room.lang = 'zh-CN';
  container.append(room);
  const back = container.closest('.detail-view')?.querySelector('.back-link');
  const setBack = toDesk => { if (back) { back.href = toDesk ? collectionPath('stories') : '#/'; back.textContent = toDesk ? '← 回到桌上' : '← 放回收藏'; } };

  // ——— The desk ———
  function sheet(note) {
    const [deg, drop] = tilt(note.id), locked = note.locked && !unlocked.has(note.id), trip = tripFor(note);
    const where = trip ? `${flight(trip.number)} · ${trip.code}` : note.place ? esc(note.place.toUpperCase()) : '—';
    return `<li><button class="nt-sheet${locked ? ' is-locked' : ''}" type="button" data-id="${esc(note.id)}" style="--tilt:${deg.toFixed(1)}deg;--drop:${drop}px">
<span class="nt-stamp">${TYPES[note.type]}</span><h3>${esc(note.title)}</h3>
${locked ? '<span class="nt-blur" aria-hidden="true"><i></i><i></i><i></i></span><span class="nt-conf">CONFIDENTIAL</span>' : `<p>${esc(note.excerpt ?? unlocked.get(note.id)?.excerpt ?? '')}</p>`}
<span class="nt-foot"><span>${dotDate(note.date)}<b>${where}</b></span><span>${note.minutes} MIN</span></span>
<span class="nt-sr">${locked ? '，需要暗号' : ''}</span></button></li>`;
  }
  function desk() {
    setBack(false);
    const list = notes.filter(note => !year || note.date.startsWith(year));
    room.innerHTML = `<h1 class="nt-sr">手记</h1>
<div class="nt-bar"><div class="nt-years" role="group" aria-label="按年份"><button type="button" data-year="" aria-pressed="${!year}">ALL</button>${years(notes).map(y => `<button type="button" data-year="${y}" aria-pressed="${year === y}">${y}</button>`).join('')}</div><span>${pad3(list.length).slice(1)} MANUSCRIPTS</span></div>
${list.length ? `<ol class="nt-sheets">${list.map(sheet).join('')}</ol>` : '<p class="nt-empty">NOTHING ON THE DESK YET</p>'}`;
  }

  // ——— Reading ———
  function chips(note) {
    const trip = tripFor(note), out = [];
    if (trip) out.push(`<a class="nt-chip" href="${collectionPath('travel', flight(trip.number))}">${flight(trip.number)} · ${trip.from} ✈ ${trip.code} →</a>`);
    if (note.milestone) out.push(`<a class="nt-chip" href="${collectionPath('bucketlist', note.milestone)}">◎ ${esc(note.milestone)} →</a>`);
    return out.join('');
  }
  function read(note, body) {
    setBack(true);
    const list = notes, i = list.indexOf(note), newer = list[i - 1], older = list[i + 1];
    const link = (n, label) => n ? `<a href="${collectionPath('stories', n.id)}"><small>${label}</small>${esc(n.title)}</a>` : '<span></span>';
    room.innerHTML = `<article class="nt-read"><div class="nt-read-top"><span class="nt-stamp">${TYPES[note.type]}</span><span>${chips(note)}</span></div>
<h1>${esc(note.title)}</h1><p class="nt-meta">${[dotDate(note.date), note.place?.toUpperCase(), `${note.minutes} MIN`].filter(Boolean).map(esc).join(' · ')}</p>
<div class="nt-body">${body.html}</div><p class="nt-fin">— FIN —</p></article>
<nav class="nt-next" aria-label="上一篇 / 下一篇">${link(older, '← EARLIER')}${link(newer, 'LATER →')}</nav>`;
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (!reduced()) room.querySelector('.nt-read').animate([{ opacity: 0, transform: 'translateY(26px)' }, { opacity: 1, transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.22,.75,.2,1)' });
  }

  // ——— The password, typed on the typewriter ———
  const lock = document.createElement('div'); lock.className = 'nt-lock'; lock.hidden = true;
  lock.setAttribute('role', 'dialog'); lock.setAttribute('aria-modal', 'true'); lock.setAttribute('aria-label', '输入暗号');
  container.append(lock);
  // The password lives here, not in the input: the hidden input only receives keystrokes (keyboard, phone, IME) and is emptied each time.
  let input = null, typewriter = null, typed = '';
  function openLock(note) {
    lockNote = note; typed = '';
    lock.innerHTML = `${typewriterMarkup({ kicker: `CONFIDENTIAL · Nº ${pad3(numbers.get(note.id))}`, title: note.title, line: 'PASSWORD · <span class="nt-typed"></span><span class="tw-caret"></span>' })}
<label class="nt-sr" for="nt-password">暗号</label><input id="nt-password" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go">
<p class="nt-lock-hint"><span>TYPE THE PASSWORD · RETURN</span><button type="button" data-close>CLOSE</button></p>`;
    lock.hidden = false; typewriter = lock.querySelector('.tw'); input = lock.querySelector('input');
    lock.querySelector('.tw-sheet b .tw-caret')?.remove();
    input.focus({ preventScroll: true });
    if (!reduced()) typewriter.animate([{ opacity: 0, transform: 'translateY(30px) scale(.96)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.22,.75,.2,1)' });
  }
  function closeLock() { lock.hidden = true; lock.innerHTML = ''; lockNote = null; input = typewriter = null; typed = ''; }
  const strike = char => typewriter && strikeKey(typewriter, char);
  function showTyped() { const out = lock.querySelector('.nt-typed'); if (out) out.textContent = '*'.repeat(typed.length); }
  // Each character moves the carriage one step left, exactly as the line grows on the paper.
  function type(char) { if (!/^[a-z0-9]$/.test(char) || typed.length >= 22) return; typed += char; strike(char); sound('type'); showTyped(); setCarriage(typewriter, typed.length); }
  async function attempt() {
    const note = lockNote; if (!note || !typed) return;
    const ret = typewriter.querySelector('[data-k="enter"]'); ret.classList.add('is-down'); setTimeout(() => ret.classList.remove('is-down'), 140);
    const body = await unseal(note.locked, typed);
    if (note !== lockNote) return;
    if (!body) {
      // Wrong: the bell, the carriage comes back, the line is struck out.
      const tw = typewriter; tw.classList.remove('is-wrong'); void tw.offsetWidth; tw.classList.add('is-wrong');
      typed = ''; await carriageReturn(tw, { reduced }); showTyped(); return;
    }
    unlocked.set(note.id, body);
    // Right: the carriage is thrown back, two line feeds, and the sheet rolls out.
    await carriageReturn(typewriter, { reduced, bell: false });
    await feed(typewriter, { reduced, lines: 2 });
    await feed(typewriter, { reduced, out: true });
    closeLock();
    if (currentId() === note.id) read(note, body); else location.hash = collectionPath('stories', note.id);
  }
  lock.addEventListener('input', () => { if (!input) return; for (const char of input.value.toLowerCase()) type(char); input.value = ''; }, { signal });
  lock.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); attempt(); }
    else if (e.key === 'Backspace') { e.preventDefault(); typed = typed.slice(0, -1); strike('shift'); showTyped(); setCarriage(typewriter, typed.length); }
  }, { signal });
  // The on-screen keys type too (and bring the caret back to the hidden input).
  lock.addEventListener('pointerdown', e => {
    if (!input) return;
    if (e.target.closest('[data-close]')) return;
    e.preventDefault(); input.focus({ preventScroll: true });
    const k = e.target.closest('[data-k]')?.dataset.k;
    if (k === 'enter') attempt();
    else if (k && k !== 'shift' && k !== ' ') type(k);
  }, { signal });
  lock.addEventListener('click', e => { if (e.target.closest('[data-close]')) leaveLock(); }, { signal });
  function leaveLock() { closeLock(); if (currentId()) location.hash = collectionPath('stories'); }

  // ——— Routing inside the module ———
  const currentId = () => { const m = location.hash.match(/^#\/collection\/stories\/([^/]+)$/); return m ? decodeURIComponent(m[1]) : null; };
  async function show(sub) {
    const note = sub && notes.find(n => n.id === sub);
    if (!note) { closeLock(); desk(); return; }
    if (!note.locked) { closeLock(); read(note, note); return; }
    if (unlocked.has(note.id)) { closeLock(); read(note, unlocked.get(note.id)); }
    else { desk(); openLock(note); }
  }
  room.addEventListener('click', e => {
    const yearButton = e.target.closest('[data-year]');
    if (yearButton) { year = yearButton.dataset.year; desk(); return; }
    const card = e.target.closest('.nt-sheet');
    if (card) location.hash = collectionPath('stories', card.dataset.id);
  }, { signal });
  // Esc: the password screen first, then the article back to the desk; only then (main.js) the home page.
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || document.getElementById('module-menu')?.hidden === false) return;
    if (lockNote) { e.stopPropagation(); leaveLock(); return; }
    if (currentId()) { e.stopPropagation(); location.hash = collectionPath('stories'); }
  }, { signal, capture: true });

  show(route);
  const cleanup = () => { events.abort(); setBack(false); closeLock(); };
  cleanup.route = sub => show(sub);
  return cleanup;
}
