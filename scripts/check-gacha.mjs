// Checks for 扭蛋机 (docs/design/gashapon.md): the pile, the capsule and machine markup, the crank's angle rules.
import assert from 'node:assert/strict';
import { pile, random, machineMarkup, eggMarkup, VARIETIES, ZODIAC } from '../dist/modules/gacha/machine.js';
import { unwrap, STEP, FULL } from '../dist/modules/gacha/machine-home.js';

// The pile: reproducible from a seed, three layers, never more than one lamp egg, varieties only from the list.
assert.deepEqual(pile(random(7)), pile(random(7)));
let lamps = 0;
for (let seed = 1; seed <= 300; seed++) {
  const layers = pile(random(seed)); assert.equal(layers.length, 3);
  const eggs = layers.flat(), frost = eggs.filter(e => e.kind === 'frost').length;
  assert.ok(frost <= 1, 'at most one lamp egg in a pile'); lamps += frost;
  assert.ok(eggs.length > 40, 'the chamber is full');
  for (const e of eggs) assert.ok(e.kind === '' || e.kind === 'frost' || VARIETIES.includes(e.kind));
}
assert.ok(lamps > 30 && lamps < 120, `the lamp egg is seen now and then (${lamps}/300)`);
assert.equal(ZODIAC.length, 12);

// Markup
const html = machineMarkup({ seed: 3, mode: 1, sign: 4 });
for (const part of ['gc-chamber', 'gc-crank', 'gc-grip', 'gc-zod', 'gc-chute', 'gc-drop', 'gc-thumb', '--mode:1', '--sign:4']) assert.ok(html.includes(part), part);
assert.equal((html.match(/gc-grip/g) || []).length, 1, 'one brick-red grip');
assert.ok(!/[①②③]|拨星座|转一圈/.test(html), 'no instructions printed on the machine');
assert.ok(eggMarkup('frost').includes('gc-core') && eggMarkup('clear').includes('gc-gem'));

// The crank: angles unwrap to the short way round; a full turn is 360° in 30° clicks.
assert.equal(unwrap(350), -10); assert.equal(unwrap(-350), 10); assert.equal(unwrap(90), 90); assert.equal(unwrap(180), 180);
assert.equal(FULL / STEP, 12);
console.log('PASS: 扭蛋机 — pile, markup, crank rules');

// Step 2: the slip and the games
const { todaySlip, slipIndex, dayGanzhi, lunar, cnNumber } = await import('../dist/modules/gacha/fortune.js');
const { BANK, parseBank, createDeck } = await import('../dist/modules/gacha/games.js');
assert.equal(dayGanzhi({ y: 2000, m: 1, d: 7 }), '甲子');
assert.equal(dayGanzhi({ y: 2026, m: 9, d: 30 }), '丁未');
assert.deepEqual(lunar({ y: 2026, m: 2, d: 17 }), { year: '丙午', month: '正月', day: '初一' });
assert.equal([1, 10, 11, 20, 23, 100].map(cnNumber).join(' '), '一 十 十一 二十 二十三 一百');
for (let s = 0; s < 12; s++) assert.equal(slipIndex({ y: 2026, m: 9, d: 30 }, s, 100), slipIndex({ y: 2026, m: 9, d: 30 }, s, 100), 'same day, same sign → same slip');
const spread = new Set(Array.from({ length: 12 }, (_, s) => slipIndex({ y: 2026, m: 9, d: 30 }, s, 100)));
assert.ok(spread.size >= 8, 'different signs usually get different slips');
const slip = todaySlip({ y: 2026, m: 9, d: 30 }, 4);
assert.equal(slip.head, '二〇二六年九月三十日 · 丙午年八月二十 · 丁未日'); assert.equal(slip.signName, '狮子');
const questions = parseBank(BANK);
assert.ok(questions.length >= 20 && questions.every(q => q.kind === 'truth' || q.kind === 'dare'));
assert.deepEqual(parseBank('真：a\n\n冒:b\nnot a question'), [{ kind: 'truth', text: 'a', no: 1 }, { kind: 'dare', text: 'b', no: 2 }]);
const next = createDeck(questions), seen = new Set(); for (let i = 0; i < questions.length; i++) seen.add(next().no);
assert.equal(seen.size, questions.length, 'no repeats until the bank is used up');
console.log('PASS: 扭蛋机 — slips, almanac dates, question deck');
