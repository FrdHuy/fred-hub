// Rules for data.js; shared by the page and scripts/check-bucketlist.mjs.
const FIELDS = ['text', 'done', 'year'];

export function parseItems(data) {
  if (!Array.isArray(data)) return { items: [], errors: ['data.js 应导出一个数组：export default [ … ]'] };
  const items = [], errors = [];
  data.forEach((entry, index) => {
    const unknown = entry && typeof entry === 'object' ? Object.keys(entry).find(key => !FIELDS.includes(key)) : null;
    const reason = !entry || typeof entry !== 'object' || Array.isArray(entry) ? '应是 { text: "…" } 形式'
      : unknown ? `未知字段 ${unknown}（可用：text、done、year）`
      : typeof entry.text !== 'string' || !entry.text.trim() ? 'text 必填'
      : 'done' in entry && typeof entry.done !== 'boolean' ? 'done 只能是 true 或 false'
      : 'year' in entry && !(Number.isInteger(entry.year) && entry.year >= 1900 && entry.year <= 2100) ? 'year 应是 1900–2100 的整数'
      : 'year' in entry && entry.done !== true ? 'year 只在 done: true（已完成）时填写' : '';
    if (reason) errors.push(`第 ${index + 1} 条：${reason}`);
    else items.push({ text: entry.text.trim(), done: entry.done === true, ...(entry.year ? { year: entry.year } : {}) });
  });
  return { items, errors };
}

// Old browser-saved entries, written as lines ready to paste into data.js.
export function itemLines(entries) {
  return entries.map(({ text, done }) => `  { text: ${JSON.stringify(text)}, done: ${done} },`).join('\n');
}
