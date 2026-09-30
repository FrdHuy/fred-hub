// 今日签: the date (Gregorian, lunar, the day's stems and branches), a slip for the chosen sign, the almanac's 宜 / 忌.
// Step 3 fills in the real almanac rules and the verified 观音灵签 texts; until then the slip itself is marked 示意.
import { ZODIAC } from './machine.js?v=42';

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

// Placeholder slips (示意). Step 3 replaces this list with the 100 verified 观音灵签.
const SLIPS = [
  { no: 1, rank: '上上', poem: ['开天辟地作良缘', '吉日良时万物全', '若得此签非小可', '人行忠正帝王宣'], jie: '事事顺遂，守正则吉' },
];
const ALMANAC = { yi: ['祭祀', '祈福', '出行'], ji: ['动土'] };   // 示意

export function todaySlip(date, sign) {
  const slip = SLIPS[slipIndex(date, sign, SLIPS.length)], moon = lunar(date);
  return {
    ...slip, noText: cnNumber(slip.no), placeholder: true, sign, signName: SIGN_NAMES[sign], glyph: SIGN_GLYPHS[sign], key: ZODIAC[sign],
    head: [`${cnYear(date.y)}年${cnNumber(date.m)}月${cnNumber(date.d)}日`, moon ? `${moon.year}年${moon.month}${moon.day}` : '', `${dayGanzhi(date)}日`].filter(Boolean).join(' · '),
    yi: ALMANAC.yi, ji: ALMANAC.ji,
  };
}
export const today = (now = new Date()) => ({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() });
