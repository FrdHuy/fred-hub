import { panelCover } from './modules/bucketlist/cover.js?v=31';

export const categories = ['全部', '记忆', '文化', '工具'];

// A new module belongs here; the home page has no fixed number of slots.
export const modules = [
  { id: 'cinema', title: '电影与剧集', category: '文化', label: 'CINEMA', cover: 'disc', description: '看过的世界，留下的余韵。', emptyTitle: '片单还是空白的', emptyText: '以后看完一部电影或剧集，就在这里留下一点感受。', section: '观影记录', theme: 'dark' },
  { id: 'travel', title: '旅行足迹', category: '记忆', label: 'MEMORY', cover: 'ticket', description: '去过的地方，遇见的风景。', emptyTitle: '下一段旅程，从这里开始', emptyText: '这里会慢慢收下旅途中的照片、地点和故事。', section: '旅行收藏', theme: 'dark' },
  { id: 'stories', title: '故事与日记', category: '记忆', label: 'STORIES', cover: 'notebook', description: '一些片段，值得慢慢记住。', emptyTitle: '留一页，给想记下的事', emptyText: '日常的心情、很久以前的故事，都可以在这里安放。', section: '故事收藏' },
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
  if (item.id === 'travel') cover.innerHTML = `<div class="ticket-paper"><div class="ticket-airline">FRED AIR <span>BOARDING PASS</span></div><div class="ticket-route">HERE <span>✈</span> THERE</div><div class="ticket-fields"><span>PASSENGER<b>FRED</b></span><span>FLIGHT<b>FH 001</b></span><span>SEAT<b>01 A</b></span></div><div class="ticket-barcode"></div><small>A TICKET TO MY MEMORIES</small></div>`;
  if (item.id === 'cinema') cover.innerHTML = '<div class="silver-disc"><span>FRED’S COLLECTION<b>.</b></span><small>PICTURES & STORIES · VOL. 01</small></div>';
  if (item.id === 'stories') cover.innerHTML = '<div class="diary-leaves"><span>DEAR DIARY</span><p>把日子，<br>慢慢写下来。</p><small>FRED’S HUB / 01</small></div><div class="diary-front"></div>';
  if (item.id === 'bucketlist') cover.innerHTML = panelCover();
  cover.dataset.title = item.title;
  cover.setAttribute('role', 'img');
  cover.setAttribute('aria-label', `${item.title}的收藏物件封面`);
  return cover;
}
