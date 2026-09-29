import data from './data.js?v=33';
import { parseTravel, stats, localNow, monthYear, passDate, flight, pad2, FIELD } from './trips.js?v=33';
import { createWord } from './flap.js?v=33';
import { play as sound } from '../../sound.js?v=33';
import notes from '../stories/data.js?v=33';
import { noteForTrip } from '../stories/notes.js?v=33';
import { collectionPath } from '../../router.js';

const esc = text => String(text).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const photo = name => new URL(`./photos/${name}`, import.meta.url).href;
const MODES = { arr: { title: 'ARRIVALS', list: 'arrivals', empty: 'NO FLIGHTS' }, dep: { title: 'DEPARTURES', list: 'departures', empty: 'NO PLANS' } };
// Placeholder skies for trips without a photo: dawn, fjord, dusk, overcast, night.
const SKIES = [['#3b4a5a', '#c9a58a', '#2a2a2c'], ['#2c3a44', '#9fb2a4', '#1f2522'], ['#3d3550', '#d08a6a', '#262226'], ['#5b625f', '#a9aea5', '#343834'], ['#141c2b', '#3e5a6e', '#10141a']];
const hash = text => [...text].reduce((sum, c) => (sum * 31 + c.charCodeAt(0)) >>> 0, 7);

export function mount({ container, route }) {
  const events = new AbortController(), { signal } = events;
  const motion = matchMedia('(prefers-reduced-motion: reduce)'), reduced = () => motion.matches;
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };
  const play = (element, frames, options) => reduced() ? Promise.resolve() : element.animate(frames, options).finished.catch(() => {});

  let today; try { today = localNow(data?.home?.timeZone || 'America/Chicago'); } catch { today = localNow('America/Chicago'); }
  const travel = parseTravel(data, today);
  if (travel.errors.length) console.warn(`旅行 data.js 有问题：\n  ${travel.errors.join('\n  ')}`);
  const total = stats(travel);
  let mode = 'arr', openRow = null;

  const hall = document.createElement('section'); hall.className = 'tv'; hall.lang = 'zh-CN';
  hall.innerHTML = `<h1 class="tv-sr">旅行足迹</h1>
<div class="tv-top"><div class="tv-title"></div>
<button class="tv-switch" type="button" role="switch" aria-checked="false" aria-label="显示想去的地方（DEPARTURES）"><span data-mode="arr"><i></i>ARR</span><span data-mode="dep"><i></i>DEP</span></button>
<div class="tv-clock"></div><p class="tv-meta"></p><p class="tv-place">${esc(travel.home.city)} · LOCAL TIME</p></div>
<div class="tv-head" aria-hidden="true"><span>DATE / FLIGHT</span><span>DESTINATION</span><span>DAYS</span><span>REMARKS</span></div>
<ol class="tv-rows"></ol><p class="tv-foot" aria-hidden="true">FRED AIR · ${esc(travel.home.airport)}</p>`;
  container.append(hall);
  const $ = selector => hall.querySelector(selector);
  const rows = $('.tv-rows'), toggle = $('.tv-switch'), meta = $('.tv-meta');
  const title = createWord(10, 'xl', { signal, reduced }), clock = createWord(5, 'l', { signal, reduced });
  $('.tv-title').append(title.el); $('.tv-clock').append(clock.el);

  function tick() {
    clock.set(localNow(travel.home.timeZone).time, { stagger: 70, steps: [1, 3] });
    later(tick, 60000 - Date.now() % 60000 + 60);
  }

  function writeMeta() {
    meta.innerHTML = mode === 'arr'
      ? `<b>${total.flights}</b> FLIGHTS · <b>${total.countries}</b> COUNTRIES${total.since ? ` · SINCE ${total.since}` : ''}`
      : `<b>${total.plans}</b> DESTINATIONS · NEXT <b>${total.next ? monthYear(total.next) : 'TBD'}</b>`;
  }

  function row(trip, index, start) {
    const item = document.createElement('li'); item.className = 'tv-item';
    const button = document.createElement('button'); button.type = 'button'; button.className = 'tv-row';
    if (trip.live) button.classList.add('is-live');
    const days = trip.days ? `<b>${pad2(trip.days)}</b> D` : '<b>—</b>';
    const when = trip.date ? `${trip.date.year}年${trip.date.month}月` : '日期未定';
    button.innerHTML = `<span class="tv-sr">${esc(trip.to)}，${when}${trip.days ? `，${trip.days} 天` : ''}，${trip.status}</span>
<span class="tv-info" aria-hidden="true"><b>${monthYear(trip.date)}</b>${flight(trip.number)} · ${trip.code}</span><span class="tv-dest"></span>
<span class="tv-days" aria-hidden="true">${days}</span><span class="tv-status" aria-hidden="true"><i></i>${trip.status}</span>`;
    button.setAttribute('aria-expanded', 'false');
    const word = createWord(FIELD, 'm', { signal, reduced });
    button.querySelector('.tv-dest').append(word.el);
    button.style.setProperty('--in', `${start}ms`);
    button.addEventListener('click', () => openRow?.item === item ? close() : open(item, trip), { signal });
    item.append(button); word.set(trip.to, { delay: start });
    return item;
  }

  function fill(animate) {
    const list = travel[MODES[mode].list], start = animate ? 380 : 0;
    rows.replaceChildren(...list.map((trip, index) => row(trip, index, start + index * 110)));
    if (!list.length) {
      const item = document.createElement('li'); item.className = 'tv-item tv-empty';
      const word = createWord(FIELD, 'm', { signal, reduced }); item.append(word.el); rows.append(item);
      word.set(MODES[mode].empty, { delay: start });
    }
  }

  // A travel log in 手记 for this trip → a link printed at the foot of the pass.
  const log = trip => { const note = mode === 'arr' && noteForTrip(Array.isArray(notes) ? notes : [], trip); return note ? `<a class="tv-log" href="${collectionPath('stories', note.id)}">READ THE LOG →</a>` : ''; };
  function pass(trip) {
    const sky = SKIES[hash(trip.code) % SKIES.length];
    const art = trip.photo ? `<img src="${photo(trip.photo)}" alt="" loading="lazy">` : `<span class="tv-sky" style="--a:${sky[0]};--b:${sky[1]};--c:${sky[2]}"><b>${trip.code}</b></span>`;
    const fields = mode === 'arr'
      ? [['DATE', passDate(trip.date)], ['DAYS', pad2(trip.days)], ['WITH', trip.with || '独自'], ['SEAT', '01 A']]
      : [['DATE', passDate(trip.date)], ['STATUS', trip.status], ['SEAT', '01 A']];
    return `<div class="tv-slot"></div><div class="tv-pass"><div class="tv-photo">${art}</div>
<div class="tv-main"><div class="tv-air"><span>FRED AIR · BOARDING PASS</span><span>Nº ${String(trip.number).padStart(3, "0")}</span></div>
<div class="tv-route">${trip.from}<span aria-label="飞往">✈</span>${trip.code}</div><p class="tv-to">${esc(trip.to)}</p>
<div class="tv-fields">${fields.map(([k, v]) => `<span>${k}<b>${esc(v)}</b></span>`).join('')}</div>${trip.line ? `<p class="tv-line">${esc(trip.line)}</p>` : ''}${log(trip)}</div>
<div class="tv-stub"><span>FLIGHT</span><b>${flight(trip.number)}</b><span>TO</span><b>${trip.code}</b><i class="tv-bars"></i></div></div>`;
  }

  // The pass feeds out of a slot under the row, like a ticket printer.
  async function open(item, trip) {
    if (openRow) await close(true);
    const wrap = document.createElement('div'); wrap.className = 'tv-print'; wrap.id = `tv-pass-${trip.number}`; wrap.innerHTML = pass(trip);
    const button = item.querySelector('.tv-row'); button.setAttribute('aria-controls', wrap.id); button.setAttribute('aria-expanded', 'true');
    item.append(wrap); item.classList.add('is-sel'); hall.classList.add('is-open'); openRow = { item, wrap, button };
    const height = wrap.scrollHeight, paper = wrap.querySelector('.tv-pass');
    sound('print');
    await Promise.all([play(wrap, [{ height: '0px' }, { height: `${height}px` }], { duration: 720, easing: 'cubic-bezier(.3,.7,.2,1)' }),
      play(paper, [{ transform: 'translateY(-100%)' }, { transform: 'translateY(0)' }], { duration: 720, easing: 'cubic-bezier(.3,.7,.2,1)' })]);
    if (!reduced() && wrap.getBoundingClientRect().bottom > innerHeight) wrap.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  async function close(quick = false) {
    if (!openRow) return;
    const { item, wrap, button } = openRow; openRow = null;
    button.setAttribute('aria-expanded', 'false'); hall.classList.remove('is-open'); item.classList.remove('is-sel');
    await play(wrap, [{ height: `${wrap.offsetHeight}px` }, { height: '0px' }], { duration: quick ? 180 : 360, easing: 'cubic-bezier(.5,0,.8,.4)' });
    wrap.remove(); button.removeAttribute('aria-controls');
  }

  function switchTo(next) {
    if (next === mode) return;
    mode = next; close(true);
    sound('key');
    toggle.setAttribute('aria-checked', String(mode === 'dep'));
    toggle.setAttribute('aria-label', mode === 'dep' ? '显示去过的地方（ARRIVALS）' : '显示想去的地方（DEPARTURES）');
    hall.dataset.mode = mode; title.set(MODES[mode].title, { stagger: 40 }); writeMeta(); fill(true);
  }
  toggle.addEventListener('click', () => switchTo(mode === 'arr' ? 'dep' : 'arr'), { signal });
  $('.tv-title').addEventListener('click', () => switchTo(mode === 'arr' ? 'dep' : 'arr'), { signal });
  // Esc tucks the pass away first (wherever focus is); main.js only sees it when no pass is out, and goes home.
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !openRow || document.getElementById('module-menu')?.hidden === false) return;
    event.stopPropagation(); const { button } = openRow; close(); button.focus({ preventScroll: true });
  }, { signal, capture: true });
  hall.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key) || !event.target.matches('.tv-row')) return;
    const buttons = [...rows.querySelectorAll('.tv-row')], index = buttons.indexOf(event.target) + (event.key === 'ArrowDown' ? 1 : -1);
    if (buttons[index]) { event.preventDefault(); buttons[index].focus(); }
  }, { signal });

  hall.dataset.mode = mode; writeMeta(); fill(true);
  title.set(MODES[mode].title, { stagger: 40 }); later(tick, reduced() ? 0 : 200);
  // #/collection/travel/FH 006 → that flight's pass is printed (links from 手记).
  function goFlight(sub) {
    const n = Number(String(sub ?? '').match(/\d+/)?.[0]); if (!n) return;
    const arrival = travel.arrivals.find(t => t.number === n), trip = arrival ?? travel.departures.find(t => t.number === n);
    if (!trip) return;
    if ((arrival ? 'arr' : 'dep') !== mode) switchTo(arrival ? 'arr' : 'dep');
    const item = rows.children[travel[MODES[mode].list].indexOf(trip)];
    if (item) later(() => { open(item, trip); item.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); }, reduced() ? 0 : 1100);
  }
  if (route) goFlight(route);
  const cleanup = () => { events.abort(); timers.forEach(clearTimeout); timers.clear(); hall.getAnimations({ subtree: true }).forEach(animation => animation.cancel()); };
  cleanup.route = goFlight;
  return cleanup;
}
