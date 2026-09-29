// notes/*.md → entries for dist/modules/stories/data.js. Pure functions; the script does the files.
import { TYPE_WORDS, DATE_PATTERN, minutes } from '../../dist/modules/stories/notes.js';

const FIELDS = { title: 'title', 标题: 'title', date: 'date', 日期: 'date', type: 'type', 类型: 'type', place: 'place', 地点: 'place', trip: 'trip', 旅行: 'trip', milestone: 'milestone', 大事件: 'milestone', password: 'password', 暗号: 'password' };
const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const IMAGE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;

// Header between two --- lines: `key: value`, English or Chinese keys.
export function parseNote(source, file) {
  const problems = [], meta = {};
  const match = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/.exec(source.replace(/\r\n/g, '\n'));
  if (!match) return { problems: [`${file}：开头要有 --- 包起来的信息（标题、日期、类型）`] };
  for (const line of match[1].split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const field = /^\s*([^:：]+?)\s*[:：]\s*(.*)$/.exec(line);
    const key = field && FIELDS[field[1].trim().toLowerCase()] || field && FIELDS[field[1].trim()];
    if (!key) { problems.push(`${file}：看不懂「${line.trim()}」（可用：标题、日期、类型、地点、旅行、大事件、暗号）`); continue; }
    if (field[2].trim()) meta[key] = field[2].trim();
  }
  if (!meta.title) problems.push(`${file}：缺少「标题」`);
  if (!DATE_PATTERN.test(meta.date ?? '') || Number.isNaN(Date.parse(meta.date))) problems.push(`${file}：「日期」写成 2024-10-12`);
  const type = TYPE_WORDS[(meta.type ?? '').toLowerCase()] ?? TYPE_WORDS[meta.type ?? ''];
  if (!type) problems.push(`${file}：「类型」只能是 游记 / 阶段 / 随笔 / 短记`);
  if (meta.trip && !/^[A-Za-z]{3}$/.test(meta.trip)) problems.push(`${file}：「旅行」写那一趟的机场三字码，如 KEF`);
  return { problems, meta: { ...meta, type, trip: meta.trip?.toUpperCase() }, body: match[2] };
}

function inline(text) {
  return escape(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(((?:https?:\/\/|#)[^)\s]+)\)/g, (_, label, href) => `<a href="${href}"${href.startsWith('#') ? '' : ' target="_blank" rel="noopener"'}>${label}</a>`);
}
// Lines of one paragraph join without a space between Chinese characters, with one between words.
const join = lines => lines.map(line => line.trim()).reduce((text, line) => !text ? line : /[㐀-鿿＀-￯。，、；：？！」』）]$/.test(text) || /^[㐀-鿿＀-￯]/.test(line) ? text + line : `${text} ${line}`, '');

// A small Markdown: ## / ### headings, paragraphs, > quotes, - lists, --- rules, **bold**, *italic*, [links](…),
// and image lines. Consecutive image lines become one row of photos. `image(src)` returns the published path.
export function renderMarkdown(body, image) {
  const blocks = [], lines = body.replace(/\r\n/g, '\n').split('\n');
  let paragraph = [], quote = [], list = [], photos = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: 'p', text: join(paragraph) });
    if (quote.length) blocks.push({ kind: 'quote', text: join(quote) });
    if (list.length) blocks.push({ kind: 'list', items: list });
    if (photos.length) blocks.push({ kind: 'photos', items: photos });
    paragraph = []; quote = []; list = []; photos = [];
  };
  for (const raw of lines) {
    const line = raw.trim(), picture = IMAGE.exec(line);
    if (!line) { flush(); continue; }
    if (picture) { if (!photos.length) flush(); photos.push({ alt: picture[1], src: picture[2] }); continue; }
    if (photos.length) flush();
    if (/^#{2,3}\s/.test(line)) { flush(); blocks.push({ kind: line.startsWith('###') ? 'h3' : 'h2', text: line.replace(/^#+\s*/, '') }); continue; }
    if (/^(-{3,}|\*{3,})$/.test(line)) { flush(); blocks.push({ kind: 'hr' }); continue; }
    if (line.startsWith('>')) { if (paragraph.length || list.length) flush(); quote.push(line.replace(/^>\s?/, '')); continue; }
    if (/^[-*]\s+/.test(line)) { if (paragraph.length || quote.length) flush(); list.push(line.replace(/^[-*]\s+/, '')); continue; }
    if (quote.length || list.length) flush();
    paragraph.push(line);
  }
  flush();
  const html = blocks.map(block => {
    if (block.kind === 'p') return `<p>${inline(block.text)}</p>`;
    if (block.kind === 'h2' || block.kind === 'h3') return `<${block.kind}>${inline(block.text)}</${block.kind}>`;
    if (block.kind === 'quote') return `<blockquote>${inline(block.text)}</blockquote>`;
    if (block.kind === 'list') return `<ul>${block.items.map(item => `<li>${inline(item)}</li>`).join('')}</ul>`;
    if (block.kind === 'hr') return '<hr>';
    return `<div class="nt-photos" data-n="${Math.min(block.items.length, 3)}">${block.items.map(({ alt, src }) => `<figure><img src="${escape(image(src))}" alt="${escape(alt)}" loading="lazy">${alt ? `<figcaption>${escape(alt)}</figcaption>` : ''}</figure>`).join('')}</div>`;
  }).join('\n');
  const text = blocks.filter(b => b.kind === 'p' || b.kind === 'quote' || b.kind === 'list').map(b => b.text ?? b.items.join(' ')).join(' ').replace(/\*\*|\*|\[([^\]]+)\]\([^)]*\)/g, '$1');
  const first = blocks.find(b => b.kind === 'p')?.text.replace(/\*\*|\*/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') ?? '';
  return { html, excerpt: first.length > 90 ? `${first.slice(0, 88)}……` : first, minutes: minutes(text), images: blocks.filter(b => b.kind === 'photos').flatMap(b => b.items.map(i => i.src)) };
}

export function dataSource(entries) {
  return `// Fred 的手记。由 node scripts/publish-notes.mjs 从 notes/ 生成——不要手改，改 notes/ 里的文章再发布一次。
export default ${JSON.stringify(entries, null, 1)};
`;
}
