// Usage: node scripts/preload.mjs
// Writes <link rel="modulepreload"> for everything the home page imports into dist/index.html (between the two markers),
// so the browser fetches all of it in one round instead of discovering the import chain level by level.
// Run after adding / removing an import or bumping ?v= (check.mjs fails when the list is out of date).
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../dist/', import.meta.url), START = '<!-- preload:start -->', END = '<!-- preload:end -->';
// Loaded on the home page with import(): the cover of the Life List and the disc's count need them at once.
const EXTRA = ['./modules/cinema/data.js', './modules/bucketlist/data.js'];
export function preloadList() {
  const html = readFileSync(new URL('index.html', root), 'utf8');
  const entry = html.match(/<script type="module" src="([^"]+)"/)[1], version = entry.match(/\?v=\d+/)?.[0] ?? '';
  const seen = new Set(), order = [];
  const walk = spec => {
    const url = new URL(spec, 'file:///'), key = url.pathname + url.search; if (seen.has(key)) return; seen.add(key);
    const source = readFileSync(new URL('.' + url.pathname, root), 'utf8');
    for (const [, dep] of source.matchAll(/(?:^|[\n;])\s*(?:import|export)\s[^'"\n;]*?from\s*['"]([^'"]+)['"]|(?:^|[\n;])\s*import\s*['"]([^'"]+)['"]/g).map(m => [m[0], m[1] ?? m[2]])) walk(new URL(dep, url).pathname + new URL(dep, url).search);
    order.push('.' + key);
  };
  walk('/' + entry.replace(/^\.\//, ''));
  for (const extra of EXTRA) order.push(extra + version);
  return order.filter(href => !href.startsWith(entry));
}
export function preloadBlock() { return `${START}${preloadList().map(href => `<link rel="modulepreload" href="${href}">`).join('')}${END}`; }
export function currentBlock() { const html = readFileSync(new URL('index.html', root), 'utf8'), a = html.indexOf(START), b = html.indexOf(END); return a < 0 || b < 0 ? null : html.slice(a, b + END.length); }

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const file = new URL('index.html', root); let html = readFileSync(file, 'utf8');
  const block = preloadBlock(), old = currentBlock();
  html = old ? html.replace(old, block) : html.replace('  <script type="module"', `  ${block}\n  <script type="module"`);
  writeFileSync(file, html);
  console.log(`✓ index.html 预加载 ${preloadList().length} 个模块`);
}
