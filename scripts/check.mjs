import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { modules, categories, searchModules } from '../dist/catalog.js';
import { moduleIds } from '../dist/modules/index.js';
import { readRoute, collectionPath } from '../dist/router.js';
assert.equal(new Set(modules.map(x => x.id)).size, modules.length);
for (const item of modules) {
  for (const key of ['id','title','description','cover','emptyTitle','emptyText','section']) assert.ok(item[key], `${item.id}: missing ${key}`);
  assert.ok(categories.includes(item.category));
  assert.deepEqual(readRoute(collectionPath(item.id)), {type:'collection',id:item.id});
}
assert.deepEqual(readRoute(''), {type:'home'});
assert.deepEqual(readRoute('#/unknown'), {type:'missing'});
assert.deepEqual(readRoute('#/collection/%E0%A4%A'), {type:'missing'});
assert.equal(searchModules('  cinema ')[0].id, 'cinema');
assert.equal(searchModules('不存在的收藏').length, 0);
assert.equal(searchModules('').length, modules.length);
for (const file of ['main.js','gallery.js','catalog.js','router.js','wheel.js','experience.js','swipe.js','contact.js','modules/index.js','modules/empty.js',...moduleIds.map(id => `modules/${id}/index.js`)]) {
  const result = spawnSync(process.execPath, ['--check', `dist/${file}`], {encoding:'utf8'});
  assert.equal(result.status, 0, result.stderr);
}
const html = readFileSync('dist/index.html','utf8');
for (const match of html.matchAll(/(?:href|src)="\.\/([^"#]+)"/g)) assert.ok(existsSync(`dist/${match[1].split("?")[0]}`), match[1]);
assert.ok(existsSync('dist/assets/collection-atlas.png'));
assert.ok(existsSync('dist/assets/fred-diary.png'));
assert.ok(!html.includes('search-dialog'));
assert.ok(!html.includes('category-nav'));
assert.ok(html.includes('module-menu'));
assert.deepEqual([...moduleIds].sort(), modules.map(x => x.id).sort());
assert.ok(html.includes('Fred'));
assert.equal(modules.find(x=>x.id==='bucketlist').cover, 'list');
assert.ok(!modules.some(x=>x.id==='wheel'));
console.log('PASS: module registry, search, routes, local assets and JavaScript syntax');

for (const asset of ['compass.png','cd-player.png']) assert.ok(existsSync(`dist/assets/${asset}`));
