import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseFilms, filmMeta, starCells, viewFilms } from '../dist/modules/cinema/films.js';
import { searchChoices, entryFromTmdb, insertEntry, parseRating, creator } from './lib/cinema-add.mjs';

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
console.log('PASS: cinema data rules, stars, TMDB mapping and data.js insertion');

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
