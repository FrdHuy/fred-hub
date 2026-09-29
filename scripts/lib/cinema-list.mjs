// Pure helpers for the poster picker: TMDB list items → cards, and picks → a rewritten data.js.
import { entrySource } from './cinema-add.mjs';

const ORDER = ['title', 'original', 'type', 'year', 'director', 'rating', 'poster', 'tmdb', 'series', 'pick', 'note'];
const year = date => (/^\d{4}/.test(date || '') ? Number(date.slice(0, 4)) : undefined);

// A TMDB list/search item → what the picker shows.
export function card(item, kind = item.media_type) {
  if (kind !== 'movie' && kind !== 'tv') return null;
  const title = item.title || item.name, original = item.original_title || item.original_name;
  return { id: `${kind}/${item.id}`, kind, title, original: original !== title ? original : undefined, year: year(item.release_date || item.first_air_date), poster: item.poster_path || null };
}

// Which TMDB call fills a picker shelf. `list` is one of the tabs; `year` only for the year shelf.
export function shelf({ kind, list, year: y, page = 1 }) {
  const discover = `discover/${kind}`, base = { sort_by: 'vote_count.desc', page };
  const releaseYear = kind === 'movie' ? 'primary_release_year' : 'first_air_date_year';
  switch (list) {
    case 'top': return [`${kind}/top_rated`, { page }];
    case 'known': return [discover, base];
    case 'zh': return [discover, { ...base, with_original_language: 'zh|cn' }];
    case 'asia': return [discover, { ...base, with_original_language: 'ja|ko' }];
    case 'year': return [discover, { ...base, [releaseYear]: y }];
    default: throw new Error(`没有这个分类：${list}`);
  }
}

// Picks → the new list: new films first (in the order they were ticked), ratings updated, un-ticked ones removed.
// `curated`: id → { pick, note } — the screening list and Fred's line for each film.
export function applyChanges(films, { added = [], rated = {}, removed = [], curated = {} }) {
  const gone = new Set(removed), have = new Set(films.map(film => film.tmdb));
  const kept = films.filter(film => !gone.has(film.tmdb)).map(film => film.tmdb in rated ? withRating(film, rated[film.tmdb]) : film).map(film => film.tmdb in curated ? curate(film, curated[film.tmdb]) : film);
  return [...added.filter(film => !have.has(film.tmdb)), ...kept];
}
const curate = (film, { pick, note }) => { const copy = { ...film }; if (pick) copy.pick = true; else delete copy.pick; const line = String(note ?? '').trim(); if (line) copy.note = line; else delete copy.note; return copy; };
const withRating = (film, rating) => { const copy = { ...film }; if (rating === null) delete copy.rating; else copy.rating = rating; return copy; };

// data.js keeps its comment header; every film is one line with the usual field order.
export function listSource(source, films) {
  const at = source.indexOf('export default [');
  const header = at >= 0 ? source.slice(0, at) : '';
  const lines = films.map(film => entrySource(Object.fromEntries(ORDER.filter(key => film[key] !== undefined).map(key => [key, film[key]]))));
  return `${header}export default [\n${lines.join('\n')}${lines.length ? '\n' : ''}];\n`;
}
