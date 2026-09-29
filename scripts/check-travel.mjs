import assert from 'node:assert/strict';
import { parseTravel, stats, pax, daysUntil, flapText, readDate, monthYear, passDate, flipPath, localNow, CHARSET, FIELD } from '../dist/modules/travel/trips.js';

const today = { year: 2026, month: 9, day: 29 };
assert.equal(flapText('Reykjavík'), 'REYKJAVIK');
assert.equal(flapText('  São  Paulo '), 'SAO PAULO');
assert.equal(flapText('東京 Tokyo!'), 'TOKYO');
assert.deepEqual([readDate('2024-10'), readDate('2024-02-30'), readDate('2024-13'), readDate('24-10')].map(Boolean), [true, false, false, false]);
assert.equal(monthYear(readDate('2024-10-12')), 'OCT 2024');
assert.equal(passDate(readDate('2024-10-02')), '02 OCT 2024');
assert.equal(passDate(readDate('2024-10')), 'OCT 2024');
assert.equal(passDate(null), 'TBD');
console.log('PASS: flap text, dates');

const trip = (to, date, extra = {}) => ({ to, code: 'ABC', country: 'X', date, days: 3, ...extra });
const board = parseTravel({ home: { city: 'Madison', airport: 'msn' }, arrivals: [trip('B', '2023-05'), trip('A', '2021-01-02', { country: 'Y' }), trip('C', '2025-03', { from: 'ord' })], departures: [
  { to: 'Someday', code: 'SOM' }, { to: 'Later', code: 'LAT', date: '2027-05' }, { to: 'Next', code: 'NXT', date: '2026-12-01' }, { to: 'Late', code: 'LTE', date: '2026-08' }, { to: 'This month', code: 'NOW', date: '2026-09' },
] }, today);
assert.deepEqual(board.errors, []);
assert.deepEqual(board.arrivals.map(t => [t.to, t.number, t.from]), [['C', 3, 'ORD'], ['B', 2, 'MSN'], ['A', 1, 'MSN']], 'latest first, numbered in the order they happened');
assert.deepEqual(board.arrivals.map(t => Boolean(t.live)), [true, false, false]);
assert.deepEqual(board.departures.map(t => [t.to, t.status, t.number]), [['LATE', 'DELAYED', 4], ['THIS MONTH', 'BOARDING', 5], ['NEXT', 'SCHEDULED', 6], ['LATER', 'SCHEDULED', 7], ['SOMEDAY', 'SOMEDAY', 8]]);
assert.deepEqual(stats(board, today), { flights: 3, countries: 2, since: 2021, plans: 5, daysAway: 9, longest: { days: 3, code: 'ABC' }, next: readDate('2026-09'), nextIn: 0 });
assert.deepEqual([pax({ with: '小林、阿杰' }), pax({ with: '独自' }), pax({}), pax({ with: 'Tom and Ann' }), pax({ with: 'A, B / C' })], [3, 1, 1, 3, 4]);
assert.equal(daysUntil({ year: 2026, month: 12, day: 18 }, today), 80);
console.log('PASS: ordering, flight numbers, departure statuses, stats');

const bad = parseTravel({ arrivals: [trip('Llanfairpwllgwyngyll', '2020-01'), { to: 'X', code: 'KEFF', country: 'x', date: '2020-01', days: 1 }, trip('X', '2020-01', { days: 0 }), trip('X', '2020-01', { photo: '../a.jpg' }), trip('X', '2020-01', { note: 'x' }), trip('X', '2020-01', { country: '' })], departures: [{ to: 'X', code: 'ABC', date: 'soon' }], extra: 1 }, today);
assert.equal(bad.arrivals.length, 0);
assert.equal(bad.errors.length, 8);
assert.match(bad.errors.join('\n'), /最多 12 个字符/); assert.match(bad.errors.join('\n'), /未知字段 note/); assert.match(bad.errors.join('\n'), /未知字段 extra/);
assert.match(parseTravel({ home: { timeZone: 'Mars/Base' } }, today).errors[0], /timeZone/);
assert.equal(parseTravel(null, today).errors.length, 1);
console.log('PASS: invalid data is reported, not shown');

assert.deepEqual(flipPath(' ', 'C', 3), ['A', 'B', 'C']);
assert.deepEqual(flipPath(' ', 'A', 6), ['A'], 'never runs past the target');
assert.deepEqual(flipPath('Z', 'B', 2), ['A', 'B']);
assert.deepEqual(flipPath('X', 'X', 4), ['X']);
assert.equal(flipPath('/', ' ', 5).at(-1), ' ', 'wraps round to the blank flap');
assert.ok(CHARSET.startsWith(' ') && FIELD === 12);
assert.match(localNow('Asia/Shanghai', new Date('2026-09-29T06:05:00Z')).time, /^14:05$/);
console.log('PASS: flap paths, local clock');

const real = parseTravel((await import('../dist/modules/travel/data.js')).default, localNow('America/Chicago'));
if (real.errors.length) { console.error(`✗ 旅行 data.js 有问题：\n  ${real.errors.join('\n  ')}`); process.exit(1); }
console.log(`PASS: travel data.js — ${real.arrivals.length} 趟去过的，${real.departures.length} 个想去的`);

// The fill-in form → data.js importer.
const { parseTravelForm, dataSource } = await import('./lib/travel-import.mjs');
const form = `# 旅行行程\n## 基本信息\n- 城市：Madison\n- 机场：MSN\n- 时区（不懂就别改）：America/Chicago\n## 去过的地方\n<!-- 说明 -->\n### 例\n- 目的地：Reykjavik\n- 三字码：KEF\n### \n- 目的地：Kyoto\n- 三字码：KIX\n- 国家：日本\n- 出发：ORD（选填）\n- 日期：2025-04\n- 天数：6\n- 同行：\n- 一句话：樱花落了一地。\n### \n- 目的地：\n- 三字码：\n## 想去的地方\n### \n- 目的地：Lisbon\n- 三字码：LIS\n- 日期：\n`;
const imported = parseTravelForm(form);
assert.deepEqual(imported.problems, []);
assert.deepEqual(imported.data, { home: { city: 'Madison', airport: 'MSN', timeZone: 'America/Chicago' }, arrivals: [{ to: 'Kyoto', code: 'KIX', country: '日本', from: 'ORD', date: '2025-04', days: 6, line: '樱花落了一地。' }], departures: [{ to: 'Lisbon', code: 'LIS' }] }, 'examples and blank slots are skipped');
const written = (await import(`data:text/javascript,${encodeURIComponent(dataSource(imported.data))}`)).default;
assert.deepEqual(written, imported.data, 'data.js round trip');
assert.deepEqual(parseTravel(written, today).errors, []);
assert.match(parseTravelForm('## 去过的地方\n### \n- 目的的：x\n').problems[0], /看不懂「目的的」/);
console.log('PASS: travel form import');

// Recorder helpers: the form written back, the airport table, the nearest airport, a city from OpenStreetMap.
const { formSource } = await import('./lib/travel-import.mjs');
const recorded = { home: { city: 'Madison', airport: 'MSN', timeZone: 'America/Chicago' }, arrivals: [{ to: 'Kyoto', code: 'KIX', country: '日本', date: '2025-04-03', days: 6, with: '独自', line: '樱花：落了一地。', photo: 'kix-2025-04.jpg' }], departures: [{ to: 'Lisbon', code: 'LIS' }] };
assert.deepEqual(parseTravelForm(formSource(recorded)), { data: recorded, problems: [] }, 'form → trips → form is lossless');
const { parseCsv, airportsFromCsv, nearestAirport, airportChoices, placeFrom } = await import('./lib/places.mjs');
assert.deepEqual(parseCsv('a,"b, c","d ""e"""\n1,2,3\n'), [['a', 'b, c', 'd "e"'], ['1', '2', '3']]);
const csv = 'id,type,name,latitude_deg,longitude_deg,iso_country,municipality,scheduled_service,iata_code\n1,large_airport,Kansai,34.43,135.23,JP,Osaka,yes,KIX\n2,medium_airport,Kobe,34.63,135.22,JP,Kobe,yes,UKB\n3,small_airport,Strip,35.0,135.7,JP,Kyoto,no,\n4,large_airport,Narita,35.76,140.39,JP,Tokyo,yes,NRT\n5,heliport,Pad,35,135,JP,X,yes,HPX\n';
const table = airportsFromCsv(csv);
assert.deepEqual(table.map(a => a.iata), ['KIX', 'UKB', 'NRT'], 'only large/medium airports with flights and a code');
assert.equal(nearestAirport(table, { lat: 35.01, lon: 135.77 }).iata, 'KIX', 'Kyoto flies into Kansai, not the slightly closer Kobe');
assert.equal(nearestAirport(table, { lat: 35.68, lon: 139.76 }).iata, 'NRT');
const iceland = airportsFromCsv('type,name,latitude_deg,longitude_deg,iso_country,municipality,scheduled_service,iata_code\nmedium_airport,Reykjavik Domestic,64.13,-21.94,IS,Reykjavik,yes,RKV\nlarge_airport,Keflavik International,63.98,-22.61,IS,Keflavik,yes,KEF\n');
assert.deepEqual(airportChoices(iceland, { lat: 64.14, lon: -21.9 }).map(a => a.iata), ['KEF', 'RKV'], 'the international airport first, the domestic one as a second choice');
const kyoto = placeFrom({ name: 'Kyoto', lat: '35.02', lon: '135.75', display_name: 'Kyoto, Kyoto Prefecture, Japan', address: { city: 'Kyoto', country: 'Japan', country_code: 'jp' } });
assert.deepEqual([kyoto.name, kyoto.country, kyoto.countryCode], ['Kyoto', '日本', 'JP']);
console.log('PASS: travel recorder — form round trip, airport table, nearest airport, city lookup');
