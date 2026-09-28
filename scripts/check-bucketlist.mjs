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

// Optional year, and the panel rules (lamps, looking back, lever, knob).
assert.deepEqual(parseItems([{ text: 'a', done: true, year: 2019 }]).items, [{ text: 'a', done: true, year: 2019 }]);
assert.match(parseItems([{ text: 'a', year: 2019 }]).errors[0], /year 只在 done/);
assert.match(parseItems([{ text: 'a', done: true, year: 19 }]).errors[0], /1900–2100/);
const { lampStates, litCount, yearSpan, knobSteps, leverPosition, SLOTS } = await import('../dist/modules/bucketlist/panel.js');
const life = [{ text: 'a', done: true, year: 2015 }, { text: 'b', done: false }, { text: 'c', done: true }, { text: 'd', done: true, year: 2021 }];
const nowStates = lampStates(life, 2026, 2026);
assert.equal(nowStates.length, SLOTS);
assert.deepEqual(nowStates.slice(0, 5), ['done', 'todo', 'done', 'done', 'empty']);
assert.equal(litCount(nowStates), 3);
assert.deepEqual(lampStates(life, 2018, 2026).slice(0, 4), ['done', 'todo', 'todo', 'todo'], 'looking back hides later and undated achievements');
assert.equal(litCount(lampStates(life, 2014, 2026)), 0);
assert.deepEqual(yearSpan(life, 2026), [2015, 2026]);
assert.deepEqual(yearSpan([], 2026), [2025, 2026]);
assert.deepEqual([0, 23, 24, 50, -25].map(d => knobSteps(d)), [0, 0, 1, 2, -1]);
assert.deepEqual([0, -35, -70, -140, 20].map(dy => leverPosition(dy)), [0, .5, 1, 1, 0]);
console.log('PASS: optional year, lamp states, look-back years, knob detents, lever travel');
