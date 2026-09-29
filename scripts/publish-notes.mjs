// Usage: node scripts/publish-notes.mjs
// notes/*.md (+ photos next to them) → dist/modules/stories/data.js and dist/modules/stories/media/.
// Photos are resized to 1600px on the long edge with macOS `sips` (copied as-is elsewhere). Notes with a 暗号 are sealed.
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, rmSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { extname } from 'node:path';
import { parseNote, renderMarkdown, dataSource } from './lib/notes-publish.mjs';
import { seal } from '../dist/modules/stories/seal.js';

const root = new URL('../', import.meta.url), notesDir = new URL('notes/', root), mediaDir = new URL('dist/modules/stories/media/', root);
const fail = message => { console.error(`\n✗ ${message}\n`); process.exit(1); };
if (!existsSync(notesDir)) fail('还没有 notes/ 文件夹。');
mkdirSync(mediaDir, { recursive: true });

const files = readdirSync(notesDir).filter(name => name.endsWith('.md') && !name.startsWith('_') && name.toLowerCase() !== 'readme.md').sort();
const problems = [], entries = [], used = new Set();
let sips = true; try { execFileSync('which', ['sips'], { stdio: 'ignore' }); } catch { sips = false; }

// Each photo gets a name from its content, so a private note's photos can't be guessed from its title.
function publishImage(src, file) {
  const from = new URL(src, notesDir);
  if (!existsSync(from)) { problems.push(`${file}：找不到照片 ${src}（放在 notes/ 里，和文章同一处）`); return ''; }
  const ext = extname(src).toLowerCase() === '.png' ? '.png' : '.jpg';
  const name = createHash('sha256').update(readFileSync(from)).update('1600').digest('hex').slice(0, 16) + ext;
  const to = new URL(name, mediaDir); used.add(name);
  if (!existsSync(to)) {
    if (sips) execFileSync('sips', ['-Z', '1600', ...(ext === '.jpg' ? ['-s', 'format', 'jpeg', '-s', 'formatOptions', '84'] : []), from.pathname, '--out', to.pathname], { stdio: 'ignore' });
    else copyFileSync(from, to);
  }
  return `modules/stories/media/${name}`;
}

for (const file of files) {
  const note = parseNote(readFileSync(new URL(file, notesDir), 'utf8'), file);
  if (note.problems.length) { problems.push(...note.problems); continue; }
  const { meta } = note, id = file.replace(/\.md$/, '');
  const rendered = renderMarkdown(note.body, src => publishImage(src, file));
  const entry = { id, title: meta.title, date: meta.date, type: meta.type, minutes: rendered.minutes };
  for (const key of ['place', 'trip', 'milestone']) if (meta[key]) entry[key] = meta[key];
  if (meta.password) entry.locked = await seal({ html: rendered.html, excerpt: rendered.excerpt }, meta.password);
  else Object.assign(entry, { excerpt: rendered.excerpt, html: rendered.html });
  entries.push(entry);
}
if (problems.length) fail(`有 ${problems.length} 处需要改：\n  ${problems.join('\n  ')}`);
// Photos no longer used by any note are removed.
for (const name of readdirSync(mediaDir)) if (!used.has(name) && statSync(new URL(name, mediaDir)).isFile()) rmSync(new URL(name, mediaDir));
entries.sort((a, b) => b.date.localeCompare(a.date));
writeFileSync(new URL('dist/modules/stories/data.js', root), dataSource(entries));
const locked = entries.filter(e => e.locked).length;
console.log(`\n✓ 已发布 ${entries.length} 篇（其中 ${locked} 篇需要暗号）· 照片 ${used.size} 张${sips ? '' : '（没有 sips，照片未压缩）'}`);
console.log('  刷新预览页面就能看到。\n');
