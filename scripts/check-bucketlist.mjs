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
