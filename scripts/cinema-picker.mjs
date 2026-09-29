// Usage: node scripts/cinema-picker.mjs
// A poster wall on this computer only: browse TMDB shelves (高分 / 大家都看过 / 华语 / 日韩 / 按年份 / 搜索),
// click what you have seen, then save — films are added to dist/modules/cinema/data.js with posters and their TMDB score.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync, execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseFilms } from '../dist/modules/cinema/films.js';
import { entryFromTmdb, posterName, tmdbStars } from './lib/cinema-add.mjs';
import { detectProxy } from './lib/proxy.mjs';
import { createTmdb } from './lib/tmdb.mjs';
import { card, shelf, applyChanges, listSource } from './lib/cinema-list.mjs';

const root = new URL('../', import.meta.url), cinema = new URL('dist/modules/cinema/', root), dataFile = new URL('data.js', cinema);
try { process.loadEnvFile(fileURLToPath(new URL('.env', root))); } catch {}
// Uses the proxy this Mac already has (system proxy / Clash), so nothing needs to be set up.
const proxy = await detectProxy();
if (proxy && !process.env.NODE_USE_ENV_PROXY) {
  const child = spawnSync(process.execPath, process.argv.slice(1), { stdio: 'inherit', env: { ...process.env, HTTPS_PROXY: proxy, NODE_USE_ENV_PROXY: '1' } });
  process.exit(child.status ?? 1);
}
const token = (process.env.TMDB_TOKEN || '').trim();
if (!token) { console.error('\n✗ 没有找到 TMDB_TOKEN（项目根目录的 .env）。\n'); process.exit(1); }
const tmdb = createTmdb(token);
const page = readFileSync(new URL('picker/index.html', import.meta.url));
const images = new Map();   // poster thumbnails already fetched this session

const films = async () => parseFilms((await import(`${dataFile.href}?t=${Date.now()}`)).default).films;
const send = (res, status, body, type = 'application/json; charset=utf-8') => { res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' }); res.end(type.startsWith('application/json') ? JSON.stringify(body) : body); };
const body = req => new Promise((resolve, reject) => { let data = ''; req.on('data', chunk => { data += chunk; if (data.length > 1e6) req.destroy(); }); req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (error) { reject(error); } }); });

// One new film: details, director/creator, its TMDB score, the original-language poster (500px), a data.js entry.
async function fetchFilm(id) {
  const [kind, number] = id.split('/');
  const details = await tmdb.get(`${kind}/${number}`, kind === 'movie' ? { append_to_response: 'credits' } : {});
  let poster;
  try {
    const path = await tmdb.originalPoster(kind, number, details);
    if (path) { poster = posterName(kind, number); const file = new URL(`posters/${poster}`, cinema); if (!existsSync(file)) await tmdb.download(path, file); }
  } catch { poster = undefined; }
  return entryFromTmdb(kind, details, { rating: tmdbStars(details), poster });
}

async function save({ added = [], removed = [], curated = {} }) {
  const current = await films(), have = new Set(current.map(f => f.tmdb));
  const fresh = added.filter(a => !have.has(a.id));
  const entries = new Array(fresh.length); let next = 0, failed = [];
  // Four at a time: polite to TMDB, quick enough for a few hundred films.
  await Promise.all(Array.from({ length: Math.min(4, fresh.length) }, async () => {
    while (next < fresh.length) { const i = next++; try { entries[i] = await fetchFilm(fresh[i].id); } catch (error) { failed.push(`${fresh[i].title}：${error.message}`); } }
  }));
  const list = applyChanges(current, { added: entries.filter(Boolean), removed, curated });
  writeFileSync(dataFile, listSource(readFileSync(dataFile, 'utf8'), list));
  return { total: list.length, added: entries.filter(Boolean).length, removed: removed.length, picks: list.filter(film => film.pick).length, failed };
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local');
  try {
    if (url.pathname === '/') return send(res, 200, page, 'text/html; charset=utf-8');
    if (url.pathname === '/api/films') return send(res, 200, (await films()).filter(film => film.tmdb).map(({ title, original, rating, tmdb: id, poster, year, pick, note }) => ({ id, title, original, rating, poster, year, pick: Boolean(pick), note: note ?? '' })));
    if (url.pathname === '/api/shelf') {
      const [path, params] = shelf({ kind: url.searchParams.get('kind'), list: url.searchParams.get('list'), year: url.searchParams.get('year'), page: url.searchParams.get('page') || 1 });
      const data = await tmdb.get(path, params);
      return send(res, 200, { items: data.results.map(item => card(item, url.searchParams.get('kind'))).filter(Boolean), more: data.page < Math.min(data.total_pages, 20) });
    }
    if (url.pathname === '/api/search') {
      const data = await tmdb.get('search/multi', { query: url.searchParams.get('q') || '', include_adult: 'false' });
      return send(res, 200, { items: data.results.map(item => card(item)).filter(Boolean), more: false });
    }
    if (url.pathname.startsWith('/img/')) {
      const path = url.pathname.slice(4);
      if (!/^\/[\w.-]+\.(jpg|png)$/.test(path)) return send(res, 404, '');
      if (!images.has(path)) images.set(path, await tmdb.image(path, 'w342'));
      res.writeHead(200, { 'content-type': 'image/jpeg', 'cache-control': 'max-age=86400' }); return res.end(images.get(path));
    }
    if (url.pathname.startsWith('/poster/') && /^[\w.-]+$/.test(url.pathname.slice(8))) {
      const file = new URL(`posters/${url.pathname.slice(8)}`, cinema);
      if (!existsSync(file)) return send(res, 404, ''); res.writeHead(200, { 'content-type': 'image/jpeg' }); return res.end(readFileSync(file));
    }
    if (url.pathname === '/api/save' && req.method === 'POST') return send(res, 200, await save(await body(req)));
    send(res, 404, { error: 'not found' });
  } catch (error) { send(res, 500, { error: error.message }); }
});
// Only this computer can reach it.
server.listen(0, '127.0.0.1', () => {
  const address = `http://127.0.0.1:${server.address().port}/`;
  console.log(`\n✓ 片单勾选器已打开：${address}`);
  console.log(`  看过的点一下，选完点「保存到片单」。${proxy ? `（经由代理 ${proxy}）` : ''}关掉这个窗口（Ctrl+C）就结束。\n`);
  if (process.platform === 'darwin' && !process.env.PICKER_NO_OPEN) execFile('open', [address]);
});
