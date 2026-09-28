import { parseFilms, filmMeta, starCells } from './films.js?v=19';

const poster = name => new URL(`./posters/${name}`, import.meta.url).href;
const pad = number => String(number).padStart(2, '0');
const svg = body => `<svg viewBox="0 0 40 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
// Hand-drawn line art: a jewel case with a disc slipping out, and a loose cross.
const CASE_ICON = svg('<path d="M24.1 3.6c5.6-.2 10.3 4.4 10.4 10.1.1 5.8-4.4 10.4-10.2 10.5"/><circle cx="24.4" cy="13.9" r="2.1"/><path fill="#0f0d0c" d="M3.4 8.9c6.1-.4 12.4-.4 18.5-.1.4 7.1.3 14.2.1 21.3-6.2.3-12.4.3-18.5 0-.3-7.1-.4-14.1-.1-21.2z"/><path d="M6.7 9.1c-.2 7-.1 14 .1 20.8"/>');
const CLOSE_ICON = svg('<path d="M12.2 7.6c5.2 5.3 10.4 11 15.9 16.6"/><path d="M27.4 7.2c-5.6 5.4-10.6 11.2-15.6 17.2"/>');

export function mount({ container, item }) {
  const events = new AbortController(), { signal } = events;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const timers = new Set(), running = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };
  const play = (element, frames, options) => {
    if (motion.matches) return Promise.resolve();
    const animation = element.animate(frames, options); running.add(animation);
    return animation.finished.catch(() => {}).finally(() => running.delete(animation));
  };
  let films = [], current = -1, opened = -1, busy = false;

  const hall = document.createElement('section'); hall.className = 'cinema'; hall.lang = 'zh-CN';
  hall.innerHTML = `<div class="cinema-bg" aria-hidden="true"><div class="cinema-ambient"></div><div class="cinema-grain"></div></div>
<h1 class="cinema-sr">观影记录</h1><p class="cinema-tally">${CASE_ICON}<span></span></p>
<div class="cinema-rack" role="listbox" aria-orientation="horizontal" aria-label="片单：左右方向键挑选，回车打开"></div>
<div class="cinema-detail" role="region" aria-label="影片详情" hidden><button class="cinema-close" type="button" aria-label="收起详情">${CLOSE_ICON}</button>
<div class="cinema-art"><span class="cinema-detail-disc"><i></i></span><span class="cinema-detail-cover"></span></div><div class="cinema-info"></div></div>
<p class="cinema-notice" role="status"></p><i class="cinema-probe" style="width:var(--slot)"></i><i class="cinema-probe" style="width:var(--open)"></i>
<p class="cinema-credit">Data &amp; posters · <a href="https://www.themoviedb.org/" target="_blank" rel="noopener">TMDB</a>. This product uses the TMDB API but is not endorsed or certified by TMDB.</p>`;
  container.append(hall);
  const $ = selector => hall.querySelector(selector);
  const rack = $('.cinema-rack'), ambient = $('.cinema-ambient'), detail = $('.cinema-detail'), notice = $('.cinema-notice');
  const art = $('.cinema-art'), detailCover = $('.cinema-detail-cover'), detailDisc = $('.cinema-detail-disc'), info = $('.cinema-info'), close = $('.cinema-close');

  function blank() { const disc = document.createElement('span'); disc.className = 'cinema-blank'; disc.innerHTML = '<i></i>'; return disc; }
  function cover(film) {
    if (!film.poster) return blank();
    const image = new Image(); image.alt = ''; image.decoding = 'async'; image.draggable = false; image.src = poster(film.poster);
    image.addEventListener('error', () => image.replaceWith(blank()), { once: true, signal });
    return image;
  }

  function caseFor(film, index) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'cinema-case';
    button.setAttribute('role', 'option'); button.setAttribute('aria-selected', 'false'); button.tabIndex = index ? -1 : 0;
    button.setAttribute('aria-label', [film.title, film.year].filter(Boolean).join('，'));
    button.style.setProperty('--i', Math.min(index, 12));
    const box = document.createElement('span'); box.className = 'cinema-box';
    const front = document.createElement('span'); front.className = 'cinema-face cinema-front'; front.append(cover(film));
    const spine = document.createElement('span'); spine.className = 'cinema-face cinema-spine';
    if (film.poster) spine.style.setProperty('--poster', `url("${poster(film.poster)}")`); else spine.classList.add('is-blank');
    const code = document.createElement('small'); code.textContent = `FH ${pad(index + 1)}`;
    const title = document.createElement('b'); title.textContent = film.title;
    const year = document.createElement('small'); year.textContent = film.year ?? '';
    spine.append(code, title, year);
    const edge = document.createElement('span'); edge.className = 'cinema-face cinema-edge';
    const back = document.createElement('span'); back.className = 'cinema-face cinema-back';
    box.append(back, edge, spine, front); button.append(box);
    button.addEventListener('click', () => { if (dragged) return; index === current ? openDetail(index) : select(index); }, { signal });
    return button;
  }

  // Centre a case by scrolling the rack only; widths come from the CSS so both agree.
  function centre(index) {
    const style = getComputedStyle(rack), [slot, open] = [...hall.querySelectorAll('.cinema-probe')].map(probe => probe.offsetWidth), gap = parseFloat(style.columnGap) || 0;
    rack.scrollTo({ left: parseFloat(style.paddingLeft) + index * (slot + gap) + open / 2 - rack.clientWidth / 2, behavior: motion.matches ? 'auto' : 'smooth' });
  }

  function select(index, { focus = false } = {}) {
    if (!films.length || busy) return;
    index = Math.max(0, Math.min(films.length - 1, index));
    const cases = [...rack.children];
    if (focus) cases[index].focus({ preventScroll: true });
    if (index === current) return;
    cases.forEach((element, i) => { element.setAttribute('aria-selected', String(i === index)); element.tabIndex = i === index ? 0 : -1; element.classList.toggle('is-open', i === index); });
    current = index; centre(index);
    ambient.style.backgroundImage = films[index].poster ? `url("${poster(films[index].poster)}")` : 'none';
    hall.classList.add('has-pick');
  }

  function fillInfo(film, index) {
    info.replaceChildren();
    const reel = document.createElement('p'); reel.className = 'cinema-reel'; reel.textContent = `${pad(index + 1)} / ${pad(films.length)}`;
    const title = document.createElement('h2'); title.className = 'cinema-title'; title.setAttribute('aria-label', film.title);
    Array.from(film.title).forEach((char, i) => { const span = document.createElement('span'); span.textContent = char; span.setAttribute('aria-hidden', 'true'); span.style.setProperty('--i', Math.min(i, 14)); title.append(span); });
    info.append(reel, title);
    let step = Math.min(Array.from(film.title).length, 14);
    const line = (className, text) => { const p = document.createElement('p'); p.className = className; p.textContent = text; p.style.setProperty('--i', ++step); info.append(p); };
    if (film.original) line('cinema-original', film.original);
    const meta = filmMeta(film); if (meta) line('cinema-meta', meta);
    if (film.rating !== undefined) {
      const stars = document.createElement('p'); stars.className = 'cinema-stars'; stars.setAttribute('aria-label', `评分 ${film.rating} / 5`);
      starCells(film.rating).forEach(fill => { const star = document.createElement('span'); star.setAttribute('aria-hidden', 'true'); star.textContent = '★'; star.style.setProperty('--fill', `${fill * 100}%`); star.style.setProperty('--i', ++step); stars.append(star); });
      info.append(stars);
    }
  }

  const slide = () => detailDisc.offsetWidth * .46;
  // From the case's front face to the detail cover: a FLIP transform on the detail cover.
  function flip(from, to) { return `translate(${from.left - to.left}px,${from.top - to.top}px) scale(${from.width / to.width})`; }

  async function openDetail(index) {
    if (busy) return; busy = true; opened = index;
    const film = films[index], front = rack.children[index].querySelector('.cinema-front');
    detailCover.replaceChildren(cover(film)); fillInfo(film, index);
    detail.hidden = false; hall.classList.add('is-detail'); detail.classList.remove('is-spinning');
    const from = front.getBoundingClientRect(), to = detailCover.getBoundingClientRect();
    front.style.visibility = 'hidden'; close.focus({ preventScroll: true });
    detail.classList.add('is-rolling');
    await Promise.all([
      play(detail, [{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: 'ease-out' }),
      play(detailCover, [{ transform: flip(from, to) }, { transform: 'none' }], { duration: 720, easing: 'cubic-bezier(.22,.75,.2,1)' }),
      play(detailDisc, [{ transform: 'translateX(0) rotate(0)' }, { transform: 'translateX(0) rotate(0)', offset: .35 }, { transform: `translateX(${slide()}px) rotate(240deg)` }], { duration: 1100, easing: 'cubic-bezier(.3,.7,.2,1)' }),
    ]);
    if (signal.aborted) return;
    detail.classList.add('is-spinning'); busy = false;
  }

  async function closeDetail() {
    if (busy || opened < 0) return; busy = true;
    const index = opened, front = rack.children[index].querySelector('.cinema-front');
    detail.classList.remove('is-spinning', 'is-rolling');
    const to = front.getBoundingClientRect(), from = detailCover.getBoundingClientRect();
    await Promise.all([
      play(info, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }),
      play(detailDisc, [{ transform: `translateX(${slide()}px) rotate(240deg)` }, { transform: 'translateX(0) rotate(0)' }], { duration: 420, easing: 'ease-in' }),
      play(detailCover, [{ transform: 'none' }, { transform: flip(to, from) }], { duration: 560, delay: 120, easing: 'cubic-bezier(.5,0,.2,1)', fill: 'forwards' }),
      play(detail, [{ opacity: 1 }, { opacity: 1, offset: .6 }, { opacity: 0 }], { duration: 680, fill: 'forwards' }),
    ]);
    if (signal.aborted) return;
    detail.getAnimations({ subtree: true }).forEach(animation => animation.cancel());
    detail.hidden = true; hall.classList.remove('is-detail'); front.style.visibility = '';
    opened = -1; busy = false; rack.children[index].focus({ preventScroll: true });
  }

  close.addEventListener('click', closeDetail, { signal });
  detail.addEventListener('click', e => { if (e.target === detail) closeDetail(); }, { signal });
  // Esc closes the detail first; main.js only sees it when no detail is open.
  hall.addEventListener('keydown', e => { if (e.key === 'Escape' && opened >= 0) { e.stopPropagation(); closeDetail(); } }, { signal });
  rack.addEventListener('keydown', e => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    const at = current < 0 ? 0 : current;
    if (step !== undefined) { e.preventDefault(); select(current < 0 ? 0 : at + step, { focus: true }); }
    else if (e.key === 'Home') { e.preventDefault(); select(0, { focus: true }); }
    else if (e.key === 'End') { e.preventDefault(); select(films.length - 1, { focus: true }); }
  }, { signal });

  // Vertical wheel and mouse drag both browse the rack sideways.
  rack.addEventListener('wheel', e => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || rack.scrollWidth <= rack.clientWidth) return;
    e.preventDefault(); rack.scrollLeft += e.deltaY;
  }, { passive: false, signal });
  let drag = null, dragged = false;
  rack.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || e.button !== 0) return; drag = { x: e.clientX, left: rack.scrollLeft }; dragged = false; }, { signal });
  rack.addEventListener('pointermove', e => {
    if (!drag) return;
    if (Math.abs(e.clientX - drag.x) > 5) { dragged = true; rack.classList.add('is-dragging'); }
    if (dragged) rack.scrollLeft = drag.left - (e.clientX - drag.x);
  }, { signal });
  addEventListener('pointerup', () => { drag = null; rack.classList.remove('is-dragging'); later(() => { dragged = false; }, 0); }, { signal });

  function render(data) {
    const parsed = parseFilms(data); films = parsed.films;
    if (parsed.errors.length) notice.textContent = `有 ${parsed.errors.length} 条没显示：${parsed.errors.join('；')}。运行 node scripts/check-cinema.mjs 查看详情。`;
    $('.cinema-tally span').textContent = films.length;
    $('.cinema-tally').setAttribute('aria-label', `共 ${films.length} 部`);
    if (!films.length) {
      hall.classList.add('is-empty');
      const empty = document.createElement('p'); empty.className = 'cinema-empty'; empty.textContent = item.emptyTitle;
      rack.replaceWith(empty); return;
    }
    rack.replaceChildren(...films.map(caseFor));
    // After the cases slide in, the newest one turns to show its cover.
    if (motion.matches) select(0); else later(() => select(0), 900);
  }

  // A fresh URL each visit so edits to data.js show after a normal refresh.
  import(`./data.js?t=${Date.now()}`).then(module => { if (!signal.aborted) render(module.default); }, error => {
    if (signal.aborted) return;
    notice.textContent = `data.js 读取失败（多半是少了逗号、引号或括号）。运行 node scripts/check-cinema.mjs 查看出错位置。${error.message ? ` ${error.message}` : ''}`;
    render([]);
  });

  return () => {
    events.abort();
    timers.forEach(clearTimeout); timers.clear();
    running.forEach(animation => animation.cancel()); running.clear();
  };
}
