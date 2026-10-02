import { parseFilms, filmMeta, starCells, viewFilms, seriesLabel, screening, report, byYear, overlap, TYPES } from './films.js?v=46';
import { pose } from './flow.js?v=46';
import { play as sound } from '../../sound.js?v=46';

const poster = name => new URL(`./posters/${name}`, import.meta.url).href;
const pad = number => String(number).padStart(2, '0');
const svg = body => `<svg viewBox="0 0 40 32" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
// Hand-drawn line art: a jewel case with a disc slipping out, a loose cross, and two slider strokes.
// A single disc: outer rim, a faint groove, the hub ring and the hole.
const CASE_ICON = svg('<circle cx="20" cy="16" r="12.5"/><path d="M11.6 11.2c1.6-2.9 4.4-4.8 7.6-5.2" opacity=".55"/><circle cx="20" cy="16" r="4.2"/><circle cx="20" cy="16" r="1.4"/>');
const CLOSE_ICON = svg('<path d="M12.2 7.6c5.2 5.3 10.4 11 15.9 16.6"/><path d="M27.4 7.2c-5.6 5.4-10.6 11.2-15.6 17.2"/>');
const SEEN_KEY = 'fred-cinema-seen';   // a visitor's own ticks in “你看过几部？” (their browser only)

export function mount({ container, item }) {
  const events = new AbortController(), { signal } = events;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
  const play = (element, frames, options) => motion.matches ? Promise.resolve() : element.animate(frames, options).finished.catch(() => {});
  let films = [], picks = [], view = [], current = -1, aim = -1, opened = -1, busy = false, frame = 0, mode = 'screening', type = '';

  const hall = document.createElement('section'); hall.className = 'cinema'; hall.lang = 'zh-CN';
  hall.innerHTML = `<div class="cinema-bg" aria-hidden="true"><div class="cinema-ambient"></div><div class="cinema-grain"></div></div>
<h1 class="cinema-sr">观影记录</h1>
<div class="cinema-modes" role="group" aria-label="片单"><button type="button" data-mode="screening" aria-pressed="true"><i></i>放映表<b></b></button><button type="button" data-mode="archive" aria-pressed="false"><i></i>全部看过<b></b></button></div>
<button class="cinema-quiz" type="button">${CASE_ICON}你看过几部？</button>
<div class="cinema-rack" role="listbox" aria-orientation="horizontal" aria-label="放映表：左右方向键挑选，回车打开"></div>
<section class="cinema-archive" hidden><div class="cinema-report"></div><div class="cinema-filter" role="group" aria-label="类型"></div><div class="cinema-wall"></div></section>
<div class="cinema-compare" role="dialog" aria-label="你看过几部？" hidden><button class="cinema-compare-close" type="button" aria-label="关闭">${CLOSE_ICON}</button>
<p class="cinema-reel">HAVE YOU SEEN?</p><h2 class="cinema-compare-title">你看过几部？</h2><p class="cinema-compare-hint">点你看过的。结果只留在你的浏览器里。</p>
<div class="cinema-compare-grid"></div><p class="cinema-compare-result" aria-live="polite"></p></div>
<div class="cinema-detail" role="region" aria-label="影片详情" hidden><button class="cinema-close" type="button" aria-label="收起详情">${CLOSE_ICON}</button>
<div class="cinema-art"><div class="cinema-flight"><span class="cinema-detail-disc"><i></i></span><span class="cinema-detail-cover"></span></div></div><div class="cinema-info"></div></div>
<p class="cinema-notice" role="status"></p><i class="cinema-probe" style="width:var(--w)"></i><i class="cinema-probe" style="width:var(--slot)"></i><i class="cinema-probe" style="width:var(--d)"></i>
<p class="cinema-credit">Data &amp; posters · <a href="https://www.themoviedb.org/" target="_blank" rel="noopener">TMDB</a>. This product uses the TMDB API but is not endorsed or certified by TMDB.</p>`;
  container.append(hall);
  const $ = selector => hall.querySelector(selector);
  const rack = $('.cinema-rack'), ambient = $('.cinema-ambient'), detail = $('.cinema-detail'), notice = $('.cinema-notice');
  const flight = $('.cinema-flight'), detailCover = $('.cinema-detail-cover'), detailDisc = $('.cinema-detail-disc'), info = $('.cinema-info'), close = $('.cinema-close');
  const archive = $('.cinema-archive'), wall = $('.cinema-wall'), compare = $('.cinema-compare');

  // Posters load only when a case comes near the visible shelf (a long list would otherwise fetch every poster at once).
  const dress = box => {
    box.querySelectorAll('img[data-src]').forEach(image => { image.src = image.dataset.src; delete image.dataset.src; });
    box.querySelectorAll('[data-poster]').forEach(face => { face.style.setProperty('--poster', `url("${face.dataset.poster}")`); delete face.dataset.poster; });
  };
  const lazy = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { dress(entry.target); lazy.unobserve(entry.target); } }), { root: rack, rootMargin: '0px 900px' });
  signal.addEventListener('abort', () => lazy.disconnect());
  function blank() { const disc = document.createElement('span'); disc.className = 'cinema-blank'; disc.innerHTML = '<i></i>'; return disc; }
  function cover(film) {
    if (!film.poster) return blank();
    const image = new Image(); image.alt = ''; image.decoding = 'async'; image.draggable = false; image.dataset.src = poster(film.poster);
    image.addEventListener('error', () => image.replaceWith(blank()), { once: true, signal });
    return image;
  }
  // Both side faces carry the printed spine, so cases read well tilting either way.
  function spine(film, index, side) {
    const face = document.createElement('span'); face.className = `cinema-face cinema-spine cinema-spine--${side}`;
    if (film.poster) face.dataset.poster = poster(film.poster); else face.classList.add('is-blank');
    const code = document.createElement('small'); code.textContent = pad(index + 1);
    const title = document.createElement('b'); title.textContent = film.title;
    const year = document.createElement('small'); year.textContent = film.year ?? '';
    face.append(code, title, year); return face;
  }

  function caseFor({ film, index, set }, position) {
    const button = document.createElement('button'); button.type = 'button'; button.className = `cinema-case${set ? ' is-set' : ''}`;
    button.setAttribute('role', 'option'); button.setAttribute('aria-selected', 'false'); button.tabIndex = -1;
    button.setAttribute('aria-label', set ? `${seriesLabel(set.name)}，系列 ${set.members.length} 部` : [film.title, film.year].filter(Boolean).join('，'));
    button.style.setProperty('--i', Math.min(position, 12));
    const lift = document.createElement('span'); lift.className = 'cinema-lift';
    const box = document.createElement('span'); box.className = 'cinema-box';
    const front = document.createElement('span'); front.className = 'cinema-face cinema-front'; front.append(cover(film));
    const back = document.createElement('span'); back.className = 'cinema-face cinema-back';
    const mirror = document.createElement('span'); mirror.className = 'cinema-face cinema-mirror';
    if (film.poster) mirror.dataset.poster = poster(film.poster);
    // A box set: a thicker case, the series name on its spines and a small ×N on the front.
    if (set) { const count = document.createElement('span'); count.className = 'cinema-count'; count.textContent = `×${set.members.length}`; front.append(count); }
    const shown = set ? { ...film, title: seriesLabel(set.name), year: `×${set.members.length}` } : film;
    box.append(back, spine(shown, index, 'left'), spine(shown, index, 'right'), front, mirror); lift.append(box); button.append(lift);
    button.addEventListener('click', () => { if (dragged) return; position === current ? openDetail(position) : centre(position); }, { signal });
    return button;
  }

  const size = () => { const [w, slot, d] = [...hall.querySelectorAll('.cinema-probe')].map(probe => probe.offsetWidth); return { w, d, pitch: slot + (parseFloat(getComputedStyle(rack).columnGap) || 0) }; };
  function centre(position, behavior = motion.matches ? 'auto' : 'smooth') {
    aim = position;
    rack.scrollTo({ left: position * size().pitch, behavior });
  }

  // Cover-flow: each case turns by its distance from the middle, recomputed as the rack scrolls.
  // Sizes are measured once (and on resize), and only cases that can be on screen are posed each frame:
  // a long list would otherwise re-transform hundreds of 3D boxes on every scroll step.
  let sizes = null, reach = 30;
  function measure() {
    sizes = size();
    const edge = innerWidth / 2 + sizes.w;
    reach = 2; while (reach < 80 && Math.abs(pose(reach, sizes.w, sizes.d).x) < edge) reach++;
    reach += 1;
  }
  function layout() {
    frame = 0;
    if (!sizes) measure();
    const { w, d, pitch } = sizes, middle = rack.scrollLeft;
    let nearest = -1, best = Infinity;
    [...rack.children].forEach((element, position) => {
      const offset = (position * pitch - middle) / pitch, distance = Math.abs(offset);
      if (distance < best) { best = distance; nearest = position; }
      const far = distance > reach;
      if (far !== element.classList.contains('is-far')) element.classList.toggle('is-far', far);
      if (far) return;
      const { x, z, turn } = pose(offset, w, d);
      // The case element stays in its scroll slot; only the box moves to its shelf position.
      element.style.setProperty('--x', `${x - offset * pitch}px`);
      element.style.setProperty('--z', `${z}px`);
      element.style.setProperty('--turn', `${turn}deg`);
      element.style.perspectiveOrigin = `calc(50% - ${offset * pitch}px) 50%`;
      element.style.zIndex = String(100 - Math.round(distance * 4));
    });
    if (nearest === aim) aim = -1;
    if (nearest !== current && nearest >= 0) pick(nearest);
  }
  const queue = () => { if (!frame) frame = requestAnimationFrame(layout); };

  let tint = 0;
  function pick(position) {
    if (current >= 0 && position !== current) sound('tick');
    current = position;
    [...rack.children].forEach((element, i) => { element.setAttribute('aria-selected', String(i === position)); element.tabIndex = i === position ? 0 : -1; });
    clearTimeout(tint); timers.delete(tint);
    // Ambient colour follows only once scrolling settles, so fast browsing stays calm.
    tint = later(() => { const film = view[position]?.film; ambient.style.backgroundImage = film?.poster ? `url("${poster(film.poster)}")` : 'none'; hall.classList.add('has-pick'); }, 220);
  }

  // A box set's detail: the series, then its films in release order. A film opens its own card; ← goes back to the set.
  function fillSet(set) {
    info.replaceChildren();
    const reel = document.createElement('p'); reel.className = 'cinema-reel'; reel.textContent = `BOX SET · ×${set.members.length}`;
    const title = document.createElement('h2'); title.className = 'cinema-title'; title.textContent = seriesLabel(set.name);
    const years = set.members.map(m => m.film.year).filter(Boolean), span = years.length ? `${Math.min(...years)}–${Math.max(...years)}` : '';
    const meta = document.createElement('p'); meta.className = 'cinema-meta'; meta.textContent = [span, `${set.members.length} 部`].filter(Boolean).join(' · ');
    const list = document.createElement('ol'); list.className = 'cinema-members';
    set.members.forEach(({ film, index }) => {
      const row = document.createElement('li'), button = document.createElement('button'); button.type = 'button'; button.className = 'cinema-member';
      const thumb = film.poster ? Object.assign(new Image(), { src: poster(film.poster), alt: '', loading: 'lazy' }) : document.createElement('span');
      const text = document.createElement('span'); text.innerHTML = '<b></b><small></small>';
      text.querySelector('b').textContent = film.title; text.querySelector('small').textContent = [film.year, film.rating !== undefined ? `★ ${film.rating}` : ''].filter(Boolean).join(' · ');
      button.append(thumb, text); row.append(button); list.append(row);
      button.addEventListener('click', () => {
        detailCover.replaceChildren(cover(film)); dress(detailCover); fillInfo(film, index);
        const back = document.createElement('button'); back.type = 'button'; back.className = 'cinema-back'; back.textContent = `← ${seriesLabel(set.name)}`;
        back.addEventListener('click', () => { detailCover.replaceChildren(cover(set.members[0].film)); dress(detailCover); fillSet(set); });
        info.prepend(back);
      });
    });
    info.append(reel, title, meta, list);
  }
  function fillInfo(film, index) {
    info.replaceChildren();
    const reel = document.createElement('p'); reel.className = 'cinema-reel'; reel.textContent = `No. ${pad(index + 1)}`;
    const title = document.createElement('h2'); title.className = 'cinema-title'; title.setAttribute('aria-label', film.title);
    Array.from(film.title).forEach((char, i) => { const span = document.createElement('span'); span.textContent = char; span.setAttribute('aria-hidden', 'true'); span.style.setProperty('--i', Math.min(i, 14)); title.append(span); });
    info.append(reel, title);
    let step = Math.min(Array.from(film.title).length, 14);
    const line = (className, text) => { const p = document.createElement('p'); p.className = className; p.textContent = text; p.style.setProperty('--i', ++step); info.append(p); };
    if (film.original) line('cinema-original', film.original);
    // Fred's own line about the film: the reason it is on the screening list.
    if (film.note) line('cinema-note', film.note);
    const meta = filmMeta(film); if (meta) line('cinema-meta', meta);
    if (film.rating !== undefined) {
      const stars = document.createElement('p'); stars.className = 'cinema-stars'; stars.setAttribute('aria-label', `评分 ${film.rating} / 5`);
      starCells(film.rating).forEach(fill => { const star = document.createElement('span'); star.setAttribute('aria-hidden', 'true'); star.textContent = '★'; star.style.setProperty('--fill', `${fill * 100}%`); star.style.setProperty('--i', ++step); stars.append(star); });
      // The film's own score (from TMDB), not a personal rating.
      const source = document.createElement('small'); source.className = 'cinema-score-source'; source.textContent = 'TMDB'; stars.append(source);
      info.append(stars);
    }
  }

  const flip = (from, to) => `translate(${from.left - to.left}px,${from.top - to.top}px) scale(${from.width / to.width})`;
  const slide = () => `translateX(${detailDisc.offsetWidth * .5}px)`;
  const settle = () => detail.getAnimations({ subtree: true }).forEach(animation => { if (animation instanceof CSSAnimation) return; animation.cancel(); });

  // From the poster wall: the card simply fades in (no case to fly from).
  async function openFlat(film, index) {
    if (busy) return; busy = true; opened = -2;
    detailCover.replaceChildren(cover(film)); dress(detailCover); fillInfo(film, index);
    detail.hidden = false; detail.classList.add('is-rolling', 'is-playing', 'is-out'); close.focus({ preventScroll: true });
    await play(detail, [{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: 'ease-out' });
    busy = false;
  }
  // Cover and disc travel together; the disc only slides out once the cover has landed.
  async function openDetail(position) {
    if (busy) return; busy = true; opened = position;
    const { film, index, set } = view[position], front = rack.children[position].querySelector('.cinema-front');
    detailCover.replaceChildren(cover(film)); dress(detailCover);
    if (set) fillSet(set); else fillInfo(film, index);
    detail.hidden = false; detail.classList.add('is-rolling', 'is-playing');
    const from = front.getBoundingClientRect(), to = flight.getBoundingClientRect();
    front.style.visibility = 'hidden'; close.focus({ preventScroll: true });
    await Promise.all([
      play(detail, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' }),
      play(flight, [{ transform: flip(from, to) }, { transform: 'none' }], { duration: 680, easing: 'cubic-bezier(.22,.75,.2,1)' }),
      play(detailDisc, [{ transform: 'none' }, { transform: 'none', offset: .45 }, { transform: slide() }], { duration: 1150, easing: 'cubic-bezier(.3,.7,.2,1)' }),
    ]);
    if (signal.aborted) return;
    detail.classList.add('is-out'); busy = false;
  }
  async function closeDetail() {
    if (busy || opened === -1) return; busy = true;
    if (opened === -2) {
      await play(detail, [{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' });
      detail.hidden = true; detail.classList.remove('is-rolling', 'is-playing', 'is-out'); settle(); opened = -1; busy = false; return;
    }
    const position = opened, front = rack.children[position].querySelector('.cinema-front');
    // Pause the spin where it is (no snap back to 0°), tuck the disc in, then fly home.
    detail.classList.remove('is-playing', 'is-rolling');
    await Promise.all([
      play(info, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }),
      play(detailDisc, [{ transform: slide() }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }),
    ]);
    if (signal.aborted) return;
    detail.classList.remove('is-out');
    const to = front.getBoundingClientRect(), from = flight.getBoundingClientRect();
    await Promise.all([
      play(flight, [{ transform: 'none' }, { transform: flip(to, from) }], { duration: 520, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' }),
      play(detail, [{ opacity: 1 }, { opacity: 1, offset: .55 }, { opacity: 0 }], { duration: 520, fill: 'forwards' }),
    ]);
    if (signal.aborted) return;
    front.style.visibility = ''; detail.hidden = true; settle();
    opened = -1; busy = false; rack.children[position].focus({ preventScroll: true });
  }

  close.addEventListener('click', closeDetail, { signal });
  detail.addEventListener('click', e => { if (e.target === detail) closeDetail(); }, { signal });
  // Esc closes the innermost layer first; main.js only sees it when nothing is open.
  hall.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (opened !== -1) { e.stopPropagation(); closeDetail(); }
    else if (!compare.hidden) { e.stopPropagation(); closeCompare(); }
  }, { signal });
  rack.addEventListener('keydown', e => {
    // Consecutive presses add up even while the previous scroll is still travelling.
    const from = aim >= 0 ? aim : current, target = { ArrowLeft: from - 1, ArrowRight: from + 1, Home: 0, End: view.length - 1 }[e.key];
    if (target === undefined) return;
    e.preventDefault(); const next = Math.max(0, Math.min(view.length - 1, target));
    centre(next); rack.children[next]?.focus({ preventScroll: true });
  }, { signal });
  rack.addEventListener('scroll', queue, { passive: true, signal });
  addEventListener('resize', () => { sizes = null; queue(); }, { signal });

  // Vertical wheel and mouse drag also browse sideways; snapping settles on the nearest case.
  rack.addEventListener('wheel', e => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    e.preventDefault(); aim = -1; rack.scrollBy({ left: e.deltaY, behavior: 'auto' });
  }, { passive: false, signal });
  let drag = null, dragged = false;
  rack.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0) return; drag = { x: e.clientX, left: rack.scrollLeft }; dragged = false; aim = -1; }, { signal });
  addEventListener('pointermove', e => {
    if (!drag) return;
    if (!dragged && Math.abs(e.clientX - drag.x) > 5) { dragged = true; rack.classList.add('is-dragging'); }
    if (dragged) rack.scrollLeft = drag.left - (e.clientX - drag.x);
  }, { signal });
  addEventListener('pointerup', () => {
    if (!drag) return; drag = null;
    if (dragged) { rack.classList.remove('is-dragging'); centre(current); }
    later(() => { dragged = false; }, 0);
  }, { signal });

  // ——— Screening list (the CD shelf) or everything seen (report + poster wall). ———
  function setMode(next) {
    mode = next;
    hall.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
    hall.dataset.mode = mode; rack.hidden = mode !== 'screening'; $('.cinema-quiz').hidden = mode !== 'screening'; archive.hidden = mode !== 'archive';
    if (mode === 'screening') { sizes = null; arrange(); } else { buildArchive(); scrollTo({ top: 0 }); }
  }
  hall.querySelector('.cinema-modes').addEventListener('click', e => { const button = e.target.closest('[data-mode]'); if (button && button.dataset.mode !== mode) { sound('tick'); setMode(button.dataset.mode); } }, { signal });

  function arrange() {
    view = viewFilms(picks); current = -1; aim = -1;
    lazy.disconnect(); rack.replaceChildren(...view.map(caseFor)); [...rack.children].forEach(box => lazy.observe(box));
    rack.scrollLeft = 0; layout();
  }

  // The report: five numbers, then the wall, newest year first.
  function buildArchive() {
    const r = report(films);
    const cell = (label, value, small = '') => `<div><span>${label}</span><b>${value}</b>${small ? `<small>${small}</small>` : ''}</div>`;
    const clean = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    $('.cinema-report').innerHTML = [
      cell('看过', `${r.total}`, `电影 ${r.movies} · 剧集 ${r.shows}`),
      r.director ? cell('最常看的导演', clean(r.director[0]), `${r.director[1]} 部`) : '',
      r.decade ? cell('看得最多的年代', r.decade[0], `${r.decade[1]} 部`) : '',
      r.series ? cell('最长的系列', clean(seriesLabel(r.series[0])), `× ${r.series[1]}`) : '',
      r.span ? cell('时间跨度', `${r.span[0]}–${r.span[1]}`) : '',
    ].join('');
    $('.cinema-filter').innerHTML = [['', '全部'], ...TYPES.map(t => [t, t])].map(([value, label]) => `<button type="button" data-type="${value}" aria-pressed="${type === value}">${label}</button>`).join('');
    const shown = films.map((film, index) => ({ film, index })).filter(({ film }) => !type || film.type === type);
    const indexOf = new Map(shown.map(({ film, index }) => [film, index]));
    wall.replaceChildren(...byYear(shown.map(({ film }) => film)).map(([year, list]) => {
      const group = document.createElement('section'); group.className = 'cinema-year';
      const head = document.createElement('h3'); head.textContent = year; head.dataset.count = pad(list.length);
      const grid = document.createElement('div'); grid.className = 'cinema-tiles';
      list.forEach(film => {
        const tile = document.createElement('button'); tile.type = 'button'; tile.className = 'cinema-tile'; tile.title = film.title; tile.setAttribute('aria-label', film.title);
        if (film.poster) tile.append(Object.assign(new Image(), { src: poster(film.poster), alt: '', loading: 'lazy', decoding: 'async' })); else tile.textContent = film.title;
        if (film.pick) tile.classList.add('is-pick');
        tile.addEventListener('click', () => openFlat(film, indexOf.get(film)), { signal });
        grid.append(tile);
      });
      group.append(head, grid); return group;
    }));
  }
  $('.cinema-filter').addEventListener('click', e => { const button = e.target.closest('[data-type]'); if (!button) return; type = button.dataset.type; buildArchive(); }, { signal });

  // ——— “你看过几部？” A visitor ticks what they have seen; the overlap and three suggestions update as they go. ———
  let seen = new Set();
  try { seen = new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); } catch {}
  const keyOf = film => film.tmdb ?? film.title;
  function paintCompare() {
    const result = overlap(picks, seen);
    $('.cinema-compare-result').innerHTML = result.seen
      ? `你看过其中 <b>${result.seen} / ${result.total}</b> 部 · 口味重合 <b>${result.percent}%</b>${result.next.length ? `<br><span>还没看过的，我最推荐：${result.next.map(f => `《${f.title.replace(/</g, '&lt;')}》`).join('')}</span>` : '<br><span>全都看过——我们的口味太像了。</span>'}`
      : '<span>从你看过的开始点。</span>';
  }
  function openCompare() {
    const grid = $('.cinema-compare-grid');
    grid.replaceChildren(...picks.map(film => {
      const tile = document.createElement('button'); tile.type = 'button'; tile.className = 'cinema-tile'; tile.setAttribute('aria-pressed', String(seen.has(keyOf(film)))); tile.setAttribute('aria-label', film.title);
      if (film.poster) tile.append(Object.assign(new Image(), { src: poster(film.poster), alt: '', decoding: 'async' }));
      const name = document.createElement('small'); name.textContent = film.title; tile.append(name);
      tile.addEventListener('click', () => {
        const key = keyOf(film); seen.has(key) ? seen.delete(key) : seen.add(key); tile.setAttribute('aria-pressed', String(seen.has(key))); sound('tick');
        try { localStorage.setItem(SEEN_KEY, JSON.stringify([...seen])); } catch {}
        paintCompare();
      }, { signal });
      return tile;
    }));
    paintCompare(); compare.hidden = false;
    play(compare, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.22,.75,.2,1)' });
  }
  function closeCompare() { compare.hidden = true; $('.cinema-quiz').focus({ preventScroll: true }); }
  $('.cinema-quiz').addEventListener('click', openCompare, { signal });
  $('.cinema-compare-close').addEventListener('click', closeCompare, { signal });

  function render(data) {
    const parsed = parseFilms(data); films = parsed.films; picks = screening(films);
    if (parsed.errors.length) notice.textContent = `有 ${parsed.errors.length} 条没显示：${parsed.errors.join('；')}。运行 node scripts/check-cinema.mjs 查看详情。`;
    hall.querySelector('[data-mode=screening] b').textContent = pad(picks.length);
    hall.querySelector('[data-mode=archive] b').textContent = String(films.length).padStart(3, '0');
    if (!films.length) {
      hall.classList.add('is-empty'); hall.querySelector('.cinema-modes').hidden = true; $('.cinema-quiz').hidden = true;
      const empty = document.createElement('p'); empty.className = 'cinema-empty'; empty.textContent = item.emptyTitle;
      rack.replaceWith(empty); return;
    }
    setMode('screening');
  }

  // A fresh URL each visit so edits to data.js show after a normal refresh.
  import(`./data.js?t=${Date.now()}`).then(module => { if (!signal.aborted) render(module.default); }, error => {
    if (signal.aborted) return;
    notice.textContent = `data.js 读取失败（多半是少了逗号、引号或括号）。运行 node scripts/check-cinema.mjs 查看出错位置。${error.message ? ` ${error.message}` : ''}`;
    render([]);
  });

  return () => {
    events.abort(); cancelAnimationFrame(frame);
    timers.forEach(clearTimeout); timers.clear();
    hall.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
  };
}
