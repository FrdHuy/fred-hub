// Usage: node scripts/add-movie.mjs 花样年华 [4.5]
// Looks the title up on TMDB (local machine only), saves the poster and prepends an entry to data.js.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { parseFilms } from '../dist/modules/cinema/films.js';
import { searchChoices, entryFromTmdb, insertEntry, parseRating, posterName } from './lib/cinema-add.mjs';

const root = new URL('../', import.meta.url), cinema = new URL('dist/modules/cinema/', root);
const dataFile = new URL('data.js', cinema);
const fail = message => { console.error(`\n✗ ${message}\n`); process.exit(1); };

try { process.loadEnvFile(fileURLToPath(new URL('.env', root))); } catch {}
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
if (proxy && !process.env.NODE_USE_ENV_PROXY) {
  const child = spawnSync(process.execPath, process.argv.slice(1), { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1' } });
  process.exit(child.status ?? 1);
}

const [query, ratingArg] = process.argv.slice(2);
if (!query) fail('请写片名，例如：node scripts/add-movie.mjs 花样年华 4.5');
const token = (process.env.TMDB_TOKEN || '').trim();
if (!token) fail('没有找到 TMDB_TOKEN。请打开项目根目录的 .env，把 Token 粘贴在 TMDB_TOKEN= 后面。');
let rating;
try { rating = parseRating(ratingArg); } catch (error) { fail(error.message); }

// A v3 API key is 32 hex characters; anything longer is the v4 read access token.
const v3 = /^[a-f0-9]{32}$/i.test(token);
async function tmdb(path, params = {}) {
  const url = new URL(`https://api.themoviedb.org/3/${path}`);
  for (const [key, value] of Object.entries({ language: 'zh-CN', ...params })) url.searchParams.set(key, value);
  if (v3) url.searchParams.set('api_key', token);
  let response;
  try { response = await fetch(url, { headers: v3 ? {} : { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) }); }
  catch { fail('连不上 TMDB。若需要代理，在 .env 里加一行 HTTPS_PROXY=http://127.0.0.1:端口号 后重试。'); }
  if (response.status === 401) fail('TMDB 拒绝了这个 Token，请检查 .env 里的 TMDB_TOKEN 是否完整。');
  if (!response.ok) fail(`TMDB 返回错误 ${response.status}`);
  return response.json();
}

const choices = searchChoices((await tmdb('search/multi', { query, include_adult: 'false' })).results);
if (!choices.length) fail(`TMDB 上没有找到「${query}」，试试换个名字或用原名。`);
console.log('');
choices.forEach((item, index) => console.log(`  ${index + 1}. ${item.title}${item.original && item.original !== item.title ? ` / ${item.original}` : ''} (${item.year ?? '年份未知'}) ${item.kind === 'movie' ? '电影' : '剧集'}`));
const prompt = createInterface({ input: process.stdin, output: process.stdout });
const picked = choices[Number(await prompt.question(`\n选择编号 1–${choices.length}（直接回车取消）：`)) - 1];
if (!picked) { prompt.close(); console.log('已取消。'); process.exit(0); }
if (rating === undefined) {
  try { rating = parseRating(await prompt.question('评分 0–5（可半星，直接回车跳过）：')); }
  catch (error) { prompt.close(); fail(error.message); }
}
prompt.close();

const source = readFileSync(dataFile, 'utf8');
const existing = parseFilms((await import(`${dataFile.href}?t=${Date.now()}`)).default).films;
if (existing.some(film => film.tmdb === `${picked.kind}/${picked.id}`)) fail(`「${picked.title}」已经在片单里了。`);

const details = await tmdb(`${picked.kind}/${picked.id}`, picked.kind === 'movie' ? { append_to_response: 'credits' } : {});
let poster;
if (details.poster_path) {
  poster = posterName(picked.kind, picked.id);
  const file = new URL(`posters/${poster}`, cinema);
  if (!existsSync(file)) {
    try {
      const image = await fetch(`https://image.tmdb.org/t/p/w500${details.poster_path}`, { signal: AbortSignal.timeout(20000) });
      if (!image.ok) throw new Error(String(image.status));
      writeFileSync(file, Buffer.from(await image.arrayBuffer()));
    } catch { console.warn('  ! 海报下载失败，这一条先不带海报，之后可以手动放进 posters/。'); poster = undefined; }
  }
}
const entry = entryFromTmdb(picked.kind, details, { rating, poster });
writeFileSync(dataFile, insertEntry(source, entry));
console.log(`\n✓ 已加入片单最前面：${entry.title}${entry.year ? ` (${entry.year})` : ''}${poster ? '，海报已保存' : ''}`);
console.log('  刷新预览页面就能看到。想改哪一项，直接编辑 dist/modules/cinema/data.js。\n');
