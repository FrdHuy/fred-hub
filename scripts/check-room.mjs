// 3D 小屋（#/room）的检查：配置里的物件和模块都存在、Three.js 自托管文件齐全、没有引用任何外部源。
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { modules } from '../dist/catalog.js';
import { readRoute } from '../dist/router.js';
import { objects, mood } from '../dist/room/config.js';

assert.deepEqual(readRoute('#/room'), { type: 'room' });
assert.deepEqual(readRoute('#/'), { type: 'home' }, 'the collection rail stays the home page');
const ids = new Set(modules.map(m => m.id));
for (const entry of objects) {
  assert.ok(existsSync(`dist/room/objects/${entry.object}.js`), `${entry.object}: 没有这个物件造型`);
  assert.ok(entry.label, `${entry.object}: 缺 label`);
  assert.ok(Array.isArray(entry.at) && entry.at.length === 3 && entry.at.every(Number.isFinite), `${entry.object}: at 应为 [x, y, z]`);
  if (entry.wall) assert.ok(['west', 'north', 'east', 'south'].includes(entry.wall), `${entry.object}: wall 应为 west / north / east / south`);
  if (entry.soon) assert.ok(!entry.module, `${entry.object}: 标了 soon 就不要写 module`);
  else assert.ok(ids.has(entry.module), `${entry.object}: 模块 ${entry.module} 不在 catalog.js 里`);
}
// 每个现有模块都能从小屋里走到。
for (const id of ids) assert.ok(objects.some(entry => entry.module === id), `模块 ${id} 在小屋里没有对应物件`);
const registry = readFileSync('dist/room/objects/index.js', 'utf8');
for (const entry of objects) assert.ok(registry.includes(`./${entry.object}.js`), `${entry.object}: 没在 objects/index.js 登记`);
assert.ok(readFileSync('dist/room/lights.js', 'utf8').includes(`${mood}:`), `lights.js 里没有 ${mood} 这个时刻预设`);

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
const html = readFileSync('dist/index.html', 'utf8');
assert.ok(html.includes('id="room-view"') && html.includes('./room/style.css'));
assert.ok(!/unpkg|jsdelivr|googleapis|gstatic/.test(html + readFileSync('dist/main.js', 'utf8')), '不使用国内不稳定的外部源');
console.log(`PASS: room config (${objects.length} objects, ${objects.filter(o => !o.soon).length} linked), vendored three@0.170.0, no external sources`);
