// docs/旅行行程-填写.md → the object exported by dist/modules/travel/data.js.
const KEYS = { 目的地: 'to', 三字码: 'code', 国家: 'country', 出发: 'from', 日期: 'date', 天数: 'days', 同行: 'with', 一句话: 'line', 照片: 'photo' };
const HOME = { 城市: 'city', 机场: 'airport', 时区: 'timeZone' };
const clean = value => value.replace(/[（(][^）)]*[）)]\s*$/, '').trim(); // drop a trailing "（选填）"-style note

export function parseTravelForm(markdown) {
  const text = markdown.replace(/<!--[\s\S]*?-->/g, '');
  const data = { home: {}, arrivals: [], departures: [] }, problems = [];
  let list = null, entry = null, skip = false;
  const close = () => { if (entry && !skip && Object.keys(entry.fields).length) data[list].push(entry); entry = null; };
  text.split('\n').forEach((raw, index) => {
    const line = raw.trim(), at = `第 ${index + 1} 行`;
    if (/^###(\s|$)/.test(line)) { close(); skip = /^###\s*例/.test(line); if (list === 'arrivals' || list === 'departures') entry = { at, fields: {} }; return; }
    if (line.startsWith('## ')) { close(); list = line.includes('去过') ? 'arrivals' : line.includes('想去') ? 'departures' : line.includes('基本') ? 'home' : null; return; }
    const field = /^-\s*([^：:]+?)(?:（[^）]*）)?\s*[：:]\s*(.*)$/.exec(line);
    if (!field) return;
    const [, label, rawValue] = field, value = clean(rawValue);
    if (list === 'home') { const key = Object.entries(HOME).find(([word]) => label.includes(word))?.[1]; if (key && value) data.home[key] = value; return; }
    if (!entry || skip || !value) return;
    const key = KEYS[label.trim()];
    if (!key) { problems.push(`${at}：看不懂「${label.trim()}」（可用：${Object.keys(KEYS).join('、')}）`); return; }
    entry.fields[key] = key === 'days' ? (/^\d+$/.test(value) ? Number(value) : value) : value;
  });
  close();
  for (const name of ['arrivals', 'departures']) data[name] = data[name].map(item => item.fields);
  return { data, problems };
}

export function dataSource(data) {
  const row = entry => `    ${JSON.stringify(entry).replace(/"(\w+)":/g, '$1: ').replace(/,(?=\w+: )/g, ', ')},`;
  return `// Fred 的旅行翻牌屏。由 node scripts/import-travel.mjs 从 docs/旅行行程-填写.md 生成——改那份表，再运行一次命令。
export default {
  home: ${JSON.stringify(data.home).replace(/"(\w+)":/g, '$1: ').replace(/,(?=\w+: )/g, ', ')},
  arrivals: [
${data.arrivals.map(row).join('\n')}
  ],
  departures: [
${data.departures.map(row).join('\n')}
  ],
};
`;
}
