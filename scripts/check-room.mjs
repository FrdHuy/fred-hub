// 3D 小屋（#/room）的检查：配置里的物件和模块都存在、Three.js 自托管文件齐全、没有引用任何外部源。
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { readRoute } from '../dist/router.js';
import { objects, mood, MEMORIES } from '../dist/room/config.js';
import { deriveKey, sealJSON, openJSON, exportKey, importKey } from '../dist/room/vault.js';
import { dayCount, nextAnniversary } from '../dist/room/memory.js';
import { stampIds, upsert, remove, listOf, toParagraphs } from '../dist/room/edits.js';
import { SLOTS, BEDS, inBed, stageOf, yearsOf, speciesOf, plantsFrom, milestonesOf, recall, water, wateredBy, wateredToday } from '../dist/room/growth.js';
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
for (const file of ['enter.js', 'quality.js', 'flat.js', 'config.js', 'vault.js', 'memory.js', 'growth.js']) assert.ok(!/from\s+'\.\/(three|index|scene|kit)\.js'/.test(readFileSync(`dist/room/${file}`, 'utf8')), `${file}: 不能静态导入 3D 代码`);
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
// 花园：只看天数、不会死；时间线自动种 + 手动种；坑不够时最早和最新的都留着。
assert.deepEqual([1, 2, 3, 9, 10, 29, 30, 4000].map(stageOf), ['mound', 'mound', 'sprout', 'sprout', 'bud', 'bud', 'bloom', 'bloom'], '长到哪一步只看天数，之后一直开着');
assert.deepEqual([1, 365, 366, 731].map(yearsOf), [0, 0, 1, 2]);
assert.equal(SLOTS.length, 24); assert.ok(SLOTS.every(([x, z]) => inBed(x, z, 0)) && new Set(SLOTS.map(String)).size === 24); assert.ok(!inBed(0, 0) && inBed((BEDS[0].x[0] + BEDS[0].x[1]) / 2, (BEDS[0].z[0] + BEDS[0].z[1]) / 2));
assert.ok(BEDS.some(b => SLOTS[0][0] > b.x[0] && SLOTS[0][0] < b.x[1]) && !(SLOTS[1][0] > BEDS[0].x[0] && SLOTS[1][0] < BEDS[0].x[1]), '两片花圃轮流种');
assert.equal(speciesOf({ date: '2025-01-01', title: '一株向日葵' }), 'sunflower'); assert.equal(speciesOf({ date: '2025-01-01', title: '第一次见面' }), speciesOf({ date: '2025-01-01', title: '第一次见面' }));
const day = new Date(2026, 0, 10), grown = plantsFrom({ days: { timeline: [{ date: '2025-01-01', title: '在一起', note: '' }, { date: '2027-01-01', title: '还没到', note: '' }] }, garden: [{ date: '2026-01-05', title: '玫瑰', note: '' }] }, day);
assert.deepEqual(grown.map(p => [p.title, p.days, p.stage, p.years, p.from]), [['在一起', 375, 'bloom', 1, 'day'], ['玫瑰', 6, 'sprout', 0, 'hand']], '还没到的日子不种');
const many = plantsFrom({ garden: Array.from({ length: 40 }, (_, i) => ({ date: `2025-01-${String(i % 28 + 1).padStart(2, '0')}`, title: `花${String(i).padStart(2, '0')}`, note: '' })) }, day);
assert.equal(many.length, 24); assert.equal(new Set(many.map(p => String(p.at))).size, 24);
assert.deepEqual(milestonesOf(99), []); assert.deepEqual(milestonesOf(520), ['birdhouse', 'swing', 'lights']);
const pool = { photos: [{ id: 'a' }], letters: [{ from: 'F', date: '', paragraphs: ['一', '二'] }], days: { timeline: [{ title: 't' }] } };
assert.deepEqual(recall(pool, 'x', day), recall(pool, 'x', day), '同一株同一天带出同一段回忆'); assert.equal(recall({}, 'x', day), null);
// 浇水记在两个人共用的状态里：每人每株每天一次；两个人都浇了算一次「一起」；只留 90 天明细。
let shared = { water: { '2025-01-01': { Fred: ['old'] } } };
shared = water(shared, 'rose', 'Fred', day); shared = water(shared, 'rose', 'Fred', day); shared = water(shared, 'rose', 'M', day);
assert.deepEqual(wateredBy(shared, 'rose', day), ['Fred', 'M']); assert.deepEqual(shared.totals, { Fred: 1, M: 1, together: 1 }); assert.ok(wateredToday(shared, day).has('rose'));
assert.ok(!shared.water['2025-01-01'], '90 天以前的明细会被清掉');
// 改回忆：按 id 改、按 id 删；新条目自动有 id；补 id 不重复；各列的排序。
{
  const state = { places: [{ title: '旧的', date: '2025-01-01' }], days: { timeline: [] } };
  assert.equal(stampIds(state), 1); assert.equal(stampIds(state), 0, '补过的不再补');
  upsert(state, 'places', { title: '大理', date: '2026-08-01', note: 'a' }, 'Fred');
  const added = state.places.find(p => p.title === '大理'); assert.ok(added.id && added.by === 'Fred' && state.places[0] === added, '有日期的新的在前');
  upsert(state, 'places', { ...added, note: 'b' }, 'M'); assert.equal(state.places.length, 2); assert.equal(state.places[0].note, 'b'); assert.equal(state.places[0].by, 'M');
  remove(state, 'places', added.id); assert.deepEqual(state.places.map(p => p.title), ['旧的']);
  upsert(state, 'timeline', { title: '后', date: '2026-01-02' }, 'F'); upsert(state, 'timeline', { title: '前', date: '2025-01-02' }, 'F'); assert.deepEqual(listOf(state, 'timeline').map(t => t.title), ['前', '后'], '时间线旧的在前');
  assert.deepEqual(toParagraphs('第一段\n接着写\n\n\n第二段\n'), ['第一段接着写', '第二段']);
}
// 线上接口：带对凭证才能读写；版本号不对时拒绝并交回最新的那份。（用本地的假存储跑一遍真正的 dist/api/cabin.js）
{
  const store = new Map(), realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { const [command, ...args] = JSON.parse(init.body); const h = store.get(command === 'EVAL' ? args[2] : args[0]) ?? {}; let result;
    if (command === 'HMGET') result = args.slice(1).map(f => h[f] ?? null); else if (command === 'EVAL') { const v = Number(h.v ?? 0); if (v !== Number(args[3])) result = [v, h.d ?? '']; else { store.set(args[2], { v: v + 1, d: args[4] }); result = [v + 1]; } } else if (command === 'SET') { store.set(args[0], args[1]); result = 'OK'; } else if (command === 'GET') result = store.get(args[0]) ?? null; else result = 1;
    return new Response(JSON.stringify({ result })); };
  process.env.KV_REST_API_URL = 'https://fake.local'; process.env.KV_REST_API_TOKEN = 'x';
  const api = await import('../dist/api/cabin.js'), sealedBox = (await import('../dist/room/memories/sealed.js')).default;
  const token = await (await import('../dist/room/vault.js')).writeToken(await deriveKey('cabin', sealedBox.salt, sealedBox.iterations));
  const call = async (method, body, auth = token, query = '') => { const r = await api[method](new Request(`http://x/api/cabin${query}`, { method, headers: { authorization: `Bearer ${auth}` }, body: body && JSON.stringify(body) })); return [r.status, await r.json()]; };
  assert.equal((await call('GET', undefined, 'wrong'))[0], 401, '没有凭证不能读');
  assert.deepEqual(await call('GET'), [200, { version: 0, data: null }]);
  assert.deepEqual(await call('PUT', { version: 0, data: 'a' }), [200, { version: 1 }]);
  assert.deepEqual(await call('PUT', { version: 0, data: 'b' }), [409, { version: 1, data: 'a' }], '版本过期时拒绝并交回最新的');
  assert.deepEqual(await call('PUT', { data: 'p' }, token, '?photo=abc123'), [200, { ok: true }]); assert.deepEqual(await call('GET', undefined, token, '?photo=abc123'), [200, { data: 'p' }]);
  globalThis.fetch = realFetch;
}
const box = readFileSync('dist/room/memories/sealed.js', 'utf8');
assert.ok(/"salt":"[^"]+","iterations":600000,"lock":"[0-9a-f]{64}","iv":"[^"]+","data":"[^"]+"/.test(box), 'memories/sealed.js 应该只有密文');
assert.ok(readFileSync('.gitignore', 'utf8').split('\n').includes('/memories/'), '根目录的 memories/ 必须被 git 忽略（dist/room/memories/ 里的密文要进仓库）');
if (existsSync('memories/暗号.txt')) { const phrase = readFileSync('memories/暗号.txt', 'utf8').split('\n').map(l => l.trim()).find(l => l && !l.startsWith('#')); for (const file of sources) assert.ok(!readFileSync(file, 'utf8').includes(phrase), `${file}: 暗号不能出现在 dist/ 里`); }
console.log(`PASS: room config (${objects.length} objects), sealed memories round trip, garden rules, shared watering, edits, online API, vendored three@0.170.0, no external sources`);
