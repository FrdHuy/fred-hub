// Pure data rules for data.js; shared by the page and scripts/check-cinema.mjs.
export const TYPES = ['电影', '剧集'];
const FIELDS = ['title', 'original', 'type', 'year', 'director', 'rating', 'poster', 'tmdb', 'series', 'pick', 'note'];
const TEXT = ['original', 'director', 'tmdb', 'series', 'note'];
export const POSTER_PATTERN = /^[\w.-]+\.(jpe?g|png|webp)$/i;

function problem(entry) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return '应是 { … } 形式的一条影片';
  const unknown = Object.keys(entry).find(key => !FIELDS.includes(key));
  if (unknown) return `未知字段 ${unknown}（可用：${FIELDS.join('、')}）`;
  if (typeof entry.title !== 'string' || !entry.title.trim()) return 'title 必填';
  for (const key of TEXT) if (key in entry && typeof entry[key] !== 'string') return `${key} 应是文字`;
  if ('type' in entry && !TYPES.includes(entry.type)) return `type 只能是 ${TYPES.join(' 或 ')}`;
  if ('year' in entry && !(Number.isInteger(entry.year) && entry.year >= 1880 && entry.year <= 2100)) return 'year 应是 1880–2100 的整数';
  if ('rating' in entry && !(typeof entry.rating === 'number' && entry.rating >= 0 && entry.rating <= 5 && Number.isInteger(entry.rating * 2))) return 'rating 应在 0–5 之间，以 0.5 为一档';
  if ('pick' in entry && typeof entry.pick !== 'boolean') return 'pick 只能是 true（放进放映表）';
  if ('poster' in entry && !(typeof entry.poster === 'string' && POSTER_PATTERN.test(entry.poster))) return 'poster 只写 posters/ 里的文件名，如 in-the-mood.jpg';
  return '';
}

export function parseFilms(data) {
  if (!Array.isArray(data)) return { films: [], errors: ['data.js 应导出一个数组：export default [ … ]'] };
  const films = [], errors = [];
  data.forEach((entry, index) => {
    const reason = problem(entry);
    if (reason) errors.push(`第 ${index + 1} 条：${reason}`);
    else films.push({ ...entry, title: entry.title.trim() });
  });
  return { films, errors };
}

export function filmMeta(film) {
  return [film.year, film.type, film.director].filter(value => value !== undefined && value !== '').join(' · ');
}

// Five cells, each 0 / 0.5 / 1 filled.
export function starCells(rating) {
  return Array.from({ length: 5 }, (_, index) => Math.max(0, Math.min(1, rating - index)));
}

export const ORDERS = { added: '最近加入', rating: '评分', year: '年份' };
// Filter by type and sort; keeps each film's original position (its FH number).
export function viewFilms(films, { type = '', order = 'added' } = {}) {
  const view = films.map((film, index) => ({ film, index })).filter(({ film }) => !type || film.type === type);
  const key = order === 'rating' ? 'rating' : order === 'year' ? 'year' : '';
  if (key) view.sort((a, b) => (b.film[key] ?? -Infinity) - (a.film[key] ?? -Infinity) || a.index - b.index);
  return boxSets(view);
}

// A series with two or more films on the shelf becomes one box set, standing where its first film would stand.
// Its members are in release order; the cover is the first film of the series.
export function boxSets(view) {
  const members = new Map();
  for (const item of view) if (item.film.series) members.set(item.film.series, [...(members.get(item.film.series) ?? []), item]);
  const placed = new Set();
  return view.flatMap(item => {
    const set = item.film.series && members.get(item.film.series);
    if (!set || set.length < 2) return [item];
    if (placed.has(item.film.series)) return [];
    placed.add(item.film.series);
    const ordered = [...set].sort((a, b) => (a.film.year ?? 9999) - (b.film.year ?? 9999) || a.index - b.index);
    return [{ film: ordered[0].film, index: item.index, set: { name: item.film.series, members: ordered } }];
  });
}
// "蜘蛛侠（系列）" → "蜘蛛侠" for the spine.
export const seriesLabel = name => String(name).replace(/[（(]?系列[）)]?$|\s*Collection$/i, '').trim();

// ——— Two layers: the screening list up front, everything seen behind it. ———

// The films Fred picked (pick: true), in list order. Until he picks any, the best-rated ones stand in.
export function screening(films, fallback = 16) {
  const picked = films.filter(film => film.pick);
  if (picked.length) return picked;
  return [...films].filter(film => film.rating !== undefined).sort((a, b) => b.rating - a.rating || (b.year ?? 0) - (a.year ?? 0)).slice(0, fallback);
}

// A viewing report: the numbers people actually read.
export function report(films) {
  const count = (list, key) => { const tally = new Map(); for (const film of list) for (const value of [].concat(key(film) ?? [])) if (value) tally.set(value, (tally.get(value) ?? 0) + 1); return [...tally].sort((a, b) => b[1] - a[1])[0] ?? null; };
  const years = films.map(film => film.year).filter(Boolean);
  return {
    total: films.length, movies: films.filter(film => film.type !== '剧集').length, shows: films.filter(film => film.type === '剧集').length,
    director: count(films.filter(film => film.type !== '剧集'), film => film.director?.split(' / ')),
    decade: count(films, film => film.year && `${Math.floor(film.year / 10) * 10}s`),
    series: count(films, film => film.series),
    span: years.length ? [Math.min(...years), Math.max(...years)] : null,
  };
}

// Newest year first; films without a year at the end.
export function byYear(films) {
  const groups = new Map();
  for (const film of films) { const key = film.year ?? '—'; groups.set(key, [...(groups.get(key) ?? []), film]); }
  return [...groups].sort((a, b) => (b[0] === '—' ? -1 : b[0]) - (a[0] === '—' ? -1 : a[0]));
}

// “你看过几部？”: how many of the screening list a visitor has seen, and what to watch next.
export function overlap(list, seen) {
  const mine = list.filter(film => seen.has(film.tmdb ?? film.title));
  const unseen = list.filter(film => !seen.has(film.tmdb ?? film.title)).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  return { seen: mine.length, total: list.length, percent: list.length ? Math.round(mine.length / list.length * 100) : 0, next: unseen.slice(0, 3) };
}
