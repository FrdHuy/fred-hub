// Usage: node scripts/import-lifelist.mjs [docs/人生清单候选-200.md] [--force]
// Reads the ticked checklist and writes dist/modules/bucketlist/data.js (max 100 lamps).
import { readFileSync, writeFileSync } from 'node:fs';
import { parseChecklist, dataSource } from './lib/lifelist-import.mjs';
import { parseItems } from '../dist/modules/bucketlist/items.js';

const args = process.argv.slice(2), force = args.includes('--force');
const source = new URL(`../${args.find(a => !a.startsWith('--')) ?? 'docs/人生清单候选-200.md'}`, import.meta.url);
const target = new URL('../dist/modules/bucketlist/data.js', import.meta.url);
const fail = message => { console.error(`\n✗ ${message}\n`); process.exit(1); };

const { entries, problems } = parseChecklist(readFileSync(source, 'utf8'));
if (problems.length) fail(`清单里有 ${problems.length} 处看不懂：\n  ${problems.join('\n  ')}`);
if (entries.length > 100) {
  const events = entries.filter(e => e.milestone).length, done = entries.filter(e => e.done).length;
  fail(`一共 ${entries.length} 条（大事件 ${events}、做到的 ${done}、愿望 ${entries.length - events - done}），面板只有 100 盏灯。再删掉 ${entries.length - 100} 条再导入。`);
}
const existing = parseItems((await import(`${target.href}?t=${Date.now()}`)).default).items;
if (existing.length && !force) fail(`data.js 里已经有 ${existing.length} 条，导入会覆盖。确定的话加 --force 再运行。`);
writeFileSync(target, dataSource(entries));
const events = entries.filter(e => e.milestone).length, done = entries.filter(e => e.done).length;
console.log(`\n✓ 已写入 ${entries.length} 条：大事件 ${events} · 做到的 ${done} · 愿望 ${entries.length - events - done}`);
console.log('  刷新预览页面就能看到面板亮灯。\n');
