// Pure data rules for data.js; shared by the page and scripts/check-travel.mjs.
export const FIELD = 12;
export const CHARSET = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-:'&/";
export const PHOTO_PATTERN = /^[\w.-]+\.(jpe?g|png|webp)$/i;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const ARRIVAL = ['to', 'code', 'country', 'date', 'days', 'from', 'with', 'line', 'photo'];
const DEPARTURE = ['to', 'code', 'date', 'from', 'line'];
const HOME = ['city', 'airport', 'timeZone'];

// What a flap can show: upper case, no accents, anything else becomes a blank flap.
export function flapText(text) {
  return String(text).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/./g, c => CHARSET.includes(c) ? c : ' ').replace(/\s+/g, ' ').trim();
}

// '2024-10' or '2024-10-12' → { year, month, day }; anything else → null.
export function readDate(value) {
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value ?? '');
  if (!match) return null;
  const [year, month, day = 1] = [+match[1], +match[2], +(match[3] ?? 1)];
  if (month < 1 || month > 12 || day < 1 || day > new Date(year, month, 0).getDate()) return null;
  return { year, month, day, key: year * 10000 + month * 100 + day, exact: Boolean(match[3]) };
}
export const monthYear = date => date ? `${MONTHS[date.month - 1]} ${date.year}` : 'TBD';
export const passDate = date => date ? `${date.exact ? `${String(date.day).padStart(2, '0')} ` : ''}${MONTHS[date.month - 1]} ${date.year}` : 'TBD';
export const flight = number => `FH ${String(number).padStart(3, '0')}`;
export const pad2 = number => String(number).padStart(2, '0');

function problem(entry, fields, departure) {
  if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return '应是 { … } 形式的一条';
  const unknown = Object.keys(entry).find(key => !fields.includes(key));
  if (unknown) return `未知字段 ${unknown}（可用：${fields.join('、')}）`;
  if (typeof entry.to !== 'string' || !flapText(entry.to)) return 'to（目的地，英文）必填';
  if (flapText(entry.to).length > FIELD) return `to 最多 ${FIELD} 个字符（翻牌只有 ${FIELD} 格）：${flapText(entry.to)}`;
  if (typeof entry.code !== 'string' || !/^[A-Za-z]{3}$/.test(entry.code.trim())) return 'code 应是三个字母的机场代码，如 KEF';
  if ('from' in entry && !(typeof entry.from === 'string' && /^[A-Za-z]{3}$/.test(entry.from.trim()))) return 'from 应是三个字母的机场代码';
  if (!departure || 'date' in entry) if (!readDate(entry.date)) return departure ? 'date 写成 2027-03 或 2027-03-15，不定就删掉这一行' : 'date 写成 2024-10 或 2024-10-12';
  if (!departure && !(Number.isInteger(entry.days) && entry.days >= 1 && entry.days <= 999)) return 'days 应是天数，如 7';
  for (const key of ['country', 'with', 'line']) if (key in entry && typeof entry[key] !== 'string') return `${key} 应是文字`;
  if (!departure && !(typeof entry.country === 'string' && entry.country.trim())) return 'country（国家）必填，用来统计去过几个国家';
  if ('photo' in entry && entry.photo !== '' && !(typeof entry.photo === 'string' && PHOTO_PATTERN.test(entry.photo))) return 'photo 只写 photos/ 里的文件名，如 kef-2024.jpg';
  return '';
}

function list(entries, fields, departure, label, errors) {
  if (!Array.isArray(entries)) { errors.push(`${label} 应是一个数组 [ … ]`); return []; }
  return entries.flatMap((entry, index) => {
    const reason = problem(entry, fields, departure);
    if (reason) { errors.push(`${label} 第 ${index + 1} 条：${reason}`); return []; }
    return [{ ...entry, order: index, to: flapText(entry.to), code: entry.code.trim().toUpperCase(), from: entry.from?.trim().toUpperCase(), date: readDate(entry.date), line: entry.line?.trim() ?? '', with: entry.with?.trim() ?? '' }];
  });
}

// Everything the board shows, sorted and numbered. `today` is { year, month, day } in Fred's time zone.
export function parseTravel(data, today) {
  const errors = [];
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { errors: ['data.js 应导出 { home, arrivals, departures }'], home: readHome({}, errors), arrivals: [], departures: [] };
  const unknown = Object.keys(data).find(key => !['home', 'arrivals', 'departures'].includes(key));
  if (unknown) errors.push(`未知字段 ${unknown}（可用：home、arrivals、departures）`);
  const home = readHome(data.home ?? {}, errors);
  const arrivals = list(data.arrivals ?? [], ARRIVAL, false, 'arrivals', errors);
  const departures = list(data.departures ?? [], DEPARTURE, true, 'departures', errors);
  // Flight numbers run in the order the trips happened; the board shows the latest first.
  arrivals.sort((a, b) => a.date.key - b.date.key || a.order - b.order).forEach((trip, index) => { trip.number = index + 1; trip.from ||= home.airport; trip.status = 'ARRIVED'; });
  arrivals.reverse();
  if (arrivals[0]) arrivals[0].live = true;
  const day = today.year * 10000 + today.month * 100 + today.day;
  departures.sort((a, b) => (a.date?.key ?? Infinity) - (b.date?.key ?? Infinity) || a.order - b.order);
  // A dated plan whose month has passed is DELAYED; the nearest one still ahead is BOARDING.
  const passed = trip => trip.date && (trip.date.exact ? trip.date.key < day : trip.date.year * 100 + trip.date.month < today.year * 100 + today.month);
  let boarding = false;
  departures.forEach((trip, index) => {
    trip.number = arrivals.length + index + 1; trip.from ||= home.airport;
    trip.status = !trip.date ? 'SOMEDAY' : passed(trip) ? 'DELAYED' : boarding ? 'SCHEDULED' : 'BOARDING';
    if (trip.status === 'BOARDING') boarding = trip.live = true;
  });
  return { errors, home, arrivals, departures };
}

function readHome(home, errors) {
  const unknown = Object.keys(home).find(key => !HOME.includes(key));
  if (unknown) errors.push(`home 里有未知字段 ${unknown}（可用：${HOME.join('、')}）`);
  let timeZone = typeof home.timeZone === 'string' ? home.timeZone : 'America/Chicago';
  try { new Intl.DateTimeFormat('en', { timeZone }); } catch { errors.push(`home.timeZone 看不懂：${timeZone}（例：America/Chicago、Asia/Shanghai）`); timeZone = 'America/Chicago'; }
  const airport = typeof home.airport === 'string' && /^[A-Za-z]{3}$/.test(home.airport.trim()) ? home.airport.trim().toUpperCase() : 'MSN';
  return { city: flapText(home.city ?? 'MADISON') || 'HOME', airport, timeZone };
}

export function stats({ arrivals, departures }, today) {
  const countries = new Set(arrivals.map(trip => trip.country.trim().toLowerCase()));
  const since = arrivals.length ? Math.min(...arrivals.map(trip => trip.date.year)) : null;
  const longest = arrivals.reduce((best, trip) => !best || trip.days > best.days ? trip : best, null);
  const next = departures.find(trip => trip.live) ?? null;
  return {
    flights: arrivals.length, countries: countries.size, since, plans: departures.length,
    daysAway: arrivals.reduce((sum, trip) => sum + trip.days, 0),
    longest: longest ? { days: longest.days, code: longest.code } : null,
    next: next?.date ?? null, nextIn: next && today ? daysUntil(next.date, today) : null,
  };
}
// Whole days from today to a date (a month-only date counts from its first day); never negative.
export function daysUntil(date, today) {
  const at = Date.UTC(date.year, date.month - 1, date.day), now = Date.UTC(today.year, today.month - 1, today.day);
  return Math.max(0, Math.round((at - now) / 864e5));
}
// Passengers: Fred plus whoever travelled with him (names split on 、，, / 和 & +; “独自” means alone).
export function pax(trip) {
  const others = String(trip.with ?? '').split(/[、，,/&+]|和|\s+and\s+/).map(name => name.trim()).filter(name => name && !/^(独自|一个人|alone|solo)$/i.test(name));
  return others.length + 1;
}

// The local wall clock in Fred's city: { year, month, day, time: '14:32' }.
export function localNow(timeZone, now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map(part => [part.type, part.value]));
  return { year: +parts.year, month: +parts.month, day: +parts.day, time: `${parts.hour}:${parts.minute}` };
}

// The flaps a cell passes on its way from one character to another (the last few before the target).
export function flipPath(from, to, steps) {
  const target = CHARSET.indexOf(to), start = CHARSET.indexOf(from);
  if (target < 0 || from === to) return [to];
  const distance = (target - start + CHARSET.length) % CHARSET.length;
  const count = Math.min(steps, distance);
  return Array.from({ length: count }, (_, index) => CHARSET[(target - count + 1 + index + CHARSET.length) % CHARSET.length]);
}
