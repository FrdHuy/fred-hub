// Usage: node scripts/music-picker.mjs
// The tape recorder, on this computer only: make tapes, search songs (Apple's catalogue, no account needed),
// put them on side A or B, drop in your own audio files for whole songs, then save — dist/modules/music/data.js is written.
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { spawnSync, execFile } from 'node:child_process';
import { detectProxy } from './lib/proxy.mjs';
import { trackFromItunes, audioName, tapesSource } from './lib/music-list.mjs';

const music = new URL('../dist/modules/music/', import.meta.url), dataFile = new URL('data.js', music), audioDir = new URL('audio/', music);
// Uses the proxy this Mac already has (system proxy / Clash), so nothing needs to be set up.
const proxy = await detectProxy();
if (proxy && !process.env.NODE_USE_ENV_PROXY) {
  const child = spawnSync(process.execPath, process.argv.slice(1), { stdio: 'inherit', env: { ...process.env, HTTPS_PROXY: proxy, NODE_USE_ENV_PROXY: '1' } });
  process.exit(child.status ?? 1);
}
mkdirSync(audioDir, { recursive: true });
const page = readFileSync(new URL('tapedeck/index.html', import.meta.url));

const tapes = async () => (await import(`${dataFile.href}?t=${Date.now()}`)).default;
const send = (res, status, body, type = 'application/json; charset=utf-8') => { res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' }); res.end(type.startsWith('application/json') ? JSON.stringify(body) : body); };
const raw = (req, limit) => new Promise((resolve, reject) => { const parts = []; let size = 0; req.on('data', c => { size += c.length; if (size > limit) { reject(new Error('文件太大（上限 40 MB）')); req.destroy(); } else parts.push(c); }); req.on('end', () => resolve(Buffer.concat(parts))); req.on('error', reject); });

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://local');
  try {
    if (url.pathname === '/') return send(res, 200, page, 'text/html; charset=utf-8');
    if (url.pathname === '/api/tapes') return send(res, 200, await tapes());
    if (url.pathname === '/api/search') {
      const params = new URLSearchParams({ term: url.searchParams.get('q') || '', entity: 'song', limit: '30', country: url.searchParams.get('country') || 'us' });
      const r = await fetch(`https://itunes.apple.com/search?${params}`); if (!r.ok) throw new Error(`Apple 返回 ${r.status}`);
      return send(res, 200, (await r.json()).results.map(trackFromItunes).filter(Boolean));
    }
    // Your own file for a whole song: saved into dist/modules/music/audio/ under a safe name.
    if (url.pathname === '/api/audio' && req.method === 'POST') {
      const name = audioName(url.searchParams.get('name') || 'track.mp3', new Set(readdirSync(audioDir)));
      writeFileSync(new URL(name, audioDir), await raw(req, 40e6));
      return send(res, 200, { audio: name });
    }
    if (url.pathname.startsWith('/audio/') && /^[\w.-]+$/.test(url.pathname.slice(7))) {
      const file = new URL(url.pathname.slice(7), audioDir); if (!existsSync(file)) return send(res, 404, '');
      res.writeHead(200, { 'content-type': 'audio/mpeg' }); return res.end(readFileSync(file));
    }
    if (url.pathname === '/api/save' && req.method === 'POST') {
      const list = JSON.parse((await raw(req, 2e6)).toString() || '[]');
      writeFileSync(dataFile, tapesSource(list));
      const saved = await tapes();
      return send(res, 200, { tapes: saved.length, tracks: saved.reduce((n, t) => n + t.a.length + t.b.length, 0) });
    }
    send(res, 404, { error: 'not found' });
  } catch (error) { send(res, 500, { error: error.message }); }
});
// Only this computer can reach it.
server.listen(0, '127.0.0.1', () => {
  const address = `http://127.0.0.1:${server.address().port}/`;
  console.log(`\n✓ 录音台已打开：${address}`);
  console.log(`  搜歌 → 放进 A 面 / B 面 → 保存。${proxy ? `（经由代理 ${proxy}）` : ''}关掉这个窗口（Ctrl+C）就结束。\n`);
  if (process.platform === 'darwin' && !process.env.PICKER_NO_OPEN) execFile('open', [address]);
});
