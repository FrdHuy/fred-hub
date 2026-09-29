// Usage: node scripts/import-travel.mjs
// Reads docs/旅行行程-填写.md and writes dist/modules/travel/data.js.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseTravelForm, dataSource } from './lib/travel-import.mjs';
import { parseTravel, localNow } from '../dist/modules/travel/trips.js';

const source = new URL('../docs/旅行行程-填写.md', import.meta.url);
const target = new URL('../dist/modules/travel/data.js', import.meta.url);
const fail = message => { console.error(`\n✗ ${message}\n`); process.exit(1); };

const { data, problems } = parseTravelForm(readFileSync(source, 'utf8'));
if (problems.length) fail(`填写表里有看不懂的地方：\n  ${problems.join('\n  ')}`);
if (!data.arrivals.length && !data.departures.length) fail('填写表里还没有行程（例子不算）。填好一趟再运行。');
const checked = parseTravel(data, localNow(data.home.timeZone || 'America/Chicago'));
if (checked.errors.length) fail(`有 ${checked.errors.length} 处需要改：\n  ${checked.errors.join('\n  ')}`);
const missing = data.arrivals.filter(trip => trip.photo && !existsSync(new URL(`../dist/modules/travel/photos/${trip.photo}`, import.meta.url))).map(trip => trip.photo);
writeFileSync(target, dataSource(data));
console.log(`\n✓ 已写入：去过的 ${data.arrivals.length} 趟 · 想去的 ${data.departures.length} 个`);
if (missing.length) console.log(`  ⚠ 这些照片还没放进 dist/modules/travel/photos/：${missing.join('、')}（先显示色块）`);
console.log('  刷新预览页面就能看到翻牌屏。\n');
