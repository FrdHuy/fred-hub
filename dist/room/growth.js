// 花园的规则（不依赖 Three.js，scripts/check-room.mjs 直接测这里）。
// 原则：不会死、不赶时间——植物只看天数往前长，不操作也照样开；照顾（浇水）让它长快一点、攒「心意」。
//
//   纪念花圃  纪念日时间线里的每件事自动是一株（那天种下），永远开着，不参与养成。
//   养成花圃  你们俩亲手种的花：用种子种、浇水、开花后剪一束送给对方。花圃随花园等级一块块解锁。
//   心意      每人每天给每株浇一次水 +1；两个人同一天浇了同一株，再 +1。
//   花园等级  经验 = 心意 + 每条回忆 3 + 每在一起 10 天 1；升到 n 级要 10·n·(n−1)（2 级 20、3 级 60、4 级 120……）。
//   种子      开局 3 颗，每升一级 +1，每攒 15 心意 +1，来访的小动物有时也送一颗；种一株用掉一颗。
//   图鉴      种过、开过花的品种和颜色。两个人同一天浇同一株满 3 次的花，有机会开出稀有色；有三种花只在对应的季节能种。
//   小动物    每天来一位（按花园等级解锁：小鸟 → 刺猬 → 兔子 → 猫），两个人看到的是同一位；有的日子它带着一颗种子。
import { dayCount } from './memory.js';

// ── 花圃和坑 ─────────────────────────────────────────────────────────────────
export const STEP = .44;
export const BEDS = [
  { id: 'memorial', level: 0, x: [-1.55, .21], z: [5.5, 6.38] },          // 树旁边，小径左边：纪念花圃 4 × 2
  { id: 'g1', level: 1, x: [4.72, 6.48], z: [2.2, 3.96] },                // 屋子右前方：4 × 4
  { id: 'g2', level: 3, x: [2.85, 4.17], z: [5.42, 6.74] },               // 小径右边，靠栅栏：3 × 3
  { id: 'g3', level: 8, x: [-5.15, -3.83], z: [.35, 2.55] },              // 西墙外：3 × 5
];
// 花圃（不管解没解锁）里不长野花、草丛、落叶。
export const inBed = (x, z, margin = .25) => BEDS.some(b => x > b.x[0] - margin && x < b.x[1] + margin && z > b.z[0] - margin && z < b.z[1] + margin);
export const holesOf = bed => { const out = []; for (let z = bed.z[0] + STEP / 2; z < bed.z[1]; z += STEP) for (let x = bed.x[0] + STEP / 2; x < bed.x[1]; x += STEP) out.push([+x.toFixed(3), +z.toFixed(3)]); return out; };
const bedOf = id => BEDS.find(b => b.id === id);

// ── 生长 ─────────────────────────────────────────────────────────────────────
export const STAGES = ['mound', 'sprout', 'bud', 'bloom'];
export const STAGE_NAME = { mound: '刚种下', sprout: '发芽了', bud: '有花苞了', bloom: '开着花' };
// 纪念花：按真实的天数慢慢开（种下那天算第 1 天）。
export const stageOf = days => days <= 2 ? 'mound' : days <= 9 ? 'sprout' : days <= 29 ? 'bud' : 'bloom';
// 亲手种的花快一些：成长天数 = 种下的天数 + 每个被浇过水的日子多算半天。不浇大约 10 天开，天天浇一周就开。
export const grownStage = grown => grown < 2 ? 'mound' : grown < 5 ? 'sprout' : grown < 10 ? 'bud' : 'bloom';
export const REBLOOM = 10;                                  // 剪下一束之后，回到花苞，10 天后再开
export const yearsOf = days => Math.max(0, Math.floor((days - 1) / 365));

export const SPECIES = { daisy: '雏菊', tulip: '郁金香', sunflower: '向日葵', rose: '玫瑰', lavender: '薰衣草', hydrangea: '绣球', primrose: '樱草', cosmos: '波斯菊', hellebore: '圣诞玫瑰' };
const CLASSIC = ['daisy', 'tulip', 'sunflower', 'rose', 'lavender', 'hydrangea'];          // 纪念花只从这六种里挑
// 季节限定：只在这几个月（按访客本地的日期）能种；种下以后一直在。
export const SEASONAL = { primrose: { months: [3, 4, 5], season: '春' }, cosmos: { months: [9, 10, 11], season: '秋' }, hellebore: { months: [12, 1, 2], season: '冬' } };
const hash = text => { let h = 2166136261; for (const c of text) h = Math.imul(h ^ c.codePointAt(0), 16777619); return h >>> 0; };
export function speciesOf(plant) {
  if (plant.species && SPECIES[plant.species]) return plant.species;
  for (const [key, name] of Object.entries(SPECIES)) if (plant.title.includes(name)) return key;
  return CLASSIC[hash(plant.date + plant.title) % CLASSIC.length];
}
// 花的颜色：同一株永远同一种颜色（花瓶里的那束也用它）。
export const PALETTE = { sunflower: ['#f6c12e'], tulip: ['#e5484d', '#f2a3bd', '#f6c945', '#fdf6ec', '#b98bd9'], rose: ['#d1343f', '#e6657a', '#f1b2c0'], lavender: ['#b49be0'], daisy: ['#fffaf0'], hydrangea: ['#8fb2e6', '#e6a3c4', '#b7a4e6'], primrose: ['#f6d74a', '#f2a3bd'], cosmos: ['#f08fb4', '#fdf6ec', '#c2416b'], hellebore: ['#f4f1e6', '#d9a3b6'] };
// 稀有色：每种花一种。
export const RARE = { sunflower: '#c8462e', tulip: '#2f2a5e', rose: '#4f8fd8', lavender: '#fdf6ec', daisy: '#f6b6cd', hydrangea: '#f4f1e6', primrose: '#7a4fc4', cosmos: '#e8a33a', hellebore: '#4a6b3c' };
export const bloomColor = (species, id, rare = false) => { if (rare && RARE[species]) return RARE[species]; const list = PALETTE[species] ?? ['#f2a3bd']; return list[hash(id) % list.length]; };
// 稀有：两个人一起浇过 3 次以上的那些里，大约三株有一株。
export const isRare = p => (p.together ?? 0) >= 3 && hash(`${p.id} rare`) % 3 === 0;

// 纪念花圃：时间线里已经到了的日子；坑不够时最早的和最新的都留着，中间均匀让位。
export function memorialPlants(data, today = new Date()) {
  const holes = holesOf(bedOf('memorial'));
  const all = (data?.days?.timeline ?? []).filter(p => p.date && dayCount(p.date, today) >= 1).sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  const kept = all.length <= holes.length ? all : Array.from({ length: holes.length }, (_, i) => all[Math.round(i * (all.length - 1) / (holes.length - 1))]);
  return kept.map((p, i) => { const days = dayCount(p.date, today), species = speciesOf(p), id = `memorial ${p.id ?? p.date + p.title}`; return { ...p, id, memorial: true, days, stage: stageOf(days), years: yearsOf(days), species, color: bloomColor(species, id), at: holes[i] }; });
}
// 养成花圃里的坑（已解锁的），按顺序。
export const gardenHoles = level => BEDS.filter(b => b.id !== 'memorial' && level >= b.level).flatMap(b => holesOf(b).map((at, i) => ({ slot: `${b.id}:${i}`, at })));
// 养成花圃里的花：每株记着种在哪个坑（slot）；从文件导入、没有 slot 的，按顺序补进空坑。
export function gardenPlants(data, today = new Date()) {
  const holes = gardenHoles(levelOf(data, today)), taken = new Set(), out = [];
  const plants = (data?.garden ?? []).filter(p => p.date && dayCount(p.date, today) >= 1);
  for (const p of plants) if (p.slot && holes.some(h => h.slot === p.slot)) taken.add(p.slot);
  for (const p of plants) {
    let slot = p.slot && holes.some(h => h.slot === p.slot) ? p.slot : null;
    if (!slot) { slot = holes.find(h => !taken.has(h.slot))?.slot; if (!slot) continue; taken.add(slot); }
    const days = dayCount(p.date, today), grown = days + (p.cared ?? 0) / 2, sinceCut = p.cut ? dayCount(p.cut, today) - 1 : Infinity;
    const stage = sinceCut < REBLOOM ? 'bud' : grownStage(grown), species = speciesOf(p), id = p.id ?? `${p.date} ${p.title}`;
    const rare = isRare({ ...p, id });
    out.push({ ...p, id, days, grown, stage, years: yearsOf(days), species, rare, color: bloomColor(species, id, rare), slot, at: holes.find(h => h.slot === slot).at, rebloomIn: sinceCut < REBLOOM ? REBLOOM - sinceCut : 0 });
  }
  return out;
}

// ── 心意、等级、种子、解锁 ────────────────────────────────────────────────────
const MEMORY_LISTS = ['letters', 'places', 'watched', 'wishes', 'things', 'photos'];
export const heartOf = data => Object.values(data?.totals ?? {}).reduce((sum, n) => sum + n, 0);     // 每人浇的次数 + 一起浇的次数
export const memoryCount = data => MEMORY_LISTS.reduce((sum, key) => sum + (data?.[key]?.length ?? 0), 0) + (data?.days?.timeline?.length ?? 0);
export const xpOf = (data, today = new Date()) => heartOf(data) + memoryCount(data) * 3 + (data?.days?.since ? Math.floor(Math.max(0, dayCount(data.days.since, today)) / 10) : 0);
export const needFor = level => 10 * level * (level - 1);
export function levelOf(data, today = new Date()) { const xp = xpOf(data, today); let level = 1; while (needFor(level + 1) <= xp) level++; return level; }
// 每一级解锁的东西（花种、花圃、装饰）。
export const UNLOCKS = [
  [1, 'species', ['daisy', 'tulip', 'sunflower'], '雏菊、郁金香、向日葵'],
  [2, 'species', ['rose'], '玫瑰'],
  [3, 'bed', 'g2', '一块新花圃'],
  [4, 'decor', 'birdbath', '鸟浴盆'],
  [5, 'species', ['lavender', 'hydrangea'], '薰衣草、绣球'],
  [6, 'decor', 'pond', '小池塘'],
  [7, 'decor', 'greenhouse', '温室'],
  [8, 'bed', 'g3', '西墙外的花圃'],
];
export const speciesFor = (level, today = new Date()) => [...UNLOCKS.filter(([at, kind]) => kind === 'species' && level >= at).flatMap(([, , list]) => list), ...Object.entries(SEASONAL).filter(([, s]) => s.months.includes(today.getMonth() + 1)).map(([key]) => key)];
export const decorFor = level => UNLOCKS.filter(([at, kind]) => kind === 'decor' && level >= at).map(([, , key]) => key);
export const bedsFor = level => BEDS.filter(b => level >= b.level);
export const nextUnlock = level => UNLOCKS.find(([at]) => at > level) ?? null;
export function seedsOf(data, today = new Date()) {
  const level = levelOf(data, today), earned = 3 + (level - 1) + Math.floor(heartOf(data) / 15) + (data?.gifts ?? 0);
  return Math.max(0, earned - (data?.garden?.length ?? 0));
}
// 花园的样子一眼看完：等级、经验、离下一级、种子、下一样解锁的东西、还有几个空坑。
export function progressOf(data, today = new Date()) {
  const level = levelOf(data, today), xp = xpOf(data, today);
  return { level, xp, from: needFor(level), to: needFor(level + 1), heart: heartOf(data), seeds: seedsOf(data, today), next: nextUnlock(level), free: gardenHoles(level).length - gardenPlants(data, today).length };
}

// 在一起的天数到了这些数，花园里自动多一样东西。
export const MILESTONES = [[100, 'birdhouse', '鸟屋'], [365, 'swing', '秋千'], [520, 'lights', '花圃上的一串灯'], [1000, 'well', '许愿井']];
export const milestonesOf = days => MILESTONES.filter(([at]) => days >= at).map(([, key]) => key);

// ── 改状态（给 memory.change 用：拿到一份拷贝，返回改好的那份）────────────────
export const stamp = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const wateredBy = (data, id, today = new Date()) => Object.entries(data?.water?.[stamp(today)] ?? {}).filter(([, ids]) => ids.includes(id)).map(([name]) => name);
export const wateredToday = (data, today = new Date()) => new Set(Object.values(data?.water?.[stamp(today)] ?? {}).flat());
// 浇水：每人每株每天一次。养成花圃里的花，当天第一次有人浇时「被照顾的日子」+1（长得快一点）。只留 90 天明细。
export function water(state, id, who, today = new Date()) {
  const day = stamp(today), log = state.water ??= {}, mine = (log[day] ??= {})[who] ??= [];
  if (mine.includes(id)) return state;
  const others = Object.entries(log[day]).filter(([name, ids]) => name !== who && ids.includes(id));
  mine.push(id);
  const totals = state.totals ??= {}; totals[who] = (totals[who] ?? 0) + 1; if (others.length) totals.together = (totals.together ?? 0) + 1;
  const grown = (state.garden ?? []).find(p => p.id === id); if (grown && !others.length) grown.cared = (grown.cared ?? 0) + 1;
  if (grown && others.length) grown.together = (grown.together ?? 0) + 1;                      // 两个人同一天都浇了：稀有色看这个
  const cut = stamp(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 90)); for (const old of Object.keys(log)) if (old < cut) delete log[old];
  return state;
}
// 种一株：用一颗种子，种进第一个空坑。没种子、没空坑、品种还没解锁时返回 null（什么都不改）。
export function plant(state, { species, title }, who, today = new Date()) {
  if (!speciesFor(levelOf(state, today), today).includes(species) || seedsOf(state, today) < 1) return null;
  const taken = new Set(gardenPlants(state, today).map(p => p.slot)), hole = gardenHoles(levelOf(state, today)).find(h => !taken.has(h.slot));
  if (!hole) return null;
  (state.garden ??= []).push({ id: [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, '0')).join(''), date: stamp(today), title, species, slot: hole.slot, by: who, at: Date.now() });
  return state;
}
// 剪一束送给对方：只有开着的花能剪；剪完回到花苞，REBLOOM 天后再开。花束放进屋里的花瓶，对方下次来会看到。
export function cut(state, id, who, to, note, today = new Date()) {
  const shown = gardenPlants(state, today).find(p => p.id === id), stored = (state.garden ?? []).find(p => p.id === id);
  if (!shown || !stored || shown.stage !== 'bloom') return null;
  stored.cut = stamp(today);
  (state.bouquets ??= []).unshift({ id: `${id}-${stamp(today)}`, from: who, to, species: shown.species, color: shown.color, flower: shown.title, note, date: stamp(today), seen: false });
  return state;
}
// ── 图鉴：每种花的每种颜色（加一种稀有色），开过花（或剪过）的就算见过 ─────────────
export function catalogOf(data, today = new Date()) {
  const seen = new Set();
  for (const p of gardenPlants(data, today)) if (p.stage === 'bloom' || p.cut) seen.add(`${p.species} ${p.color}`);
  for (const b of data?.bouquets ?? []) seen.add(`${b.species} ${b.color}`);
  const entries = Object.keys(SPECIES).map(species => ({ species, name: SPECIES[species], season: SEASONAL[species]?.season ?? '', colors: [...PALETTE[species].map(color => ({ color, rare: false })), { color: RARE[species], rare: true }].map(c => ({ ...c, seen: seen.has(`${species} ${c.color}`) })) }));
  const all = entries.flatMap(e => e.colors);
  return { entries, seen: all.filter(c => c.seen).length, total: all.length };
}

// ── 小动物：今天来的是谁、在哪、带没带种子（两个人看到的都一样）───────────────
export const ANIMALS = [[1, 'bird', '小鸟'], [3, 'hedgehog', '刺猬'], [5, 'rabbit', '兔子'], [7, 'cat', '猫']];
const SPOTS = [[3.0, 4.0], [1.95, 4.45], [-.55, 4.6], [5.55, 1.45], [2.45, 6.35], [-3.2, 3.85], [6.3, 5.6]];
export function visitorOf(data, today = new Date()) {
  const day = stamp(today), kinds = ANIMALS.filter(([at]) => levelOf(data, today) >= at), [, kind, name] = kinds[hash(`${day} who`) % kinds.length];
  return { kind, name, day, at: SPOTS[hash(`${day} where`) % SPOTS.length], gift: hash(`${day} gift`) % 2 === 0, claimedBy: data?.giftDays?.[day] ?? '' };
}
// 收下小动物带来的种子：每天一颗，谁先收下算谁的。
export function claimGift(state, who, today = new Date()) {
  const visitor = visitorOf(state, today);
  if (!visitor.gift || visitor.claimedBy) return null;
  (state.giftDays ??= {})[visitor.day] = who; state.gifts = (state.gifts ?? 0) + 1;
  return state;
}

// ── 手账：这些天的样子 ──────────────────────────────────────────────────────
export function journalOf(data, today = new Date()) {
  const lastSeen = {};
  for (const [day, byName] of Object.entries(data?.water ?? {})) for (const [name, ids] of Object.entries(byName)) if (ids.length && (!lastSeen[name] || day > lastSeen[name])) lastSeen[name] = day;
  const totals = data?.totals ?? {};
  return {
    days: data?.days?.since ? dayCount(data.days.since, today) : 0, level: levelOf(data, today),
    watered: Object.fromEntries((data?.people ?? []).map(name => [name, totals[name] ?? 0])), together: totals.together ?? 0,
    planted: data?.garden?.length ?? 0, given: data?.bouquets?.length ?? 0, gifts: data?.gifts ?? 0,
    catalog: catalogOf(data, today), lastSeen,
  };
}

// 收到的、还没看过的花束。
export const unseenFor = (data, who) => (data?.bouquets ?? []).filter(b => b.to === who && !b.seen);
export function markSeen(state, who) { for (const b of state.bouquets ?? []) if (b.to === who) b.seen = true; return state; }

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
