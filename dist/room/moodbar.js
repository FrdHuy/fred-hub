// 天气 / 时刻切换：左下角一排简笔小图标（HTML，不在 canvas 里）。选中的那个会记在这台设备上。
const ICONS = {
  golden: '<path d="M2.5 14.5h15M6 14.5a4 4 0 0 1 8 0M10 5.5v2M4.6 8.6 6 10M15.4 8.6 14 10"/>',
  spring: '<circle cx="10" cy="10" r="1.7"/><circle cx="10" cy="5.3" r="2.3"/><circle cx="14.5" cy="8.6" r="2.3"/><circle cx="12.8" cy="13.8" r="2.3"/><circle cx="7.2" cy="13.8" r="2.3"/><circle cx="5.5" cy="8.6" r="2.3"/>',
  summer: '<path d="M12.6 11.9A5.6 5.6 0 0 1 7.3 4.2a5.6 5.6 0 1 0 5.3 7.7z"/><path d="M13.6 4.4h.1M16.4 7.6h.1M15.2 14.6h.1M4.6 16.4h.1"/>',
  autumn: '<path d="M4 16.2C3.6 9.4 8.4 4.2 16 3.8c.4 7.4-4.6 12.6-12 12.4zM4 16.2l6.6-6.8"/>',
  winter: '<path d="M10 2.8v14.4M3.8 6.4l12.4 7.2M16.2 6.4 3.8 13.6M8.2 4.2 10 5.8l1.8-1.6M8.2 15.8 10 14.2l1.8 1.6"/>',
  rain: '<path d="M6.2 11.2a3 3 0 0 1 .4-6 4 4 0 0 1 7.6 1 2.6 2.6 0 0 1-.2 5zM7 13.8l-.9 2.4M10.4 13.8l-.9 2.4M13.8 13.8l-.9 2.4"/>',
};

// moods：lights.js 的 MOODS；current：当前选中的名字；pick(name)：换天气。
export function createMoodbar(host, moods, current, pick) {
  const bar = Object.assign(document.createElement('div'), { className: 'r3-moods' });
  bar.setAttribute('role', 'radiogroup'); bar.setAttribute('aria-label', '天气');
  for (const name of Object.keys(moods)) {
    const button = Object.assign(document.createElement('button'), { type: 'button', innerHTML: `<svg viewBox="0 0 20 20" aria-hidden="true">${ICONS[name] ?? '<circle cx="10" cy="10" r="3"/>'}</svg>` });
    button.dataset.mood = name; button.title = moods[name].label; button.setAttribute('role', 'radio'); button.setAttribute('aria-label', moods[name].label);
    button.addEventListener('click', () => { if (name !== current) { select(name); pick(name); } });
    bar.append(button);
  }
  function select(name) { current = name; for (const button of bar.children) button.setAttribute('aria-checked', String(button.dataset.mood === name)); }
  select(current); host.append(bar);
  return { select, dispose() { bar.remove(); } };
}
