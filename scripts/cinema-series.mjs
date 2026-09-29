// Usage: node scripts/cinema-series.mjs
// Looks up which TMDB series (collection) each film belongs to and writes `series` into data.js,
// so e.g. all Spider-Man films stand on the shelf as one box set. Safe to run again.
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseFilms } from '../dist/modules/cinema/films.js';
import { createTmdb } from './lib/tmdb.mjs';
import { listSource } from './lib/cinema-list.mjs';
import { detectProxy } from './lib/proxy.mjs';

const root = new URL('../', import.meta.url), dataFile = new URL('dist/modules/cinema/data.js', root);
try { process.loadEnvFile(fileURLToPath(new URL('.env', root))); } catch {}
const proxy = await detectProxy();
if (proxy && !process.env.NODE_USE_ENV_PROXY) {
  const child = spawnSync(process.execPath, process.argv.slice(1), { stdio: 'inherit', env: { ...process.env, HTTPS_PROXY: proxy, NODE_USE_ENV_PROXY: '1' } });
  process.exit(child.status ?? 1);
}
const token = (process.env.TMDB_TOKEN || '').trim();
if (!token) { console.error('\n✗ 没有找到 TMDB_TOKEN（项目根目录的 .env）。\n'); process.exit(1); }
const tmdb = createTmdb(token);

const films = parseFilms((await import(`${dataFile.href}?t=${Date.now()}`)).default).films;
const movies = films.filter(film => film.tmdb?.startsWith('movie/'));
let next = 0, found = 0; const failed = [];
await Promise.all(Array.from({ length: 6 }, async () => {
  while (next < movies.length) {
    const film = movies[next++];
    try { const details = await tmdb.get(film.tmdb); if (details.belongs_to_collection?.name) { film.series = details.belongs_to_collection.name; found++; } else delete film.series; }
    catch (error) { failed.push(`${film.title}：${error.message}`); }
    process.stdout.write(`\r  查询系列 ${next}/${movies.length}`);
  }
}));
writeFileSync(dataFile, listSource(readFileSync(dataFile, 'utf8'), films));
const series = new Map(); for (const film of films) if (film.series) series.set(film.series, (series.get(film.series) ?? 0) + 1);
const sets = [...series].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]);
console.log(`\n\n✓ ${found} 部属于某个系列；片单里合成套装的有 ${sets.length} 套：`);
for (const [name, n] of sets) console.log(`  ${name} × ${n}`);
if (failed.length) console.log(`\n  ! ${failed.length} 部没查到：${failed.join('；')}`);
console.log('');
