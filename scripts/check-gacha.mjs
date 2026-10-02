// Checks for 扭蛋机 (docs/design/gashapon.md): the pile, the capsule and machine markup, the crank's angle rules.
import assert from 'node:assert/strict';
import { pile, random, machineMarkup, eggMarkup, STYLES, EASTER, pickKind, ZODIAC } from '../dist/modules/gacha/machine.js';
import { unwrap, STEP, FULL } from '../dist/modules/gacha/machine-home.js';

// The pile: reproducible from a seed, three layers, never more than one lamp egg, varieties only from the list.
assert.deepEqual(pile(random(7)), pile(random(7)));
let lamps = 0;
for (let seed = 1; seed <= 300; seed++) {
  const layers = pile(random(seed)); assert.equal(layers.length, 3);
  const eggs = layers.flat(), frost = eggs.filter(e => e.kind === 'frost').length;
  assert.ok(frost <= 1, 'at most one lamp egg in a pile'); lamps += frost;
  assert.ok(eggs.length > 40, 'the chamber is full');
  for (const e of eggs) assert.ok(STYLES.includes(e.kind) || EASTER.includes(e.kind), e.kind);
  assert.ok(eggs.filter(e => e.kind === 'pearl').length <= 1);
}
assert.ok(lamps > 30 && lamps < 120, `the lamp egg is seen now and then (${lamps}/300)`);
assert.equal(ZODIAC.length, 12);
{ const r = random(11), counts = {}; for (let i = 0; i < 20000; i++) { const k = pickKind(r); counts[k] = (counts[k] || 0) + 1; }
  assert.ok(counts.frost > 300 && counts.frost < 700, 'the lamp egg ≈ 1/40 of turns'); assert.ok(counts.pearl > 450 && counts.pearl < 900, 'the pearl egg ≈ 1/30');
  assert.ok(STYLES.every(s => counts[s] > 300), 'every ordinary style turns up'); }

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
assert.ok(['上签', '中签', '下签'].includes(slip.rankText) && slip.poem.length === 4 && slip.poem.every(l => l.length === 7));
assert.equal(slip.head, '二〇二六年九月三十日 · 丙午年八月二十 · 丁未日'); assert.equal(slip.signName, '狮子');
const questions = parseBank(BANK);
assert.ok(questions.length >= 20 && questions.every(q => q.kind === 'truth' || q.kind === 'dare'));
assert.deepEqual(parseBank('真：a\n\n冒:b\nnot a question'), [{ kind: 'truth', text: 'a', no: 1 }, { kind: 'dare', text: 'b', no: 2 }]);
const next = createDeck(questions), seen = new Set(); for (let i = 0; i < questions.length; i++) seen.add(next().no);
assert.equal(seen.size, questions.length, 'no repeats until the bank is used up');
console.log('PASS: 扭蛋机 — slips, almanac dates, question deck');

// Step 3: the real data
const { positions, signOf } = await import('../dist/modules/gacha/astro.js');
const { almanac } = await import('../dist/modules/gacha/almanac.js');
const { scores, horoscope } = await import('../dist/modules/gacha/horoscope.js');
const LINGQIAN = (await import('../dist/modules/gacha/lingqian.js')).default;
const { readFileSync } = await import('node:fs');
// planets against NASA JPL Horizons (fixtures): within 0.1°, and always the same sign
const ref = JSON.parse(readFileSync(new URL('./fixtures/horizons.json', import.meta.url)));
for (const [day, bodies] of Object.entries(ref)) {
  const [y, m, d] = day.split('-').map(Number), p = positions({ y, m, d, h: 12 });
  for (const [b, lon] of Object.entries(bodies)) { let e = Math.abs(p[b] - lon); if (e > 180) e = 360 - e; assert.ok(e < .1, `${day} ${b} off by ${e}`); }
}
// the almanac against published almanacs
assert.deepEqual([almanac({ y: 2024, m: 2, d: 10 })].map(a => [a.ganzhi, a.officer, a.clash])[0], ['甲辰', '满', '冲狗 煞南']);
assert.deepEqual([almanac({ y: 2026, m: 1, d: 1 })].map(a => [a.ganzhi, a.officer, a.clash])[0], ['乙亥', '闭', '冲蛇 煞西']);
// the hundred slips
assert.equal(LINGQIAN.length, 100);
assert.deepEqual(LINGQIAN.reduce((c, s) => (c[s.rank] = (c[s.rank] || 0) + 1, c), {}), { 上: 22, 中: 60, 下: 18 });
for (const s of LINGQIAN) { assert.ok(s.poem.length === 4 && s.poem.every(l => /^[\u4e00-\u9fff]{7}$/.test(l)), `slip ${s.no}`); assert.ok(s.name && s.meaning && s.jie.length); }
assert.equal(LINGQIAN[2].poem[2], '衔得泥来成叠后');   // a recorded correction (docs/design/lingqian-sources.md)
// fortunes: 1–5 stars, stable for a day and a sign, words never mention planets
for (let s = 0; s < 12; s++) { const h = horoscope({ y: 2026, m: 9, d: 30 }, s); assert.equal(h.length, 5); for (const f of h) { assert.ok(f.stars >= 1 && f.stars <= 5 && f.text.length > 8); assert.ok(!/金星|木星|火星|土星|水星|月亮|宫|相位/.test(f.text), f.text); } }
assert.deepEqual(scores({ y: 2026, m: 9, d: 30 }, 3), scores({ y: 2026, m: 9, d: 30 }, 3));
console.log('PASS: 扭蛋机 — planets vs JPL, almanac vs published, 100 slips, fortunes');

// The hidden door: the site carries only ciphertext, and the key is not written anywhere in dist/
{
  const { execFileSync } = await import('node:child_process');
  const { unseal } = await import('../dist/modules/stories/seal.js');
  const sealed = (await import('../dist/modules/gacha/couple.js')).default;
  const source = readFileSync(new URL('../notes/couple-bank.txt', import.meta.url), 'utf8');
  const key = source.match(/暗号[^：:]*[：:]\s*([udlr]{4,})/i)[1];
  const extra = await unseal(sealed, key);
  assert.ok(Array.isArray(extra) && extra.length >= 20 && extra.every(q => (q.kind === 'truth' || q.kind === 'dare') && q.text));
  assert.equal(await unseal(sealed, 'udududud'), null, 'a wrong sequence opens nothing');
  const first = extra[0].text.slice(0, 8);
  let leaked = ''; try { leaked = execFileSync('grep', ['-rl', '-e', key, '-e', first, 'dist'], { encoding: 'utf8' }); } catch {}
  assert.equal(leaked.trim(), '', 'neither the key nor the questions appear in dist/');
  console.log(`PASS: 扭蛋机 — hidden door (${extra.length} sealed questions, nothing readable in dist/)`);
}
