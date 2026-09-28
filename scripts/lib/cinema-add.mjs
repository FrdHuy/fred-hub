// Offline-testable helpers for add-movie.mjs: TMDB responses → data.js entries.
const year = date => (/^\d{4}/.test(date || '') ? Number(date.slice(0, 4)) : undefined);

export function searchChoices(results = []) {
  return results.filter(item => item.media_type === 'movie' || item.media_type === 'tv').slice(0, 5).map(item => ({
    kind: item.media_type, id: item.id,
    title: item.title || item.name, original: item.original_title || item.original_name,
    year: year(item.release_date || item.first_air_date),
  }));
}

export function creator(kind, details) {
  const names = kind === 'movie'
    ? (details.credits?.crew || []).filter(person => person.job === 'Director').map(person => person.name)
    : (details.created_by || []).map(person => person.name);
  return [...new Set(names)].slice(0, 2).join(' / ');
}

export function posterName(kind, id) { return `${kind}-${id}.jpg`; }

export function entryFromTmdb(kind, details, { rating, poster } = {}) {
  const title = details.title || details.name, original = details.original_title || details.original_name;
  const entry = { title, type: kind === 'movie' ? '电影' : '剧集' };
  if (original && original !== title) entry.original = original;
  const released = year(details.release_date || details.first_air_date);
  if (released) entry.year = released;
  const director = creator(kind, details);
  if (director) entry.director = director;
  if (rating !== undefined) entry.rating = rating;
  if (poster) entry.poster = poster;
  entry.tmdb = `${kind}/${details.id}`;
  // Keep the same field order as the hand-written examples.
  const order = ['title', 'original', 'type', 'year', 'director', 'rating', 'poster', 'tmdb'];
  return Object.fromEntries(order.filter(key => key in entry).map(key => [key, entry[key]]));
}

export function entrySource(entry) {
  return `  { ${Object.entries(entry).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join(', ')} },`;
}

export function insertEntry(source, entry) {
  const marker = source.match(/export default \[[^\n]*\n/);
  if (!marker) throw new Error('data.js 里找不到 “export default [” 这一行');
  const at = marker.index + marker[0].length;
  return source.slice(0, at) + entrySource(entry) + '\n' + source.slice(at);
}

export function parseRating(text) {
  if (text === undefined || String(text).trim() === '') return undefined;
  const value = Number(text);
  if (!(value >= 0 && value <= 5 && Number.isInteger(value * 2))) throw new Error('评分应在 0–5 之间，以 0.5 为一档，如 4 或 4.5');
  return value;
}
