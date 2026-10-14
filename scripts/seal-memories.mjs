// 把你们的回忆加密后写进网站：node scripts/seal-memories.mjs
//
// 原文放在项目根目录的 memories/ 文件夹（已被 git 忽略，只留在这台电脑上）；格式照着 memories.example/ 写。
// 没有 memories/ 时用 memories.example/（占位内容，暗号是 cabin），方便先看效果。
// 输出：dist/room/memories/sealed.js —— 只有密文。暗号不会写进 dist/。
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ITERATIONS, toBase64, deriveKey, sealJSON, openJSON } from '../dist/room/vault.js';

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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const phrase = lines(read('暗号.txt'))[0];
  if (!phrase) { console.error(`✗ ${source}/暗号.txt 里没有暗号（第一行非 # 开头的文字）`); process.exit(1); }
  if (source === real && phrase.length < 8) console.warn('! 暗号少于 8 个字：密文是公开的，短暗号很容易被试出来，建议换成一句话。');
  const letterDir = join(source, '信');
  const payload = {
    letters: (existsSync(letterDir) ? readdirSync(letterDir).filter(f => f.endsWith('.md')).sort() : []).map(f => parseLetter(readFileSync(join(letterDir, f), 'utf8'), f)).sort((a, b) => b.date.localeCompare(a.date)),
    days: parseDays(read('纪念日.md')),
    places: parseList(read('去过的地方.md')), watched: parseList(read('一起看过的.md')), wishes: parseList(read('想去的地方.md')), things: parseList(read('小物件.md')),
    photos: [],                                           // 第 2 步：照片
  };
  // 盐沿用上一次的：只要暗号没换，已经在设备上记住的钥匙就继续有效。
  mkdirSync(out, { recursive: true });
  const file = join(out, 'sealed.js'), previous = existsSync(file) ? readFileSync(file, 'utf8').match(/"salt":"([^"]+)"/)?.[1] : null;
  const salt = previous ?? toBase64(crypto.getRandomValues(new Uint8Array(16))), key = await deriveKey(phrase, salt);
  const sealed = { salt, iterations: ITERATIONS, ...await sealJSON(key, payload) };
  if (!(await openJSON(key, sealed))) throw new Error('seal round trip failed');
  writeFileSync(file, `// 你们的回忆（AES-GCM 密文）。原文在 memories/，改完运行 node scripts/seal-memories.mjs。不要手改。\nexport default ${JSON.stringify(sealed)};\n`);
  console.log(`✓ ${source === real ? 'memories/' : 'memories.example/（占位内容，暗号 cabin）'} → dist/room/memories/sealed.js`);
  console.log(`  信 ${payload.letters.length} · 时间线 ${payload.days.timeline.length}${payload.days.since ? `（在一起 ${payload.days.since}）` : ''} · 去过 ${payload.places.length} · 看过 ${payload.watched.length} · 想去 ${payload.wishes.length} · 小物件 ${payload.things.length}`);
}
