import { parseFilms, filmMeta, starCells } from './films.js?v=18';

const poster = name => new URL(`./posters/${name}`, import.meta.url).href;
const pad = number => String(number).padStart(2, '0');

export function mount({ container, item }) {
  const events = new AbortController(), { signal } = events;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const timers = new Set(), flights = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); };
  let films = [], current = -1, sequence = 0;

  const hall = document.createElement('section'); hall.className = 'cinema'; hall.lang = 'zh-CN';
  hall.innerHTML = `<div class="cinema-ambient" aria-hidden="true"></div><div class="cinema-grain" aria-hidden="true"></div>
<header class="cinema-head"><p class="cinema-eyebrow">NOW SHOWING · FRED’S COLLECTION</p><h1>观影记录</h1><p class="cinema-count"></p></header>
<div class="cinema-hall"><div class="cinema-beam" aria-hidden="true"></div>
<figure class="cinema-screen" aria-live="polite"><div class="cinema-poster"></div><figcaption class="cinema-credits"></figcaption></figure></div>
<div class="cinema-disc" aria-hidden="true"><span></span></div>
<div class="cinema-shelf-wrap"><div class="cinema-shelf" role="listbox" aria-orientation="horizontal" aria-label="片单：左右方向键切换影片"></div></div>
<div class="cinema-notice" role="status"></div>
<footer class="cinema-footer"><p>影片信息与海报来自 <a href="https://www.themoviedb.org/" target="_blank" rel="noopener">TMDB</a>。This product uses the TMDB API but is not endorsed or certified by TMDB.</p></footer>`;
  container.append(hall);
  const $ = selector => hall.querySelector(selector);
  const ambient = $('.cinema-ambient'), screen = $('.cinema-screen'), frame = $('.cinema-poster'), credits = $('.cinema-credits');
  const shelf = $('.cinema-shelf'), wrap = $('.cinema-shelf-wrap'), disc = $('.cinema-disc'), notice = $('.cinema-notice');

  function discArt() { const art = document.createElement('div'); art.className = 'cinema-blank'; art.innerHTML = '<span></span>'; return art; }
  function cover(film, className) {
    if (!film.poster) return discArt();
    const image = new Image(); image.className = className; image.alt = ''; image.decoding = 'async'; image.src = poster(film.poster);
    image.addEventListener('error', () => image.replaceWith(discArt()), { once: true, signal });
    return image;
  }

  // Spine colour: a darkened average of the poster, computed once it has loaded.
  function tint(spine, film) {
    if (!film.poster) return;
    const image = new Image(); image.decoding = 'async';
    image.addEventListener('load', () => {
      if (signal.aborted) return;
      try {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 8;
        const context = canvas.getContext('2d', { willReadFrequently: true }); context.drawImage(image, 0, 0, 8, 8);
        const data = context.getImageData(0, 0, 8, 8).data; let r = 0, g = 0, b = 0;
        for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
        const n = data.length / 4, k = .62;
        spine.style.setProperty('--spine', `rgb(${Math.round(r / n * k)} ${Math.round(g / n * k)} ${Math.round(b / n * k)})`);
      } catch {}
    }, { once: true, signal });
    image.src = poster(film.poster);
  }

  function spineFor(film, index) {
    const spine = document.createElement('button'); spine.type = 'button'; spine.className = 'cinema-spine';
    spine.setAttribute('role', 'option'); spine.setAttribute('aria-selected', 'false'); spine.tabIndex = -1;
    spine.setAttribute('aria-label', [film.title, film.year].filter(Boolean).join('，'));
    const code = document.createElement('small'); code.textContent = `FH-${pad(index + 1)}`;
    const title = document.createElement('span'); title.className = 'cinema-spine-title'; title.textContent = film.title;
    const year = document.createElement('small'); year.textContent = film.year ?? '';
    spine.append(code, title, year);
    if (!film.poster) spine.classList.add('is-blank');
    tint(spine, film);
    spine.addEventListener('click', () => select(index), { signal });
    return spine;
  }

  function project(film, index) {
    frame.replaceChildren(cover(film, 'cinema-poster-image'));
    credits.replaceChildren();
    const number = document.createElement('p'); number.className = 'cinema-reel'; number.textContent = `REEL ${pad(index + 1)} / ${pad(films.length)}`;
    const title = document.createElement('h2'); title.className = 'cinema-title'; title.setAttribute('aria-label', film.title);
    Array.from(film.title).forEach((char, i) => {
      const span = document.createElement('span'); span.textContent = char; span.style.setProperty('--i', Math.min(i, 14)); span.setAttribute('aria-hidden', 'true'); title.append(span);
    });
    credits.append(number, title);
    const delay = Math.min(Array.from(film.title).length, 14);
    if (film.original) { const original = document.createElement('p'); original.className = 'cinema-original'; original.textContent = film.original; original.style.setProperty('--i', delay + 1); credits.append(original); }
    const metaText = filmMeta(film);
    if (metaText) { const meta = document.createElement('p'); meta.className = 'cinema-meta'; meta.textContent = metaText; meta.style.setProperty('--i', delay + 2); credits.append(meta); }
    if (film.rating !== undefined) {
      const stars = document.createElement('p'); stars.className = 'cinema-stars'; stars.setAttribute('aria-label', `评分 ${film.rating} / 5`);
      starCells(film.rating).forEach((fill, i) => {
        const star = document.createElement('span'); star.setAttribute('aria-hidden', 'true'); star.textContent = '★';
        star.style.setProperty('--fill', `${fill * 100}%`); star.style.setProperty('--i', delay + 3 + i); stars.append(star);
      });
      credits.append(stars);
    }
    ambient.style.backgroundImage = film.poster ? `url("${poster(film.poster)}")` : 'none';
    screen.classList.remove('is-rolling'); void screen.offsetWidth; screen.classList.add('is-rolling');
  }

  // Disc leaves the pulled case and travels up into the projector while spinning.
  function fly(spine) {
    flights.forEach(flight => flight.cancel()); flights.clear();
    const from = spine.getBoundingClientRect(), to = frame.getBoundingClientRect(), box = hall.getBoundingClientRect();
    const size = disc.offsetWidth, x0 = from.left + from.width / 2 - box.left - size / 2, y0 = from.top - box.top - size / 2;
    const x1 = to.left + to.width / 2 - box.left - size / 2, y1 = to.top + to.height / 2 - box.top - size / 2;
    const flight = disc.animate([
      { transform: `translate(${x0}px,${y0}px) scale(.35) rotate(0deg)`, opacity: 0 },
      { transform: `translate(${x0}px,${y0 - 60}px) scale(.8) rotate(160deg)`, opacity: 1, offset: .3 },
      { transform: `translate(${x1}px,${y1}px) scale(1) rotate(720deg)`, opacity: 0 },
    ], { duration: 720, easing: 'cubic-bezier(.22,.75,.2,1)' });
    flights.add(flight); flight.finished.catch(() => {}).finally(() => flights.delete(flight));
  }

  function select(index, { focus = false, quiet = false } = {}) {
    if (!films.length) return;
    index = Math.max(0, Math.min(films.length - 1, index));
    const spines = [...shelf.children];
    if (focus) spines[index].focus({ preventScroll: true });
    if (index === current) return;
    spines.forEach((spine, i) => { spine.setAttribute('aria-selected', String(i === index)); spine.tabIndex = i === index ? 0 : -1; spine.classList.toggle('is-pulled', i === index); });
    // Centre the pulled spine by scrolling the shelf only, never the page.
    const spineBox = spines[index].getBoundingClientRect(), shelfBox = shelf.getBoundingClientRect();
    shelf.scrollTo({ left: shelf.scrollLeft + spineBox.left - shelfBox.left - (shelf.clientWidth - spineBox.width) / 2, behavior: motion.matches ? 'auto' : 'smooth' });
    current = index; const token = ++sequence;
    if (quiet || motion.matches) { project(films[index], index); return; }
    fly(spines[index]);
    screen.classList.add('is-switching');
    later(() => { if (token !== sequence) return; screen.classList.remove('is-switching'); project(films[index], index); }, 380);
  }

  shelf.addEventListener('keydown', e => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1, ArrowDown: 1 }[e.key];
    if (step !== undefined) { e.preventDefault(); select(current + step, { focus: true }); }
    else if (e.key === 'Home') { e.preventDefault(); select(0, { focus: true }); }
    else if (e.key === 'End') { e.preventDefault(); select(films.length - 1, { focus: true }); }
  }, { signal });
  let frameRequest = 0;
  wrap.addEventListener('pointermove', e => {
    cancelAnimationFrame(frameRequest);
    frameRequest = requestAnimationFrame(() => { const box = wrap.getBoundingClientRect(); wrap.style.setProperty('--mx', `${e.clientX - box.left}px`); wrap.style.setProperty('--my', `${e.clientY - box.top}px`); });
  }, { signal });

  function render(data) {
    const parsed = parseFilms(data); films = parsed.films;
    if (parsed.errors.length) notice.textContent = `片单里有 ${parsed.errors.length} 条没显示：${parsed.errors.join('；')}。运行 node scripts/check-cinema.mjs 可查看详情。`;
    const movies = films.filter(film => film.type === '电影').length, shows = films.filter(film => film.type === '剧集').length;
    $('.cinema-count').textContent = films.length ? [`共 ${films.length} 部`, movies && `${movies} 电影`, shows && `${shows} 剧集`].filter(Boolean).join(' · ') : '';
    if (!films.length) {
      hall.classList.add('is-empty');
      const title = document.createElement('h2'); title.className = 'cinema-title'; title.textContent = item.emptyTitle;
      const text = document.createElement('p'); text.className = 'cinema-original'; text.textContent = item.emptyText;
      frame.replaceChildren(discArt()); credits.replaceChildren(title, text); return;
    }
    shelf.replaceChildren(...films.map(spineFor));
    const start = () => select(0, { quiet: true });
    if (motion.matches) start(); else later(start, 650);
  }

  hall.dataset.power = motion.matches ? 'on' : 'off';
  if (!motion.matches) later(() => { hall.dataset.power = 'on'; }, 80);
  // A fresh URL each visit so edits to data.js show after a normal refresh.
  import(`./data.js?t=${Date.now()}`).then(module => { if (!signal.aborted) render(module.default); }, error => {
    if (signal.aborted) return;
    notice.textContent = `data.js 读取失败（多半是少了逗号、引号或括号）。运行 node scripts/check-cinema.mjs 查看出错位置。${error.message ? ` ${error.message}` : ''}`;
    render([]);
  });

  return () => {
    events.abort(); sequence++;
    timers.forEach(clearTimeout); timers.clear();
    flights.forEach(flight => flight.cancel()); flights.clear();
    cancelAnimationFrame(frameRequest);
  };
}
