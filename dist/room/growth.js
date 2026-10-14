// 花园的规则（不依赖 Three.js，scripts/check-room.mjs 直接测这里）。
// 原则：花园靠真实的天数自己长，不操作也不会死；浇水只是锦上添花，带出一段回忆，只记在自己的设备上。
import { dayCount } from './memory.js';

// 两片花圃（有石头围边的翻过的土）。x / z 是范围，每 STEP 米一个坑。别的东西（野花、草丛、落叶）不长进花圃里。
export const STEP = .44;
export const BEDS = [
  { x: [-1.55, .21], z: [5.5, 6.38] },                      // 小径左边，树的旁边：4 × 2
  { x: [4.72, 6.48], z: [2.2, 3.96] },                      // 屋子右前方：4 × 4
];
export const inBed = (x, z, margin = .25) => BEDS.some(b => x > b.x[0] - margin && x < b.x[1] + margin && z > b.z[0] - margin && z < b.z[1] + margin);
// 所有的坑。两片花圃轮流种（一边一株），这样植物少的时候两边都不会空着。
const holes = BEDS.map(b => { const out = []; for (let z = b.z[0] + STEP / 2; z < b.z[1]; z += STEP) for (let x = b.x[0] + STEP / 2; x < b.x[1]; x += STEP) out.push([+x.toFixed(3), +z.toFixed(3)]); return out; });
export const SLOTS = Array.from({ length: Math.max(...holes.map(h => h.length)) }, (_, i) => holes.map(h => h[i]).filter(Boolean)).flat();

// 长到哪一步：只看种下多少天（种下那天算第 1 天）。
export const STAGES = ['mound', 'sprout', 'bud', 'bloom'];
export const stageOf = days => days <= 2 ? 'mound' : days <= 9 ? 'sprout' : days <= 29 ? 'bud' : 'bloom';
export const STAGE_NAME = { mound: '刚种下', sprout: '发芽了', bud: '有花苞了', bloom: '开着花' };
// 满了几年：每满一年长大一圈、多开一朵（最多按 4 年算）。
export const yearsOf = days => Math.max(0, Math.floor((days - 1) / 365));

// 品种：名字里带品种名就用它，否则按名字和日期固定挑一种（同一株永远是同一种花）。
export const SPECIES = { sunflower: '向日葵', tulip: '郁金香', rose: '玫瑰', lavender: '薰衣草', daisy: '雏菊', hydrangea: '绣球' };
const hash = text => { let h = 2166136261; for (const c of text) h = Math.imul(h ^ c.codePointAt(0), 16777619); return h >>> 0; };
export function speciesOf(plant) {
  for (const [key, name] of Object.entries(SPECIES)) if (plant.title.includes(name)) return key;
  return Object.keys(SPECIES)[hash(plant.date + plant.title) % 6];
}

// 花圃里种着什么：纪念日时间线里的每件事自动是一株（那天种下），加上「花园.md」里手动种的；还没到的日子不算。
// 坑不够时：最早的和最新的都留着，中间的均匀地让出位置。
export function plantsFrom(data, today = new Date()) {
  const all = [...(data?.days?.timeline ?? []).map(item => ({ ...item, from: 'day' })), ...(data?.garden ?? []).map(item => ({ ...item, from: 'hand' }))]
    .filter(p => p.date && dayCount(p.date, today) >= 1).sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  const kept = all.length <= SLOTS.length ? all : Array.from({ length: SLOTS.length }, (_, i) => all[Math.round(i * (all.length - 1) / (SLOTS.length - 1))]);
  return kept.map((p, i) => { const days = dayCount(p.date, today); return { ...p, id: `${p.date} ${p.title}`, days, stage: stageOf(days), years: yearsOf(days), species: speciesOf(p), at: SLOTS[i] }; });
}

// 在一起的天数到了这些数，花园里自动多一样东西。
export const MILESTONES = [[100, 'birdhouse', '鸟屋'], [365, 'swing', '秋千'], [520, 'lights', '花圃上的一串灯'], [1000, 'well', '许愿井']];
export const milestonesOf = days => MILESTONES.filter(([at]) => days >= at).map(([, key]) => key);

// 浇水：每株每天一次，记在这台设备上（两个人各记各的，不同步）。不浇没有任何后果。
const WATER = 'fred-cabin-water', stamp = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function watered(today = new Date()) {
  try { const saved = JSON.parse(localStorage.getItem(WATER) ?? 'null'); return saved?.date === stamp(today) ? new Set(saved.ids) : new Set(); } catch { return new Set(); }
}
export function water(id, today = new Date()) {
  const ids = watered(today); ids.add(id);
  try { localStorage.setItem(WATER, JSON.stringify({ date: stamp(today), ids: [...ids] })); } catch {}
  return ids;
}
// 浇水带出的那段回忆：从照片、信里的一段、时间线、去过的地方……里挑一条。同一株同一天挑到的是同一条。
export function recall(data, id, today = new Date()) {
  const pool = [
    ...(data.photos ?? []).map(photo => ({ kind: 'photo', photo })),
    ...(data.letters ?? []).flatMap(letter => letter.paragraphs.map(text => ({ kind: 'letter', text, from: letter.from, date: letter.date }))),
    ...(data.days?.timeline ?? []).map(item => ({ kind: 'line', ...item })),
    ...['places', 'watched', 'wishes', 'things'].flatMap(key => (data[key] ?? []).map(item => ({ kind: 'line', ...item }))),
  ];
  return pool.length ? pool[hash(`${stamp(today)} ${id}`) % pool.length] : null;
}
