// Usage: node scripts/travel-recorder.mjs
// A page on this computer only for recording trips: type a city (Chinese or English) and it fills in the English name,
// the country and the nearest airport code; add dates, days, companions, a line and a photo; save → the fill-in form
// (docs/旅行行程-填写.md) and the site's data (dist/modules/travel/data.js) are both written.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { spawnSync, execFile, execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectProxy } from './lib/proxy.mjs';
import { parseTravelForm, formSource, dataSource } from './lib/travel-import.mjs';
import { airportsFromCsv, airportChoices, placeFrom } from './lib/places.mjs';
import { parseTravel, localNow, flapText } from '../dist/modules/travel/trips.js';

const root = new URL('../', import.meta.url);
const form = new URL('docs/旅行行程-填写.md', root), dataFile = new URL('dist/modules/travel/data.js', root), photos = new URL('dist/modules/travel/photos/', root);
const cache = new URL('scripts/.cache/', root), airportsFile = new URL('airports.json', cache);
const proxy = await detectProxy();
if (proxy && !process.env.NODE_USE_ENV_PROXY) {
  const child = spawnSync(process.execPath, process.argv.slice(1), { stdio: 'inherit', env: { ...process.env, HTTPS_PROXY: proxy, NODE_USE_ENV_PROXY: '1' } });
  process.exit(child.status ?? 1);
}
const page = readFileSync(new URL('recorder/index.html', import.meta.url));
const AGENT = { 'User-Agent': 'FredHub-travel-recorder/1.0 (personal website, local tool)' };

// The world's airports, downloaded once (≈ 12 MB, public domain) and kept as a small cache.
let airports = existsSync(airportsFile) ? JSON.parse(readFileSync(airportsFile, 'utf8')) : null;
async function loadAirports() {
  if (airports) return airports;
  console.log('  第一次运行：下载机场表（只需一次）…');
  const response = await fetch('https://davidmegginson.github.io/ourairports-data/airports.csv', { headers: AGENT, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`机场表下载失败 ${response.status}`);
  airports = airportsFromCsv(await response.text());
  mkdirSync(cache, { recursive: true }); writeFileSync(airportsFile, JSON.stringify(airports));
  console.log(`  ✓ ${airports.length} 个机场已缓存。`);
  return airports;
}
loadAirports().catch(error => console.log(`  ! ${error.message}（搜索城市时会再试）`));

async function places(query) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  for (const [k, v] of Object.entries({ q: query, format: 'jsonv2', addressdetails: 1, limit: 6, 'accept-language': 'en' })) url.searchParams.set(k, v);
  let response;
  try { response = await fetch(url, { headers: AGENT, signal: AbortSignal.timeout(15000) }); } catch { throw new Error('连不上地图服务（OpenStreetMap），检查一下网络 / 代理。'); }
  if (!response.ok) throw new Error(`地图服务返回 ${response.status}`);
  const list = await loadAirports(), seen = new Set();
  return (await response.json()).map(placeFrom).filter(place => { const key = `${flapText(place.name)}|${place.countryCode}`; if (seen.has(key)) return false; seen.add(key); return true; })
    .map(place => {
      const choices = airportChoices(list, place), airport = choices[0];
      return { ...place, flap: flapText(place.name), code: airport?.iata ?? '', airport: airport ? `${airport.name} · ${airport.km} km` : '', airports: choices.map(a => ({ code: a.iata, name: a.name, km: a.km })) };
    });
}

const readForm = () => parseTravelForm(readFileSync(form, 'utf8'));
function save(data) {
  const board = parseTravel(data, localNow(data.home?.timeZone || 'America/Chicago'));
  if (board.errors.length) return { errors: board.errors };
  writeFileSync(form, formSource(data)); writeFileSync(dataFile, dataSource(data));
  return { ok: true, arrivals: data.arrivals.length, departures: data.departures.length };
}
// A dropped photo → 1600px JPEG in photos/ (macOS sips), named after the trip.
function savePhoto(buffer, name) {
  const base = String(name).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'trip';
  let file = `${base}.jpg`, n = 2; while (existsSync(new URL(file, photos))) file = `${base}-${n++}.jpg`;
  const temp = join(tmpdir(), `fred-photo-${Date.now()}`); writeFileSync(temp, buffer);
  try { execFileSync('sips', ['-Z', '1600', '-s', 'format', 'jpeg', '-s', 'formatOptions', '84', temp, '--out', new URL(file, photos).pathname], { stdio: 'ignore' }); }
  catch { writeFileSync(new URL(file, photos), buffer); }
  rmSync(temp, { force: true });
  return file;
}

const send = (res, status, body, type = 'application/json; charset=utf-8') => { res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' }); res.end(type.startsWith('application/json') ? JSON.stringify(body) : body); };
const raw = req => new Promise((resolve, reject) => { const chunks = []; let size = 0; req.on('data', c => { size += c.length; if (size > 40e6) req.destroy(); chunks.push(c); }); req.on('end', () => resolve(Buffer.concat(chunks))); req.on('error', reject); });
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local');
  try {
    if (url.pathname === '/') return send(res, 200, page, 'text/html; charset=utf-8');
    if (url.pathname === '/api/trips') return send(res, 200, readForm());
    if (url.pathname === '/api/place') return send(res, 200, await places(url.searchParams.get('q') || ''));
    if (url.pathname === '/api/save' && req.method === 'POST') { const result = save(JSON.parse(String(await raw(req)))); return send(res, result.errors ? 400 : 200, result); }
    if (url.pathname === '/api/photo' && req.method === 'POST') return send(res, 200, { photo: savePhoto(await raw(req), url.searchParams.get('name')) });
    if (url.pathname.startsWith('/photo/') && /^[\w.-]+$/.test(url.pathname.slice(7))) {
      const file = new URL(url.pathname.slice(7), photos); if (!existsSync(file)) return send(res, 404, '');
      res.writeHead(200, { 'content-type': 'image/jpeg' }); return res.end(readFileSync(file));
    }
    send(res, 404, { error: 'not found' });
  } catch (error) { send(res, 500, { error: error.message }); }
});
server.listen(0, '127.0.0.1', () => {
  const address = `http://127.0.0.1:${server.address().port}/`;
  console.log(`\n✓ 旅行录入已打开：${address}${proxy ? `（经由代理 ${proxy}）` : ''}`);
  console.log('  输入城市 → 选一个 → 填日期、天数、同行 → 保存。关掉这个窗口（Ctrl+C）就结束。\n');
  if (process.platform === 'darwin' && !process.env.RECORDER_NO_OPEN) execFile('open', [address]);
});
