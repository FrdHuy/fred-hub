// Pure data rules for data.js; shared by the page and scripts/check-cinema.mjs.
export const TYPES = ['电影', '剧集'];
const FIELDS = ['title', 'original', 'type', 'year', 'director', 'rating', 'poster', 'tmdb'];
const TEXT = ['original', 'director', 'tmdb'];
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
  return view;
}
