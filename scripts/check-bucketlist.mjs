import assert from 'node:assert/strict';
import {parseEntries,loadEntries,saveEntries} from '../dist/modules/bucketlist/storage.js';
assert.deepEqual(parseEntries(null),[]);
const entries=[{id:'a',text:'去看极光 <不是 HTML>',done:false},{id:'b',text:'一件已经完成的事',done:true}];
let saved;
const storage={getItem:()=>saved,setItem:(key,value)=>saved=value};
saveEntries(storage,entries);assert.deepEqual(loadEntries(storage),entries);
entries[0].done=true;saveEntries(storage,entries);assert.equal(loadEntries(storage)[0].done,true);
entries[0].done=false;saveEntries(storage,entries);assert.equal(loadEntries(storage)[0].done,false);
assert.throws(()=>parseEntries('{broken'));
assert.throws(()=>parseEntries('[{"id":"a","text":"x","done":"yes"}]'));
assert.throws(()=>parseEntries(JSON.stringify([entries[0],entries[0]])));
console.log('PASS: empty list, roundtrip persistence, completion/undo state and invalid-data protection');

// data.js rules (the list is now a read-only data file).
const { parseItems, itemLines } = await import('../dist/modules/bucketlist/items.js');
assert.deepEqual(parseItems([{ text: ' 看极光 ' }, { text: '写日记', done: true }]), { items: [{ text: '看极光', done: false }, { text: '写日记', done: true }], errors: [] });
const bad = parseItems([{ text: '' }, { text: 'x', done: 'yes' }, { txt: 'x' }, null]);
assert.equal(bad.items.length, 0); assert.equal(bad.errors.length, 4); assert.match(bad.errors[2], /未知字段 txt/);
assert.equal(parseItems({}).errors.length, 1);
const lines = itemLines([{ text: '说 "你好"', done: false }]);
assert.equal((await import(`data:text/javascript,${encodeURIComponent(`export default [\n${lines}\n];`)}`)).default[0].text, '说 "你好"');
const real = parseItems((await import('../dist/modules/bucketlist/data.js')).default);
if (real.errors.length) { console.error(`✗ 清单 data.js 有问题：\n  ${real.errors.join('\n  ')}`); process.exit(1); }
console.log(`PASS: bucketlist data rules, legacy export lines, data.js — ${real.items.length} 条`);

// Fortune tube: numerals, shake detection, draws that never repeat, unique SVG ids per cover.
const { chineseNumber, shakeMeter, pickIndex } = await import('../dist/modules/bucketlist/fortune.js');
const { fortuneCover } = await import('../dist/modules/bucketlist/cover.js');
assert.deepEqual([1, 7, 10, 11, 20, 23, 99].map(chineseNumber), ['一', '七', '十', '十一', '二十', '二十三', '九十九']);
const meter = shakeMeter(14);
assert.deepEqual([0, -6, -12, -20, -8, 4, 10, 2, -10, -3].map(meter), [false, false, false, false, true, false, false, true, false, true]);
const tiny = shakeMeter(14);
assert.ok(![0, -4, -8, -4, 0, -5, 0].map(tiny).some(Boolean), 'small jiggles are not shakes');
for (let last = 0; last < 5; last++) for (const r of [0, .3, .6, .99]) assert.notEqual(pickIndex(5, last, () => r), last);
assert.equal(pickIndex(1, 0), 0);
const [a, b] = [fortuneCover(), fortuneCover()], ids = html => [...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]);
assert.equal((a.match(/class="fortune-stick"/g) || []).length, 16);
assert.ok(!ids(a).some(id => ids(b).includes(id)), 'each cover owns its gradients');
console.log('PASS: fortune numerals, shake meter, non-repeating draw, cover ids');
