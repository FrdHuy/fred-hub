// 今日签: the date (Gregorian, lunar, the day's stems and branches), a slip for the chosen sign, the almanac's 宜 / 忌.
// Step 3 fills in the real almanac rules and the verified 观音灵签 texts; until then the slip itself is marked 示意.
import { ZODIAC } from './machine.js?v=53';

const GAN = '甲乙丙丁戊己庚辛壬癸', ZHI = '子丑寅卯辰巳午未申酉戌亥';
const CN = '〇一二三四五六七八九';
export const SIGN_NAMES = ['白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手', '摩羯', '水瓶', '双鱼'];
export const SIGN_GLYPHS = [...'♈♉♊♋♌♍♎♏♐♑♒♓'].map(g => g + '︎');

// Days since 1970-01-01 for a local calendar date (no time zone drift).
const dayNumber = ({ y, m, d }) => Math.floor(Date.UTC(y, m - 1, d) / 864e5);
// The day's stem and branch: 2000-01-07 was 甲子.
export function dayGanzhi(date) { const i = ((dayNumber(date) - dayNumber({ y: 2000, m: 1, d: 7 })) % 60 + 60) % 60; return GAN[i % 10] + ZHI[i % 12]; }
export const cnNumber = n => n === 100 ? '一百' : n <= 10 ? (n === 10 ? '十' : CN[n]) : n < 20 ? '十' + CN[n % 10] : CN[Math.floor(n / 10)] + '十' + (n % 10 ? CN[n % 10] : '');
const cnDay = n => n <= 10 ? '初' + cnNumber(n) : n === 20 ? '二十' : n === 30 ? '三十' : cnNumber(n);
export const cnYear = y => [...String(y)].map(c => CN[+c]).join('');

// The lunar date from the browser's Chinese calendar (Intl); null where it is not available.
export function lunar(date) {
  try {
    const parts = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).formatToParts(new Date(Date.UTC(date.y, date.m - 1, date.d)));
    const get = type => parts.find(p => p.type === type)?.value ?? '';
    return { year: get('yearName'), month: get('month'), day: cnDay(Number(get('day'))) };
  } catch { return null; }
}

// Same day + same sign → the same slip, always. A small stable hash picks it.
export function slipIndex(date, sign, count) { let h = 2166136261; for (const c of `${date.y}-${date.m}-${date.d}:${sign}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h % count; }

import LINGQIAN from './lingqian.js?v=53';
import { almanac } from './almanac.js?v=53';
import { horoscope, ASPECTS } from './horoscope.js?v=53';
export { ASPECTS };
// Same day + same sign → the same one of the hundred slips.
export function todaySlip(date, sign) {
  const slip = LINGQIAN[slipIndex(date, sign, LINGQIAN.length)], moon = lunar(date), day = almanac(date);
  return {
    ...slip, rankText: `${slip.rank}签`, sign, signName: SIGN_NAMES[sign], glyph: SIGN_GLYPHS[sign], key: ZODIAC[sign],
    head: [`${cnYear(date.y)}年${cnNumber(date.m)}月${cnNumber(date.d)}日`, moon ? `${moon.year}年${moon.month}${moon.day}` : '', `${day.ganzhi}日`].filter(Boolean).join(' · '),
    yi: day.yi, ji: day.ji,
  };
}
// The back of the slip: the slip's traditional reading, today's almanac, and the sign's five fortunes.
export function reading(date, sign) {
  const slip = todaySlip(date, sign), day = almanac(date);
  return {
    rank: slip.rankText, name: slip.name, meaning: slip.meaning, jie: slip.jie.filter(l => !l.endsWith('：')), xianji: slip.xianji,
    officer: `${day.officer}日`, yi: day.yi, ji: day.ji, clash: day.clash, sign: slip.signName, glyph: slip.glyph,
    fortunes: horoscope(date, sign),
  };
}
export const today = (now = new Date()) => ({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });
