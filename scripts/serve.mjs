// 本地预览（带线上接口）：node scripts/serve.mjs [端口，默认 57124]
// 和 scripts/preview.py 一样提供 dist/（不缓存），另外把 /api/* 交给 dist/api/ 里的函数——和 Vercel 上的行为一致。
// 接口默认连一个本地的「假 Redis」（数据存在 .vercel/dev-kv.json，只在这台电脑上）：Vercel 上的 Upstash 密钥是敏感变量，下载不下来。
// 想连真的 Upstash：把 Upstash 控制台里的 REST URL 和 Token 写进 .env.local 的 KV_REST_API_URL / KV_REST_API_TOKEN，键名前缀是 dev:，不碰线上数据。
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url)), dist = join(root, 'dist'), port = Number(process.argv[2] || 57124);
const envFile = join(root, '.env.local');
if (existsSync(envFile)) for (const line of readFileSync(envFile, 'utf8').split('\n')) { const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2]; }
process.env.CABIN_PREFIX = 'dev';
const fake = !/^https:/.test(process.env.KV_REST_API_URL ?? '');
const kvFile = join(root, '.vercel', 'dev-kv.json'), kv = new Map(existsSync(kvFile) ? Object.entries(JSON.parse(readFileSync(kvFile, 'utf8'))) : []);
if (fake) { process.env.KV_REST_API_URL = `http://127.0.0.1:${port}/__kv`; process.env.KV_REST_API_TOKEN = 'local'; }
// 假 Redis：只实现 dist/api/cabin.js 用到的几条命令（EVAL 就是那段「比对版本再写入」）。
function fakeRedis([command, ...args]) {
  const hash = key => kv.get(key) ?? {}, save = () => writeFileSync(kvFile, JSON.stringify(Object.fromEntries(kv)));
  switch (command) {
    case 'GET': return kv.get(args[0]) ?? null;
    case 'SET': kv.set(args[0], args[1]); save(); return 'OK';
    case 'DEL': kv.delete(args[0]); save(); return 1;
    case 'HMGET': return args.slice(1).map(field => hash(args[0])[field] ?? null);
    case 'EVAL': { const [, , key, version, data] = args, h = hash(key), v = Number(h.v ?? 0); if (v !== Number(version)) return [v, h.d ?? '']; kv.set(key, { v: String(v + 1), d: data }); save(); return [v + 1]; }
  }
  throw new Error(`fake redis: ${command}`);
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.bin': 'application/octet-stream', '.txt': 'text/plain; charset=utf-8' };

createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${port}`);
  if (url.pathname === '/__kv' && fake) {
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    try { res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ result: fakeRedis(JSON.parse(Buffer.concat(chunks))) })); }
    catch (error) { res.writeHead(200).end(JSON.stringify({ error: error.message })); }
    return;
  }
  if (url.pathname.startsWith('/api/')) {
    const file = join(dist, 'api', `${url.pathname.slice(5).replace(/[^\w-]/g, '')}.js`);
    if (!existsSync(file)) { res.writeHead(404).end(); return; }
    const handler = (await import(`${pathToFileURL(file)}?t=${statSync(file).mtimeMs}`))[req.method];
    if (!handler) { res.writeHead(405).end(); return; }
    const chunks = []; for await (const chunk of req) chunks.push(chunk);
    const response = await handler(new Request(url, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) }));
    res.writeHead(response.status, Object.fromEntries(response.headers)).end(Buffer.from(await response.arrayBuffer()));
    return;
  }
  let file = normalize(join(dist, decodeURIComponent(url.pathname)));
  if (!file.startsWith(dist)) { res.writeHead(403).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) { res.writeHead(404).end('not found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }).end(readFileSync(file));
}).listen(port, '127.0.0.1', () => console.log(`Fred’s Hub（带线上接口${fake ? '，本地假 Redis' : '，Upstash dev: 前缀'}）：http://127.0.0.1:${port}/#/room`));
mkdirSync(join(root, '.vercel'), { recursive: true });
