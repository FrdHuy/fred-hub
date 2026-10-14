// 两个人的小屋的线上存储（Vercel 函数，数据放在项目连接的 Upstash Redis 里）。
//
// 这里只存密文：小屋的内容在浏览器里用暗号加密后才发过来，服务器、Vercel、Upstash 都看不到内容。
// 谁能读写：请求要带「写入凭证」（从暗号派生，见 room/vault.js 的 writeToken），它的指纹必须等于 room/memories/sealed.js 里的 lock。
//
//   GET    /api/cabin               → { version, data }       整个小屋的状态（一份密文），version 每写一次加 1
//   PUT    /api/cabin               { version, data }          只有 version 和服务器上的一样才写入（两个人同时改时，后到的那个拿回最新的再合并）
//                                    → 200 { version } | 409 { version, data }
//   GET    /api/cabin?photo=<id>    → { data }                 一张照片（密文）
//   PUT    /api/cabin?photo=<id>    { data }
//   DELETE /api/cabin?photo=<id>
//
// 不依赖任何代码库：直接调用 Upstash 的 REST 接口。本地测试用 node scripts/serve.mjs（键名前缀 dev:，不碰线上数据）。
import box from '../room/memories/sealed.js';

const PREFIX = process.env.CABIN_PREFIX || 'cabin';
const STATE = `${PREFIX}:state`, PHOTO = id => `${PREFIX}:photo:${id}`;
// 写入时比对版本号，在 Redis 里一步完成（不会两个人同时写坏）。
const SWAP = `local v = tonumber(redis.call('HGET', KEYS[1], 'v') or '0')
if v ~= tonumber(ARGV[1]) then return {v, redis.call('HGET', KEYS[1], 'd') or ''} end
redis.call('HSET', KEYS[1], 'v', v + 1, 'd', ARGV[2])
return {v + 1}`;

async function redis(...command) {
  const response = await fetch(process.env.KV_REST_API_URL, { method: 'POST', headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` }, body: JSON.stringify(command) });
  const body = await response.json();
  if (body.error) throw new Error(body.error);
  return body.result;
}
const sha256 = async text => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(b => b.toString(16).padStart(2, '0')).join('');
const reply = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

async function handle(request) {
  if (!process.env.KV_REST_API_URL) return reply({ error: 'storage not connected' }, 503);
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!box.lock || !token || await sha256(token) !== box.lock) return reply({ error: 'locked' }, 401);
  const url = new URL(request.url), photo = url.searchParams.get('photo');
  if (photo !== null) {
    if (!/^[\w-]{6,64}$/.test(photo)) return reply({ error: 'bad photo id' }, 400);
    if (request.method === 'GET') { const data = await redis('GET', PHOTO(photo)); return data ? reply({ data }) : reply({ error: 'not found' }, 404); }
    if (request.method === 'PUT') { const { data } = await request.json(); if (typeof data !== 'string' || data.length > 900000) return reply({ error: 'bad photo' }, 400); await redis('SET', PHOTO(photo), data); return reply({ ok: true }); }
    if (request.method === 'DELETE') { await redis('DEL', PHOTO(photo)); return reply({ ok: true }); }
  } else {
    if (request.method === 'GET') { const [v, d] = await redis('HMGET', STATE, 'v', 'd'); return reply({ version: Number(v ?? 0), data: d || null }); }
    if (request.method === 'PUT') {
      const { version, data } = await request.json();
      if (!Number.isInteger(version) || typeof data !== 'string' || data.length > 900000) return reply({ error: 'bad state' }, 400);
      const [now, current] = await redis('EVAL', SWAP, 1, STATE, version, data);
      return current === undefined ? reply({ version: now }) : reply({ version: now, data: current || null }, 409);
    }
  }
  return reply({ error: 'method not allowed' }, 405);
}
const safely = async request => { try { return await handle(request); } catch (error) { return reply({ error: String(error.message || error) }, 502); } };
export const GET = safely, PUT = safely, DELETE = safely;
