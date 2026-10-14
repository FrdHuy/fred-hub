// 改回忆的规则（不依赖页面，scripts/check-room.mjs 直接测）：每一条都有自己的 id，按 id 改、按 id 删，
// 所以两个人同时在改别的条目也不会改错。每条记下最后是谁改的（by）和什么时候（at）。
export const LISTS = ['letters', 'timeline', 'places', 'watched', 'wishes', 'things', 'photos', 'garden'];
const newId = () => [...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, '0')).join('');

// 某一类回忆的那一列（没有就建一列空的）。时间线在 days 里面。
export function listOf(state, name) {
  if (name === 'timeline') { state.days ??= {}; return state.days.timeline ??= []; }
  return state[name] ??= [];
}
// 每一列怎么排：信和照片新的在前；时间线和花园旧的在前；其余有日期的新的在前，没日期的按加入的顺序排在后面。
const ORDER = { letters: -1, photos: -1, timeline: 1, garden: 1 };
function arrange(name, list) {
  const way = ORDER[name] ?? -1;
  list.sort((a, b) => (!a.date && !b.date) ? 0 : !a.date ? 1 : !b.date ? -1 : way * a.date.localeCompare(b.date));
}
// 给还没有 id 的条目补上（从文件导入的旧内容）。返回补了几条。
export function stampIds(state) {
  let added = 0;
  for (const name of LISTS) for (const item of listOf(state, name)) if (!item.id) { item.id = newId(); added++; }
  return added;
}
// 新增或修改一条：item 有 id 且找得到就替换，否则加进去。返回改好的状态。
export function upsert(state, name, item, who) {
  const list = listOf(state, name), at = list.findIndex(other => other.id && other.id === item.id), next = { ...item, id: item.id || newId(), by: who, at: Date.now() };
  if (at >= 0) list[at] = next; else list.push(next);
  arrange(name, list);
  return state;
}
export function remove(state, name, id) {
  const list = listOf(state, name), at = list.findIndex(item => item.id === id);
  if (at >= 0) list.splice(at, 1);
  return state;
}
// 信的正文：空一行分段。
export const toParagraphs = text => text.replace(/\r/g, '').split(/\n\s*\n/).map(p => p.trim().replace(/\n/g, '')).filter(Boolean);
