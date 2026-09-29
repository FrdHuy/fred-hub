import assert from 'node:assert/strict';
import { parseNote, renderMarkdown } from './lib/notes-publish.mjs';
import { seal, unseal } from '../dist/modules/stories/seal.js';
import { TYPES, dotDate, sortNotes, years, minutes, noteForTrip, noteForItem } from '../dist/modules/stories/notes.js';
import { typewriterMarkup } from '../dist/modules/stories/typewriter.js';

// Header
const ok = parseNote('---\n标题：极光\n日期：2024-10-12\n类型：游记\n旅行：kef\n暗号：Aurora\n---\n正文', 'a.md');
assert.deepEqual(ok.problems, []);
assert.deepEqual(ok.meta, { title: '极光', date: '2024-10-12', type: 'travel', trip: 'KEF', password: 'Aurora' });
assert.equal(parseNote('---\ntitle: X\ndate: 2025-01-02\ntype: essay\n---\n', 'b.md').meta.type, 'essay');
assert.match(parseNote('没有开头', 'c.md').problems[0], /开头要有/);
assert.match(parseNote('---\n标题：x\n日期：2024-1-2\n类型：游记\n---\n', 'd.md').problems.join(), /日期/);
assert.match(parseNote('---\n标题：x\n日期：2024-01-02\n类型：日记\n---\n', 'e.md').problems.join(), /类型/);
assert.match(parseNote('---\n标题：x\n日期：2024-01-02\n类型：游记\n心情：好\n---\n', 'f.md').problems.join(), /看不懂/);
console.log('PASS: note headers (Chinese or English keys, validation)');

// Markdown
const md = renderMarkdown('第一段第一行\n第一段第二行，and\nwords here。\n\n## 小标题\n\n> 引用\n\n- 一\n- 二\n\n![说明](a.jpg)\n![](b.png)\n\n**粗**、*斜*、[链接](https://x.y) <script>', src => `media/${src}`);
assert.match(md.html, /<p>第一段第一行第一段第二行，and words here。<\/p>/, 'Chinese lines join without a space, words with one');
assert.match(md.html, /<h2>小标题<\/h2>/); assert.match(md.html, /<blockquote>引用<\/blockquote>/); assert.match(md.html, /<ul><li>一<\/li><li>二<\/li><\/ul>/);
assert.match(md.html, /<div class="nt-photos" data-n="2"><figure><img src="media\/a.jpg" alt="说明" loading="lazy"><figcaption>说明<\/figcaption><\/figure><figure><img src="media\/b.png" alt="" loading="lazy"><\/figure><\/div>/);
assert.match(md.html, /<strong>粗<\/strong>、<em>斜<\/em>、<a href="https:\/\/x.y" target="_blank" rel="noopener">链接<\/a> &lt;script&gt;/);
assert.ok(!/<script>/.test(md.html), 'HTML in a note is shown as text');
assert.equal(md.excerpt, '第一段第一行第一段第二行，and words here。');
assert.deepEqual(md.images, ['a.jpg', 'b.png']);
console.log('PASS: Markdown (paragraphs, headings, quotes, lists, photo rows, inline, escaping)');

// Sealing
const sealed = await seal({ html: '<p>秘密</p>', excerpt: '秘密' }, ' Fred ');
assert.ok(!JSON.stringify(sealed).includes('秘密'));
assert.deepEqual(await unseal(sealed, 'FRED'), { html: '<p>秘密</p>', excerpt: '秘密' }, 'case and spaces do not matter');
assert.equal(await unseal(sealed, 'fredd'), null);
console.log('PASS: password sealing round trip');

// Rules shared with the page and other modules
assert.equal(dotDate('2024-10-12'), '12.10.2024');
assert.equal(TYPES.travel, 'TRAVEL LOG');
const notes = [{ id: 'b', date: '2024-10-12', trip: 'KEF' }, { id: 'a', date: '2025-05-20', milestone: 'Madison毕业' }, { id: 'c', date: '2023-01-01', trip: 'KEF' }];
assert.deepEqual(sortNotes(notes).map(n => n.id), ['a', 'b', 'c']);
assert.deepEqual(years(notes), ['2025', '2024', '2023']);
assert.equal(noteForTrip(notes, { code: 'KEF', date: { year: 2024, month: 10, day: 1 } }).id, 'b', 'closest date wins');
assert.equal(noteForTrip(notes, { code: 'KEF', date: { year: 2020, month: 1, day: 1 } }), null, 'more than 90 days away is another trip');
assert.equal(noteForItem(notes, 'Madison毕业').id, 'a');
assert.equal(minutes('字'.repeat(1200)), 3); assert.equal(minutes('word '.repeat(440)), 2); assert.equal(minutes(''), 1);
const tw = typewriterMarkup({ kicker: 'A<b>', title: '<i>x</i>' });
assert.ok(tw.includes('data-k="enter"') && tw.includes('data-k="q"') && tw.includes('A&lt;b&gt;') && !tw.includes('<i>x</i>'));
console.log('PASS: dates, order, travel/Life List links, reading time, typewriter markup');

// The published data
const data = (await import('../dist/modules/stories/data.js')).default;
assert.ok(Array.isArray(data));
for (const note of data) {
  assert.ok(note.id && note.title && /^\d{4}-\d{2}-\d{2}$/.test(note.date) && TYPES[note.type], `note ${note.id}`);
  assert.ok(note.locked ? note.locked.data && !note.html && !note.excerpt : typeof note.html === 'string', `note ${note.id}: either sealed or readable`);
}
console.log(`PASS: stories data.js — ${data.length} 篇（${data.filter(n => n.locked).length} 篇需要暗号）`);
