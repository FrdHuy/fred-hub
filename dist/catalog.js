import { panelCover } from './modules/bucketlist/cover.js?v=46';
import travelData from './modules/travel/data.js?v=46';
import { parseTravel, localNow, flight } from './modules/travel/trips.js?v=46';
import notesData from './modules/stories/data.js?v=46';
import { sortNotes } from './modules/stories/notes.js?v=46';
import { typewriterMarkup } from './modules/stories/typewriter.js?v=46';
import { machineMarkup } from './modules/gacha/machine.js?v=46';

// The boarding pass on the home page carries the next planned flight, or else the latest trip.
function nextFlight() {
  try {
    const board = parseTravel(travelData, localNow(travelData?.home?.timeZone || 'America/Chicago'));
    const trip = board.departures.find(t => t.live) ?? board.arrivals[0];
    return trip ? { from: trip.from, to: trip.code, number: flight(trip.number) } : null;
  } catch { return null; }
}

// The typewriter's blank sheet: the latest note anyone may read is typed onto it when RETURN is pressed.
function latestNote() {
  const note = sortNotes(Array.isArray(notesData) ? notesData : []).find(n => !n.locked);
  // A blank sheet; pressing RETURN types this title onto it (typewriter-home.js).
  return { ink: note ? note.title : 'Fred' };
}

export const categories = ['全部', '记忆', '文化', '工具'];

// A new module belongs here; the home page has no fixed number of slots.
export const modules = [
  { id: 'cinema', title: '电影与剧集', category: '文化', label: 'CINEMA', cover: 'disc', description: '看过的世界，留下的余韵。', emptyTitle: '片单还是空白的', emptyText: '以后看完一部电影或剧集，就在这里留下一点感受。', section: '观影记录', theme: 'dark' },
  { id: 'travel', title: '旅行足迹', category: '记忆', label: 'MEMORY', cover: 'ticket', description: '去过的地方，遇见的风景。', emptyTitle: '下一段旅程，从这里开始', emptyText: '这里会慢慢收下旅途中的照片、地点和故事。', section: '旅行收藏', theme: 'dark' },
  { id: 'stories', title: '手记', category: '记忆', label: 'NOTES', cover: 'typewriter', description: '游记、阶段感想，和一些值得慢慢写下来的事。', emptyTitle: '桌上还没有稿子', emptyText: '写好一篇，放进 notes/ 再发布。', section: '手记' },
  { id: 'gacha', title: '扭蛋机', category: '工具', label: 'GACHA', cover: 'gacha', description: '今日签，和朋友一起的真心话大冒险。', emptyTitle: '扭蛋机', emptyText: '转一圈扭把。', section: '扭蛋机' },
  { id: 'bucketlist', title: '人生清单', category: '记忆', label: 'SOMEDAY', cover: 'list', description: '想做的事，一件一件来。', emptyTitle: '这辈子想做什么？', emptyText: '不赶时间，一件一件来。', section: '人生清单' },
];

export function getModule(id) { return modules.find(item => item.id === id); }
export function searchModules(query) {
  const term = query.trim().toLocaleLowerCase();
  return modules.filter(item => [item.title, item.category, item.label, item.description].join(' ').toLocaleLowerCase().includes(term));
}
export function createCover(item) {
  const cover = document.createElement('div');
  cover.className = `collectible collectible--${item.cover}`;
  if (item.id === 'travel') { const next = nextFlight(); cover.innerHTML = `<div class="ticket-paper"><div class="ticket-airline">FRED AIR <span>BOARDING PASS</span></div><div class="ticket-route">${next?.from ?? 'HERE'} <span>✈</span> ${next?.to ?? 'THERE'}</div><div class="ticket-fields"><span>PASSENGER<b>FRED</b></span><span>FLIGHT<b>${next?.number ?? 'FH 001'}</b></span><span>SEAT<b>01 A</b></span></div><div class="ticket-barcode"></div><small>A TICKET TO MY MEMORIES</small></div>`; }
  if (item.id === 'cinema') cover.innerHTML = '<div class="silver-disc"><span>FRED’S COLLECTION<b>.</b></span><small>PICTURES & STORIES · VOL. 01</small></div>';
  if (item.id === 'stories') cover.innerHTML = typewriterMarkup(latestNote());
  if (item.id === 'bucketlist') cover.innerHTML = panelCover();
  // A fresh pile on every visit: the odd varieties and, rarely, the lamp egg land somewhere different each time.
  if (item.id === 'gacha') cover.innerHTML = machineMarkup({ seed: Date.now() % 1e9 });
  cover.dataset.title = item.title;
  cover.setAttribute('role', 'img');
  cover.setAttribute('aria-label', `${item.title}的收藏物件封面`);
  return cover;
}
