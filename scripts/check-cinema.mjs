import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseFilms, filmMeta, starCells, viewFilms } from '../dist/modules/cinema/films.js';
import { pose } from '../dist/modules/cinema/flow.js';
import { searchChoices, entryFromTmdb, insertEntry, parseRating, creator, pickPoster, posterLanguage, originCountries } from './lib/cinema-add.mjs';

// Data rules.
assert.deepEqual(parseFilms([{ title: ' 花样年华 ' }]).films, [{ title: '花样年华' }]);
assert.equal(parseFilms({}).errors.length, 1);
const mixed = parseFilms([{ title: 'ok', rating: 4.5 }, { title: '' }, { title: 'x', rating: 4.3 }, { title: 'x', raiting: 4 }, { title: 'x', type: '纪录片' }, { title: 'x', year: '2000' }, { title: 'x', poster: '../a.jpg' }, null]);
assert.equal(mixed.films.length, 1);
assert.deepEqual(mixed.errors.map(error => error.slice(0, 5)), ['第 2 条', '第 3 条', '第 4 条', '第 5 条', '第 6 条', '第 7 条', '第 8 条']);
assert.match(mixed.errors[2], /未知字段 raiting/);
assert.equal(filmMeta({ year: 2000, type: '电影', director: '王家卫' }), '2000 · 电影 · 王家卫');
assert.equal(filmMeta({ title: 'x' }), '');
assert.deepEqual(starCells(3.5), [1, 1, 1, .5, 0]);
assert.deepEqual(starCells(0), [0, 0, 0, 0, 0]);
const sample = [{ title: 'a', type: '电影', year: 2000, rating: 3 }, { title: 'b', type: '剧集', year: 2015 }, { title: 'c', type: '电影', year: 2019, rating: 5 }, { title: 'd', type: '电影', rating: 3 }];
const titles = view => view.map(({ film }) => film.title).join('');
assert.equal(titles(viewFilms(sample)), 'abcd');
assert.equal(titles(viewFilms(sample, { type: '电影' })), 'acd');
assert.equal(titles(viewFilms(sample, { order: 'rating' })), 'cadb');
assert.equal(titles(viewFilms(sample, { order: 'year' })), 'cbad');
assert.equal(viewFilms(sample, { type: '剧集' })[0].index, 1);

// add-movie helpers, from mocked TMDB responses.
const choices = searchChoices([{ media_type: 'person', id: 1 }, { media_type: 'movie', id: 843, title: '花样年华', original_title: '花樣年華', release_date: '2000-09-29' }, { media_type: 'tv', id: 7, name: '剧', first_air_date: '' }]);
assert.deepEqual(choices, [{ kind: 'movie', id: 843, title: '花样年华', original: '花樣年華', year: 2000 }, { kind: 'tv', id: 7, title: '剧', original: undefined, year: undefined }]);
assert.equal(creator('movie', { credits: { crew: [{ job: 'Writer', name: 'a' }, { job: 'Director', name: '王家卫' }] } }), '王家卫');
assert.equal(creator('tv', { created_by: [{ name: 'A' }, { name: 'B' }, { name: 'C' }] }), 'A / B');
const entry = entryFromTmdb('movie', { id: 843, title: '花样年华', original_title: '花样年华', release_date: '2000-09-29', credits: { crew: [] } }, { rating: 5, poster: 'movie-843.jpg' });
assert.deepEqual(entry, { title: '花样年华', type: '电影', year: 2000, rating: 5, poster: 'movie-843.jpg', tmdb: 'movie/843' });
assert.deepEqual(parseFilms([entry]).errors, []);
const inserted = insertEntry('// note\nexport default [\n  { title: "old" },\n];\n', entry);
assert.ok(inserted.indexOf('花样年华') < inserted.indexOf('old'));
assert.equal((await import(`data:text/javascript,${encodeURIComponent(inserted)}`)).default.length, 2);
assert.throws(() => insertEntry('const x = 1;', entry));
assert.equal(parseRating(''), undefined);
assert.equal(parseRating('4.5'), 4.5);
assert.throws(() => parseRating('4.2'));
assert.throws(() => parseRating('9'));
// Shelf geometry: front in the middle, mirrored sides, folding and tightening toward the edges.
assert.deepEqual(pose(0, 300, 14), { x: 0, z: -0, turn: -0 });
const poses = [0, .5, 1, 2, 3, 6, 10].map(o => pose(o, 300, 14));
for (let i = 1; i < poses.length; i++) { assert.ok(poses[i].x > poses[i - 1].x); assert.ok(poses[i].turn < poses[i - 1].turn); }
assert.ok(poses.at(-1).turn < -87.5 && poses[2].turn > -70);
assert.ok(poses[6].x - poses[5].x < 25 * 4 && poses[2].x > 150);
assert.equal(pose(-2, 300, 14).x, -pose(2, 300, 14).x);
assert.equal(pose(-2, 300, 14).turn, -pose(2, 300, 14).turn);
// Original-language poster choice.
const posters = [
  { file_path: '/zhcn.jpg', iso_639_1: 'zh', iso_3166_1: 'CN', vote_count: 9 },
  { file_path: '/zhhk.jpg', iso_639_1: 'zh', iso_3166_1: 'HK', vote_count: 2 },
  { file_path: '/en.jpg', iso_639_1: 'en', vote_count: 50 },
  { file_path: '/plain.jpg', iso_639_1: null, vote_count: 80 },
];
assert.equal(pickPoster(posters, { language: 'zh', countries: ['HK'] }), '/zhhk.jpg');
assert.equal(pickPoster(posters, { language: 'zh', countries: ['CN'] }), '/zhcn.jpg');
assert.equal(pickPoster(posters, { language: 'zh' }), '/zhcn.jpg');
assert.equal(pickPoster(posters, { language: 'en', countries: ['US'] }), '/en.jpg');
assert.equal(pickPoster(posters, { language: 'fr', countries: ['FR'] }), undefined);
assert.equal(posterLanguage({ original_language: 'cn' }), 'zh');
assert.deepEqual(originCountries({ origin_country: ['HK'], production_countries: [{ iso_3166_1: 'HK' }, { iso_3166_1: 'FR' }] }), ['HK', 'FR']);
console.log('PASS: cinema data rules, stars, TMDB mapping and data.js insertion');

// Poster picker: TMDB items → cards, shelves → TMDB calls, picks → data.js.
const { card, shelf, applyChanges, listSource } = await import('./lib/cinema-list.mjs');
assert.deepEqual(card({ id: 27205, title: '盗梦空间', original_title: 'Inception', release_date: '2010-07-15', poster_path: '/a.jpg' }, 'movie'), { id: 'movie/27205', kind: 'movie', title: '盗梦空间', original: 'Inception', year: 2010, poster: '/a.jpg' });
assert.equal(card({ id: 1, media_type: 'person' }), null);
assert.equal(card({ id: 5, media_type: 'tv', name: '剧', original_name: '剧' }).original, undefined);
assert.deepEqual(shelf({ kind: 'movie', list: 'top', page: 2 }), ['movie/top_rated', { page: 2 }]);
assert.deepEqual(shelf({ kind: 'tv', list: 'year', year: 2015 }), ['discover/tv', { sort_by: 'vote_count.desc', page: 1, first_air_date_year: 2015 }]);
assert.equal(shelf({ kind: 'movie', list: 'zh' })[1].with_original_language, 'zh|cn');
assert.throws(() => shelf({ kind: 'movie', list: 'nope' }));
const list = [{ title: 'A', rating: 4, tmdb: 'movie/1' }, { title: 'B', tmdb: 'movie/2' }, { title: 'C', rating: 3, tmdb: 'movie/3' }];
const changed = applyChanges(list, { added: [{ title: 'N', tmdb: 'movie/9' }, { title: 'dup', tmdb: 'movie/1' }], rated: { 'movie/2': 4.5, 'movie/1': null }, removed: ['movie/3'] });
assert.deepEqual(changed, [{ title: 'N', tmdb: 'movie/9' }, { title: 'A', tmdb: 'movie/1' }, { title: 'B', rating: 4.5, tmdb: 'movie/2' }], 'new first, ratings changed or cleared, removed dropped, no duplicates');
const written = listSource('// 注释\nexport default [\n  { title: "old" },\n];\n', [{ tmdb: 'movie/9', title: 'N', year: 2010, type: '电影' }]);
assert.ok(written.startsWith('// 注释\nexport default [\n  { title: "N", type: "电影", year: 2010, tmdb: "movie/9" },\n];'), 'header kept, fields in the usual order');
assert.equal((await import(`data:text/javascript,${encodeURIComponent(written)}`)).default[0].title, 'N');
assert.equal(listSource('export default [\n];\n', []), 'export default [\n];\n');
const { tmdbStars } = await import('./lib/cinema-add.mjs');
assert.deepEqual([tmdbStars({ vote_average: 8.4, vote_count: 900 }), tmdbStars({ vote_average: 7.6, vote_count: 50 }), tmdbStars({ vote_average: 9, vote_count: 3 }), tmdbStars({})], [4, 4, undefined, undefined], "the film's own score, in half stars, only with enough votes");
assert.equal(tmdbStars({ vote_average: 6.5, vote_count: 100 }), 3.5);
const { systemProxy } = await import('./lib/proxy.mjs');
assert.equal(systemProxy('<dictionary> {\n  HTTPEnable : 1\n  HTTPPort : 7890\n  HTTPProxy : 127.0.0.1\n  HTTPSEnable : 1\n  HTTPSPort : 7890\n  HTTPSProxy : 127.0.0.1\n}'), 'http://127.0.0.1:7890');
assert.equal(systemProxy('  HTTPSEnable : 0\n  HTTPEnable : 0'), null);
console.log('PASS: poster picker — cards, shelves, add / remove, data.js rewrite, TMDB score, system proxy');

// The real data file.
let data;
try { data = (await import('../dist/modules/cinema/data.js')).default; }
catch (error) {
  // node --check prints the file, line and a caret under the problem.
  const source = readFileSync(new URL('../dist/modules/cinema/data.js', import.meta.url));
  const where = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: source, encoding: 'utf8' }).stderr
    .split('\n').slice(0, 5).join('\n').replace(/^\[stdin\]:(\d+)/, 'data.js 第 $1 行（问题常在这一行，或上一行末尾少了逗号）');
  console.error(`✗ data.js 无法读取（多半是少了逗号、引号或括号）：\n${where || error.message}`); process.exit(1);
}
const { films, errors } = parseFilms(data);
const missing = films.filter(film => film.poster && !existsSync(new URL(`../dist/modules/cinema/posters/${film.poster}`, import.meta.url))).map(film => `「${film.title}」的海报 posters/${film.poster} 不存在`);
const tmdbIds = films.map(film => film.tmdb).filter(Boolean);
const duplicates = tmdbIds.filter((id, index) => tmdbIds.indexOf(id) !== index).map(id => `${id} 重复出现`);
const problems = [...errors, ...missing, ...duplicates];
if (problems.length) { console.error(`✗ 片单有 ${problems.length} 处问题：\n  ${problems.join('\n  ')}`); process.exit(1); }
console.log(`PASS: data.js — ${films.length} 部，海报齐全`);
