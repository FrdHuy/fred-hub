// Checks for 磁带: the tape rules, the data file, and the walkman markup.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { parseTapes, runtime, sideLength, offsetOf, locate, counter, clock, PREVIEW_SECONDS } from '../dist/modules/music/tapes.js';
import { walkmanMarkup, cassetteMarkup } from '../dist/modules/music/walkman.js';
import data from '../dist/modules/music/data.js';

// Rules
const tapes = parseTapes([
  { id: 'x', title: 'X', color: 'purple', a: [{ title: 'one', preview: 'p1' }, { title: 'no source' }, { title: 'two', audio: 'two.mp3', seconds: 200 }], b: null },
  { title: 'missing id' },
]);
assert.equal(tapes.length, 1);
assert.equal(tapes[0].color, 'sage', 'unknown colours fall back');
assert.equal(tapes[0].a.length, 2, 'a track needs something to play');
assert.deepEqual(tapes[0].b, []);
const side = tapes[0].a;
assert.equal(runtime(side[0]), PREVIEW_SECONDS);
assert.equal(runtime(side[1]), 200);
assert.equal(sideLength(side), 230);
assert.equal(offsetOf(side, 1), 30);
assert.deepEqual(locate(side, 10), { index: 0, at: 10 });
assert.deepEqual(locate(side, 45), { index: 1, at: 15 });
assert.deepEqual(locate(side, 999), { index: 1, at: 200 });
assert.equal(counter(0), '000'); assert.equal(counter(31), '015'); assert.equal(counter(2001), '000');
assert.equal(clock(125), '2:05');

// Markup
const html = walkmanMarkup({ tape: tapes[0] });
for (const part of ['wm-key play', 'wm-glass', 'wm-vu', 'wm-count', 'cs-hub l', 'cs-hub r']) assert.ok(html.includes(part), part);
assert.equal((html.match(/play/g) || []).length >= 1, true);
assert.ok(!cassetteMarkup({ title: '<b>' }).includes('<b><'), 'titles are escaped');

// Data
const real = parseTapes(data);
assert.ok(Array.isArray(data), 'data.js exports a list');
assert.equal(new Set(real.map(t => t.id)).size, real.length, 'tape ids are unique');
for (const tape of real) for (const track of [...tape.a, ...tape.b]) {
  if (track.audio) assert.ok(existsSync(new URL(`../dist/modules/music/audio/${track.audio}`, import.meta.url)), `missing audio file: ${track.audio}`);
  if (track.preview) assert.match(track.preview, /^https:\/\//);
}
console.log(`PASS: 磁带 — ${real.length} tapes, ${real.reduce((n, t) => n + t.a.length + t.b.length, 0)} tracks`);

// Recorder helpers
const { trackFromItunes, audioName, tapeId, tapesSource } = await import('./lib/music-list.mjs');
assert.equal(trackFromItunes({ kind: 'podcast', trackName: 'x' }), null);
assert.deepEqual(trackFromItunes({ kind: 'song', trackName: '十年', artistName: '陳奕迅', previewUrl: 'https://p', trackViewUrl: 'https://m/1?i=2&uo=4', trackTimeMillis: 205000, artworkUrl100: 'a/100x100bb.jpg', collectionName: 'X' }),
  { title: '十年', artist: '陳奕迅', preview: 'https://p', link: 'https://m/1?i=2', seconds: 205, art: 'a/200x200bb.jpg', album: 'X' });
assert.equal(audioName('十年 Eason.MP3'), 'eason.mp3');
assert.equal(audioName('a b.m4a', new Set(['a-b.m4a'])), 'a-b-2.m4a');
assert.equal(tapeId('Road Trip', new Set(['road-trip'])), 'road-trip-2');
const source = tapesSource([{ id: 't', title: 'T', color: 'ink', a: [{ title: 's', preview: 'https://p', seconds: 0, art: 'dropped' }], b: [] }]);
assert.ok(source.startsWith('// Fred 的磁带'));
const body = source.slice(source.indexOf('export default'));
assert.ok(!body.includes('"art"') && !body.includes('"seconds"'), 'only what the site reads is written');
console.log('PASS: 磁带录音台 helpers');
