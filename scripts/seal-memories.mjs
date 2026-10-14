// 把你们的回忆加密后写进网站：node scripts/seal-memories.mjs
//
// 原文放在项目根目录的 memories/ 文件夹（已被 git 忽略，只留在这台电脑上）；格式照着 memories.example/ 写。
// 没有 memories/ 时用 memories.example/（占位内容，暗号是 cabin），方便先看效果。
// 输出：dist/room/memories/sealed.js（文字）和 dist/room/memories/p/*.bin（照片）—— 全是密文。暗号不会写进 dist/。
// 照片用 macOS 自带的 sips 缩小：墙上和相册格子用 360px 的小图，点开看用 1600px 的大图。
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, rmSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ITERATIONS, toBase64, deriveKey, sealJSON, openJSON, sealBytes, fromBase64 } from '../dist/room/vault.js';

const root = fileURLToPath(new URL('..', import.meta.url)), real = join(root, 'memories'), example = join(root, 'memories.example');
const source = existsSync(real) ? real : example, out = join(root, 'dist/room/memories');
const read = name => existsSync(join(source, name)) ? readFileSync(join(source, name), 'utf8') : '';
const lines = textFile => textFile.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));

// 一行一条：「2024-05-20 标题 ｜ 备注」。日期和备注都可以不写。
export function parseList(textFile) {
  return lines(textFile).map(line => {
    const date = line.match(/^(\d{4}-\d{2}-\d{2})\s+/)?.[1] ?? '', [title, ...rest] = line.slice(date ? date.length : 0).split(/[｜|]/).map(part => part.trim());
    return { date, title, note: rest.join(' ｜ ') };
  }).filter(item => item.title);
}
// 一封信：开头几行「标题：」「日期：」「来自：」，空一行之后是正文，段落之间空一行。
export function parseLetter(textFile, file) {
  const [head, ...body] = textFile.replace(/\r/g, '').split(/\n\s*\n/), field = name => head.match(new RegExp(`^${name}[：:]\\s*(.+)$`, 'm'))?.[1].trim() ?? '';
  const paragraphs = body.map(p => p.trim().replace(/\n/g, '')).filter(Boolean);
  if (!paragraphs.length) throw new Error(`${file}: 信是空的（开头几行之后空一行，再写正文）`);
  return { title: field('标题') || '写给你', date: field('日期'), from: field('来自'), paragraphs };
}
export function parseDays(textFile) {
  const since = textFile.match(/^在一起[：:]\s*(\d{4}-\d{2}-\d{2})/m)?.[1] ?? '';
  return { since, timeline: parseList(textFile.replace(/^在一起[：:].*$/m, '')).filter(item => item.date).sort((a, b) => a.date.localeCompare(b.date)) };
}

// 照片：照片/ 里的每个图片文件一张；照片.md 里可以给它补日期和一句话（「日期 文件名 ｜ 一句话」）。
// 没写日期的用照片自带的拍摄日期。文件名是「密钥 + 原图」算出来的一串字符：原图不变就不会重新生成，也看不出原来叫什么。
async function sealPhotos(key) {
  const dir = join(source, '照片'), store = join(out, 'p'), work = mkdtempSync(join(tmpdir(), 'cabin-'));
  mkdirSync(store, { recursive: true });
  const notes = new Map(parseList(read('照片.md')).map(item => [item.title, item]));
  const files = existsSync(dir) ? readdirSync(dir).filter(f => /\.(jpe?g|png|heic|webp)$/i.test(f)).sort() : [];
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key)), sign = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sips = (...args) => execFileSync('sips', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const photos = [], keep = new Set(); let fresh = 0;
  for (const file of files) {
    const original = readFileSync(join(dir, file)), id = Buffer.from(await crypto.subtle.sign('HMAC', sign, original)).toString('hex').slice(0, 20), sizes = [];
    for (const [tag, edge, quality] of [['t', 360, 72], ['f', 1600, 82]]) {
      const target = join(store, `${id}.${tag}.bin`), small = join(work, `${id}.${tag}.jpg`); keep.add(`${id}.${tag}.bin`);
      sips('-Z', String(edge), '-s', 'format', 'jpeg', '-s', 'formatOptions', String(quality), join(dir, file), '--out', small);
      sizes.push(...sips('-g', 'pixelWidth', '-g', 'pixelHeight', small).match(/\d+$/gm).map(Number));
      if (existsSync(target)) continue;
      const { iv, data } = await sealBytes(key, readFileSync(small));          // 文件 = 12 字节 iv + 密文
      writeFileSync(target, Buffer.concat([fromBase64(iv), data])); fresh++;
    }
    const note = notes.get(file), taken = sips('-g', 'creation', join(dir, file)).match(/creation: (\d{4}):(\d{2}):(\d{2})/);
    photos.push({ id, w: sizes[2], h: sizes[3], date: note?.date || (taken ? taken.slice(1).join('-') : ''), caption: note?.note ?? '' });
  }
  for (const stale of readdirSync(store)) if (!keep.has(stale)) rmSync(join(store, stale));      // 删掉的照片，密文也删
  rmSync(work, { recursive: true, force: true });
  return { photos: photos.sort((a, b) => b.date.localeCompare(a.date)), fresh: fresh / 2 };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const phrase = lines(read('暗号.txt'))[0];
  if (!phrase) { console.error(`✗ ${source}/暗号.txt 里没有暗号（第一行非 # 开头的文字）`); process.exit(1); }
  if (source === real && phrase.length < 8) console.warn('! 暗号少于 8 个字：密文是公开的，短暗号很容易被试出来，建议换成一句话。');
  const letterDir = join(source, '信');
  const payload = {
    letters: (existsSync(letterDir) ? readdirSync(letterDir).filter(f => f.endsWith('.md')).sort() : []).map(f => parseLetter(readFileSync(join(letterDir, f), 'utf8'), f)).sort((a, b) => b.date.localeCompare(a.date)),
    days: parseDays(read('纪念日.md')),
    places: parseList(read('去过的地方.md')), watched: parseList(read('一起看过的.md')), wishes: parseList(read('想去的地方.md')), things: parseList(read('小物件.md')),
  };
  // 盐沿用上一次的：只要暗号没换，已经在设备上记住的钥匙就继续有效。
  mkdirSync(out, { recursive: true });
  const file = join(out, 'sealed.js'), previous = existsSync(file) ? readFileSync(file, 'utf8').match(/"salt":"([^"]+)"/)?.[1] : null;
  const salt = previous ?? toBase64(crypto.getRandomValues(new Uint8Array(16))), key = await deriveKey(phrase, salt);
  const album = await sealPhotos(key); payload.photos = album.photos;
  const sealed = { salt, iterations: ITERATIONS, ...await sealJSON(key, payload) };
  if (!(await openJSON(key, sealed))) throw new Error('seal round trip failed');
  writeFileSync(file, `// 你们的回忆（AES-GCM 密文）。原文在 memories/，改完运行 node scripts/seal-memories.mjs。不要手改。\nexport default ${JSON.stringify(sealed)};\n`);
  console.log(`✓ ${source === real ? 'memories/' : 'memories.example/（占位内容，暗号 cabin）'} → dist/room/memories/sealed.js`);
  console.log(`  信 ${payload.letters.length} · 时间线 ${payload.days.timeline.length}${payload.days.since ? `（在一起 ${payload.days.since}）` : ''} · 去过 ${payload.places.length} · 看过 ${payload.watched.length} · 想去 ${payload.wishes.length} · 小物件 ${payload.things.length} · 照片 ${payload.photos.length}（新加密 ${album.fresh} 张）`);
}
