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

// The other way round: trips → the fill-in form (so the recorder and hand edits share one source).
const LABELS = [['to', '目的地'], ['code', '三字码'], ['country', '国家'], ['from', '出发'], ['date', '日期'], ['days', '天数'], ['with', '同行'], ['line', '一句话'], ['photo', '照片']];
export function formSource(data) {
  const block = trip => `### \n${LABELS.filter(([key]) => trip[key] !== undefined && trip[key] !== '').map(([key, label]) => `- ${label}：${trip[key]}`).join('\n')}\n`;
  return `# 旅行行程

用录入工具最方便：\`node scripts/travel-recorder.mjs\`。也可以直接改这份表，再运行 \`node scripts/import-travel.mjs\`。
照片放在 \`dist/modules/travel/photos/\`，「照片」后面写文件名。

## 基本信息
- 城市：${data.home?.city ?? 'Madison'}
- 机场：${data.home?.airport ?? 'MSN'}
- 时区（不懂就别改）：${data.home?.timeZone ?? 'America/Chicago'}

## 去过的地方
<!-- 一趟一段。目的地用英文，最多 12 个字母。日期可以只写到月：2024-10 -->

${(data.arrivals ?? []).map(block).join('\n')}
## 想去的地方
<!-- 定了日子就写日期（最近的一趟显示 BOARDING）；没定就空着（显示 SOMEDAY）。 -->

${(data.departures ?? []).map(block).join('\n')}`;
}
