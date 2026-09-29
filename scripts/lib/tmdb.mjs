// A small TMDB client for local scripts (the token never leaves this machine). Errors are thrown with a Chinese message.
import { writeFileSync } from 'node:fs';
import { pickPoster, posterLanguage, originCountries } from './cinema-add.mjs';

export function createTmdb(token) {
  // A v3 API key is 32 hex characters; anything longer is the v4 read access token.
  const v3 = /^[a-f0-9]{32}$/i.test(token);
  async function get(path, params = {}) {
    const url = new URL(`https://api.themoviedb.org/3/${path}`);
    for (const [key, value] of Object.entries({ language: 'zh-CN', ...params })) if (value !== null && value !== undefined) url.searchParams.set(key, value);
    if (v3) url.searchParams.set('api_key', token);
    let response;
    try { response = await fetch(url, { headers: v3 ? {} : { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) }); }
    catch { throw new Error('连不上 TMDB。若需要代理，在 .env 里加一行 HTTPS_PROXY=http://127.0.0.1:端口号 后重试。'); }
    if (response.status === 401) throw new Error('TMDB 拒绝了这个 Token，请检查 .env 里的 TMDB_TOKEN。');
    if (!response.ok) throw new Error(`TMDB 返回错误 ${response.status}`);
    return response.json();
  }
  // The original release poster (e.g. French for a French film); falls back to TMDB's Chinese-market poster.
  async function originalPoster(kind, id, details) {
    const language = posterLanguage(details);
    const images = await get(`${kind}/${id}/images`, { language: null, include_image_language: `${language},null` });
    return pickPoster(images.posters, { language, countries: originCountries(details) }) || details.poster_path;
  }
  async function image(path, size = 'w500') {
    const response = await fetch(`https://image.tmdb.org/t/p/${size}${path}`, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`海报下载失败 ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }
  async function download(path, file, size = 'w500') { writeFileSync(file, await image(path, size)); }
  return { get, originalPoster, image, download };
}
