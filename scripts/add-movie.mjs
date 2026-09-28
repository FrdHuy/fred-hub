// Usage: node scripts/add-movie.mjs 花样年华 [4.5]
//        node scripts/add-movie.mjs --posters   (re-fetch original-language posters for the whole list)
// Looks the title up on TMDB (local machine only), saves the poster and prepends an entry to data.js.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { parseFilms } from '../dist/modules/cinema/films.js';
import { searchChoices, entryFromTmdb, insertEntry, parseRating, posterName, pickPoster, posterLanguage, originCountries } from './lib/cinema-add.mjs';

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
  for (const [key, value] of Object.entries({ language: 'zh-CN', ...params })) if (value !== null) url.searchParams.set(key, value);
  if (v3) url.searchParams.set('api_key', token);
  let response;
  try { response = await fetch(url, { headers: v3 ? {} : { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) }); }
  catch { fail('连不上 TMDB。若需要代理，在 .env 里加一行 HTTPS_PROXY=http://127.0.0.1:端口号 后重试。'); }
  if (response.status === 401) fail('TMDB 拒绝了这个 Token，请检查 .env 里的 TMDB_TOKEN 是否完整。');
  if (!response.ok) fail(`TMDB 返回错误 ${response.status}`);
  return response.json();
}

// The original release poster (e.g. French for a French film); falls back to TMDB's Chinese-market poster.
async function originalPoster(kind, id, details) {
  const language = posterLanguage(details);
  const images = await tmdb(`${kind}/${id}/images`, { language: null, include_image_language: `${language},null` });
  return pickPoster(images.posters, { language, countries: originCountries(details) }) || details.poster_path;
}
async function download(path, name) {
  try {
    const image = await fetch(`https://image.tmdb.org/t/p/w780${path}`, { signal: AbortSignal.timeout(20000) });
    if (!image.ok) throw new Error(String(image.status));
    writeFileSync(new URL(`posters/${name}`, cinema), Buffer.from(await image.arrayBuffer()));
    return true;
  } catch { return false; }
}

if (query === '--posters') {
  const films = parseFilms((await import(`${dataFile.href}?t=${Date.now()}`)).default).films.filter(film => film.tmdb && film.poster);
  console.log(`\n更新 ${films.length} 张海报为原版：`);
  for (const film of films) {
    const [kind, id] = film.tmdb.split('/'), details = await tmdb(`${kind}/${id}`, { language: null });
    const path = await originalPoster(kind, id, details);
    const ok = path && await download(path, film.poster);
    console.log(`  ${ok ? '✓' : '!'} ${film.title}（${posterLanguage(details)}）${ok ? '' : ' 下载失败，保留原图'}`);
  }
  console.log('\n刷新预览页面即可看到。\n'); process.exit(0);
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
const path = await originalPoster(picked.kind, picked.id, details);
if (path) {
  poster = posterName(picked.kind, picked.id);
  if (!existsSync(new URL(`posters/${poster}`, cinema)) && !await download(path, poster)) {
    console.warn('  ! 海报下载失败，这一条先不带海报，之后可以手动放进 posters/。'); poster = undefined;
  }
}
const entry = entryFromTmdb(picked.kind, details, { rating, poster });
writeFileSync(dataFile, insertEntry(source, entry));
console.log(`\n✓ 已加入片单最前面：${entry.title}${entry.year ? ` (${entry.year})` : ''}${poster ? '，海报已保存' : ''}`);
console.log('  刷新预览页面就能看到。想改哪一项，直接编辑 dist/modules/cinema/data.js。\n');
