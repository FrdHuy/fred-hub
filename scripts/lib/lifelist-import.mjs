// Turns the Markdown checklist (docs/人生清单候选-200.md) into data.js entries. Only sections (## …) count; the intro and <!-- comments --> are skipped.
//   - [x] 做过的事 2019   → { text, done: true, year: 2019 }   (year optional)
//   - [ ] 想做的事        → { text, done: false }
//   Under a heading containing「大事件」:  - 1998 出生  → { text, milestone: true, year: 1998 }
// Order: dated milestones and fulfilled wishes by year (a timeline), then undated fulfilled wishes, then wishes.
export function parseChecklist(markdown) {
  const entries = [], problems = [];
  let events = false, started = false;
  // Comments (the examples) keep their line breaks so reported line numbers stay right.
  const text = markdown.replace(/<!--[\s\S]*?-->/g, block => block.replace(/[^\n]/g, ''));
  text.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (line.startsWith('## ')) { started = true; events = line.includes('大事件'); return; }
    if (!started || !line.startsWith('- ') || (!events && !line.startsWith('- ['))) return;
    if (events) {
      const m = line.match(/^- (\d{4})\s+(.+)$/);
      if (m) entries.push({ text: m[2].trim(), milestone: true, year: +m[1] });
      else problems.push(`第 ${i + 1} 行：大事件要写成「- 年份 事件」`);
      return;
    }
    const m = line.match(/^- \[( |x|X)\]\s+(.+?)(?:\s+(\d{4}))?$/);
    if (!m) { problems.push(`第 ${i + 1} 行：看不懂「${line}」`); return; }
    const done = m[1] !== ' ', year = m[3] ? +m[3] : undefined;
    if (year && !done) { problems.push(`第 ${i + 1} 行：写了年份但没打勾`); return; }
    entries.push(done ? { text: m[2].trim(), done: true, ...(year ? { year } : {}) } : { text: m[2].trim(), done: false });
  });
  const dated = entries.filter(e => e.year).sort((a, b) => a.year - b.year);
  const undated = entries.filter(e => e.done && !e.year), wishes = entries.filter(e => !e.done && !e.milestone);
  return { entries: [...dated, ...undated, ...wishes], problems };
}

export function dataSource(entries) {
  const line = e => `  { ${Object.entries(e).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')} },`;
  return `// Fred 的人生清单（最多 100 件，对应面板上的 100 盏灯）。由 node scripts/import-lifelist.mjs 从 docs/人生清单候选-200.md 生成，也可以直接改。
// 愿望：{ text: "去看一次极光", done: false }，做到了改成 done: true，可加 year（选填）。
// 人生大事件（冷白色灯）：{ text: "大学毕业", milestone: true, year: 2020 }
// 顺序即灯的顺序：大事件和做到的事按年份在前，拨动年份时灯会从左到右依次亮起。
// 改完运行 node scripts/check-bucketlist.mjs 检查格式。
export default [
${entries.map(line).join('\n')}
];
`;
}
