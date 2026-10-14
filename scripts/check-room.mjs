// 3D 小屋（#/room）的检查：配置里的物件和模块都存在、Three.js 自托管文件齐全、没有引用任何外部源。
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { readRoute } from '../dist/router.js';
import { objects, mood, MEMORIES } from '../dist/room/config.js';
import { deriveKey, sealJSON, openJSON, exportKey, importKey } from '../dist/room/vault.js';
import { dayCount, nextAnniversary } from '../dist/room/memory.js';
import { parseList, parseLetter, parseDays } from './seal-memories.mjs';

assert.deepEqual(readRoute('#/room'), { type: 'room' });
assert.deepEqual(readRoute('#/'), { type: 'home' }, 'the collection rail stays the home page');
// 物件装的是回忆（2026-10-14 起小屋是两个人的小屋，不再通向模块）。
for (const entry of objects) {
  assert.ok(existsSync(`dist/room/objects/${entry.object}.js`), `${entry.object}: 没有这个物件造型`);
  assert.ok(entry.label, `${entry.object}: 缺 label`);
  assert.ok(Array.isArray(entry.at) && entry.at.length === 3 && entry.at.every(Number.isFinite), `${entry.object}: at 应为 [x, y, z]`);
  if (entry.wall) assert.ok(['west', 'north', 'east', 'south'].includes(entry.wall), `${entry.object}: wall 应为 west / north / east / south`);
  assert.ok(entry.action === 'unlock' || MEMORIES.includes(entry.memory), `${entry.object}: memory 应为 ${MEMORIES.join(' / ')}，或 action: 'unlock'`);
  assert.ok(!entry.module, `${entry.object}: 小屋的物件不再通向模块`);
}
assert.equal(objects.filter(entry => entry.action === 'unlock').length, 1, '要有且只有一把钥匙（门垫）');
const panelSource = readFileSync('dist/room/panel.js', 'utf8');
for (const kind of MEMORIES) assert.ok(new RegExp(`\\b${kind}[(:]`).test(panelSource), `panel.js 的 SHOW 里没有 ${kind}`);
const registry = readFileSync('dist/room/objects/index.js', 'utf8');
for (const entry of objects) assert.ok(registry.includes(`./${entry.object}.js`), `${entry.object}: 没在 objects/index.js 登记`);
assert.ok(readFileSync('dist/room/lights.js', 'utf8').includes(`${mood}:`), `lights.js 里没有 ${mood} 这个时刻预设`);

// 每个时刻 / 天气预设都有切换图标。
const lightsSource = readFileSync('dist/room/lights.js', 'utf8'), bar = readFileSync('dist/room/moodbar.js', 'utf8');
const moodNames = [...lightsSource.slice(lightsSource.indexOf('export const MOODS'), lightsSource.indexOf('const LAMPS')).matchAll(/^  (\w+): \{$/gm)].map(m => m[1]);
assert.ok(moodNames.length >= 6 && moodNames.includes(mood), '时刻预设不全');
for (const name of moodNames) assert.ok(new RegExp(`^  ${name}: '`, 'm').test(bar), `moodbar.js 里没有 ${name} 的图标`);
const vendor = 'dist/vendor/three-0.170.0';
for (const file of ['three.module.min.js', 'LICENSE', 'addons/controls/OrbitControls.js', 'addons/postprocessing/EffectComposer.js', 'addons/postprocessing/UnrealBloomPass.js', 'addons/postprocessing/OutputPass.js']) assert.ok(existsSync(`${vendor}/${file}`), `${file}: 运行 node scripts/vendor-three.mjs`);
const sources = [...readdirSync('dist/room').filter(f => f.endsWith('.js')).map(f => `dist/room/${f}`), ...readdirSync('dist/room/objects').map(f => `dist/room/objects/${f}`)];
for (const file of sources) {
  assert.equal(spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' }).status, 0, file);
  const text = readFileSync(file, 'utf8');
  assert.ok(!/https?:\/\//.test(text), `${file}: 不能引用外部地址`);
  assert.ok(!/from\s+'three'/.test(text), `${file}: 从 ./three.js 导入，不用裸模块名`);
}
for (const file of readdirSync(`${vendor}/addons`, { recursive: true }).filter(f => f.endsWith('.js'))) assert.ok(!/from\s+'three'/.test(readFileSync(`${vendor}/addons/${file}`, 'utf8')), `${file}: 仍在用裸模块名 three`);
// 降级：静态截图在；判断设备和静态版的代码不能依赖 Three.js（否则低端设备还是要下载它）。
assert.ok(existsSync('dist/room/fallback.jpg'), '缺静态截图 dist/room/fallback.jpg');
for (const file of ['enter.js', 'quality.js', 'flat.js', 'config.js', 'vault.js', 'memory.js']) assert.ok(!/from\s+'\.\/(three|index|scene|kit)\.js'/.test(readFileSync(`dist/room/${file}`, 'utf8')), `${file}: 不能静态导入 3D 代码`);
assert.ok(readFileSync('dist/main.js', 'utf8').includes('./room/enter.js'), 'main.js 通过 enter.js 进小屋');
const html = readFileSync('dist/index.html', 'utf8');
assert.ok(html.includes('id="room-view"') && html.includes('./room/style.css'));
assert.ok(!/unpkg|jsdelivr|googleapis|gstatic/.test(html + readFileSync('dist/main.js', 'utf8')), '不使用国内不稳定的外部源');

// 回忆：加密往返、错的暗号打不开、记住的钥匙能还原；仓库里只有密文；原文文件夹不进仓库。
const salt = 'AAAAAAAAAAAAAAAAAAAAAA==', key = await deriveKey('  Our Little  Cabin ', salt, 1000), sealed = await sealJSON(key, { letters: [{ title: '你好' }] });
assert.deepEqual(await openJSON(await deriveKey('our little cabin', salt, 1000), sealed), { letters: [{ title: '你好' }] }, '暗号不计较大小写和多余空格');
assert.equal(await openJSON(await deriveKey('someone else', salt, 1000), sealed), null, '错的暗号返回 null');
assert.deepEqual(await openJSON(await importKey(await exportKey(key)), sealed), { letters: [{ title: '你好' }] }, '记住的钥匙');
assert.equal(dayCount('2025-01-01', new Date(2025, 0, 1)), 1); assert.equal(dayCount('2025-01-01', new Date(2026, 0, 1)), 366);
assert.deepEqual(nextAnniversary('2025-01-01', new Date(2025, 11, 31)), { days: 1, years: 1 }); assert.deepEqual(nextAnniversary('2025-01-01', new Date(2026, 0, 1)), { days: 0, years: 1 });
assert.deepEqual(parseList('# 注释\n2025-03-15 京都 ｜ 樱花\n海边\n'), [{ date: '2025-03-15', title: '京都', note: '樱花' }, { date: '', title: '海边', note: '' }]);
assert.deepEqual(parseLetter('标题：你好\n来自：Fred\n\n第一段\n\n第二段\n', 'x.md'), { title: '你好', date: '', from: 'Fred', paragraphs: ['第一段', '第二段'] });
assert.deepEqual(parseDays('在一起：2025-01-01\n2025-03-15 旅行\n2024-11-03 见面\n').timeline.map(t => t.title), ['见面', '旅行']);
const box = readFileSync('dist/room/memories/sealed.js', 'utf8');
assert.ok(/"salt":"[^"]+","iterations":600000,"iv":"[^"]+","data":"[^"]+"/.test(box), 'memories/sealed.js 应该只有密文');
assert.ok(readFileSync('.gitignore', 'utf8').split('\n').includes('/memories/'), '根目录的 memories/ 必须被 git 忽略（dist/room/memories/ 里的密文要进仓库）');
if (existsSync('memories/暗号.txt')) { const phrase = readFileSync('memories/暗号.txt', 'utf8').split('\n').map(l => l.trim()).find(l => l && !l.startsWith('#')); for (const file of sources) assert.ok(!readFileSync(file, 'utf8').includes(phrase), `${file}: 暗号不能出现在 dist/ 里`); }
console.log(`PASS: room config (${objects.length} objects), sealed memories round trip, vendored three@0.170.0, no external sources`);
