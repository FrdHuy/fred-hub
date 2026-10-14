// Local check with real touch events (not mouse): each home object must follow a finger, and the rail must stay put.
// node scripts/dev/touch-home.mjs  (preview server on 57123)
import { browser } from './cdp.mjs';
const b = await browser({ width: 390, height: 844, scale: 2 }); await b.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }); await b.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
await b.go('http://localhost:57123/#/'); await b.sleep(800);
const mid = sel => b.eval(`(()=>{const r=document.querySelector(${JSON.stringify(sel)})?.getBoundingClientRect();return r?[Math.round(r.left+r.width/2),Math.round(r.top+r.height/2)]:null})()`);
const go = async id => { for (let i = 0; i < 8; i++) { const cur = await b.eval(`document.querySelector('.collection-slot.is-selected').dataset.module`); if (cur === id) return; const order = await b.eval(`[...document.querySelectorAll('.collection-slot')].map(s=>s.dataset.module)`); await b.eval(`document.querySelector('.rail-arrow[data-dir="${order.indexOf(id) > order.indexOf(cur) ? 1 : -1}"]').click()`); await b.sleep(900); } };
for (const [id, sel, probe] of [['travel', '.ticket-paper', null], ['cinema', '.silver-disc', null], ['bucketlist', '.panel', `document.querySelector('.collection-slot.is-selected .panel').getAttribute('style')||getComputedStyle(document.querySelector('.collection-slot.is-selected .panel')).getPropertyValue('--pull')`], ['stories', '.tw', `document.querySelector('.collection-slot.is-selected .tw').getAttribute('style')`]]) {
  await go(id); const full = `.collection-slot.is-selected ${sel}`, a = await mid(full), before = probe ? await b.eval(probe) : null;
  await b.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a[0], y: a[1] }] });
  for (let i = 1; i <= 20; i++) { await b.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: a[0] + i * 2, y: a[1] + i * 4 }] }); await b.sleep(16); }
  const during = await mid(full), after = probe ? await b.eval(probe) : null, rail = await b.eval(`document.querySelector('.collection-slot.is-selected').dataset.module`);
  await b.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await b.sleep(1500);
  console.log(id, '| finger moved +40,+80 | object moved', during[0] - a[0], during[1] - a[1], probe ? `| state ${String(before).slice(0, 40)} → ${String(after).slice(0, 40)}` : '', '| rail still on', rail, '| hash', await b.eval(`location.hash`));
  if (await b.eval(`location.hash`) !== '#/') { await b.eval(`location.hash='#/'`); await b.sleep(1500); }
}
b.close();
