// Usage: node scripts/dev/audit.mjs [output-folder]     (the preview server must be running on 57123)
// Walks every module at a desktop and a phone size with real input: JS errors, broken images, sideways overflow; screenshots.
import { mkdirSync } from 'node:fs';
import { browser } from './cdp.mjs';
const out = process.argv[2] || '/tmp/fred-audit'; mkdirSync(out, { recursive: true });
const report = [];
for (const [tag, W, H] of [['d', 1440, 900], ['m', 390, 844]]) {
  const b = await browser({ width: W, height: H, scale: 1 });
  const hook = () => b.eval(`window.__err=window.__err||[];if(!window.__hooked){window.__hooked=1;addEventListener('error',e=>__err.push(e.message));addEventListener('unhandledrejection',e=>__err.push('rejection: '+(e.reason&&e.reason.message||e.reason)))}`);
  const check = async name => {
    await b.sleep(500);
    const r = await b.eval(`(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1?document.documentElement.scrollWidth:0,broken:[...document.images].filter(i=>i.complete&&!i.naturalWidth&&i.offsetParent).map(i=>i.src.split('/').slice(-2).join('/')),err:(window.__err||[]).splice(0)}))()`);
    await b.shot(`${out}/${tag}-${name}.png`);
    report.push(`${tag} ${name}: ${r.err.length ? 'ERRORS ' + JSON.stringify(r.err) : 'ok'}${r.overflow ? ' | OVERFLOW ' + r.overflow : ''}${r.broken.length ? ' | BROKEN IMG ' + r.broken.join(',') : ''}`);
  };
  const go = async hash => { await b.go('http://localhost:57123/' + hash); await hook(); await b.sleep(1600); };
  const rect = sel => b.eval(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2,r.width,r.height]})()`);
  const tap = async sel => { const r = await rect(sel); if (!r) { report.push(`${tag}   (missing ${sel})`); return false; } await b.click(r[0], r[1]); await b.sleep(900); return true; };
  const circle = async (sel, turns, rad) => { const q = await rect(sel); if (!q) return; const pts = []; for (let i = 0; i <= Math.round(36 * turns); i++) { const a = -Math.PI / 2 + i / 36 * 2 * Math.PI; pts.push([q[0] + Math.cos(a) * q[2] * rad, q[1] + Math.sin(a) * q[2] * rad]); } await b.drag(pts, 12); };
  // home: every object, then the menu
  await go('#/'); await b.sleep(800);
  const count = await b.eval(`document.querySelectorAll('.collection-slot').length`);
  for (let i = 0; i < count; i++) { await check('home-' + (await b.eval(`document.querySelector('.gallery-shell').dataset.object`))); await b.key('ArrowRight'); await b.sleep(900); }
  await tap('.module-menu-toggle'); await check('menu');
  // cinema
  await go('#/collection/cinema'); await b.sleep(1500); await check('cinema');
  await b.eval(`document.querySelectorAll('.cinema-modes button')[1]?.click()`); await b.sleep(1200); await check('cinema-archive');
  await b.eval(`document.querySelector('.cinema-tile')?.click()`); await b.sleep(1200); await check('cinema-archive-detail');
  // travel
  await go('#/collection/travel'); await b.sleep(2600); await check('travel');
  await tap('.tv-row'); await b.sleep(900); await check('travel-pass');
  await b.eval(`document.querySelector('.tv-switch')?.click()`); await b.sleep(2600); await check('travel-departures');
  // stories
  await go('#/collection/stories'); await check('stories');
  await b.eval(`document.querySelector('.nt-sheet:not(.is-locked)')?.click()`); await b.sleep(1300); await check('stories-read');
  // life list
  await go('#/collection/bucketlist'); await b.sleep(1500); await check('list');
  // gacha: a slip and its back, then a game card
  await b.go('http://localhost:57123/#/collection/gacha'); await b.eval(`localStorage.setItem('fred-gacha-mode','0')`); await b.send('Page.reload'); await b.sleep(2200); await hook();
  await check('gacha');
  for (let n = 0; n < 6 && !(await b.eval(`!!document.querySelector('.gcr-slip,.gcr-folded')`)); n++) { if (!(await b.eval(`!!document.querySelector('.gcr-egg')`))) { await circle('.gcr .gc-crank', 1.08, .45); await b.sleep(1300); } await circle('.gcr-egg', .7, .3); await b.sleep(900); }
  await check('gacha-slip');
  if (await b.eval(`!!document.querySelector('.gcr-folded')`)) { await tap('.gcr-folded'); await check('gacha-read'); await tap('.gcr-read .gcr-slip'); await check('gacha-read-back'); await b.click(8, 8); await b.sleep(400); }
  else { await tap('.gcr-slip'); await check('gacha-slip-back'); }
  const sw = await rect('.gcr .gc-switch'); await b.click(sw[0], sw[1] + sw[3] * .25); await b.sleep(300);
  for (let n = 0; n < 5 && !(await b.eval(`!!document.querySelector('.gcr-card')`)); n++) { await circle('.gcr .gc-crank', 1.08, .45); await b.sleep(1300); await circle('.gcr-egg', .7, .3); await b.sleep(900); }
  await check('gacha-card');
  await go('#/collection/nothing-here'); await check('missing');
  b.close();
}
console.log(report.join('\n')); console.log(`\nscreenshots: ${out}`);
