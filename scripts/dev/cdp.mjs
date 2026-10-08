// Minimal Chrome DevTools driver for local checks: real mouse / keyboard input into headless Chrome, screenshots.
// Used by scripts/dev/audit.mjs. macOS Chrome only; nothing here is deployed.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
export async function browser({ width = 1440, height = 1000, scale = 1 } = {}) {
  const port = 9400 + Math.floor(Math.random() * 400);
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--window-size=${width},${height}`, `--user-data-dir=${mkdtempSync(tmpdir() + '/cdp-')}`, 'about:blank'], { stdio: 'ignore' });
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let target; for (let i = 0; i < 60 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch {} }
  const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pending = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (pending.has(m.id)) { pending.get(m.id)(m.result ?? m.error); pending.delete(m.id); } };
  const send = (method, params = {}) => new Promise(r => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: false });
  const api = {
    sleep, send,
    go: async url => { await send('Page.navigate', { url }); await sleep(1800); },
    eval: async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.value,
    mouse: (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, pointerType: 'mouse' }),
    async drag(points, stepMs = 16) { await api.mouse('mousePressed', ...points[0]); for (const p of points.slice(1)) { await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p[0], y: p[1], button: 'left', buttons: 1 }); await sleep(stepMs); } await api.mouse('mouseReleased', ...points.at(-1)); },
    click: async (x, y) => { await api.mouse('mousePressed', x, y); await sleep(40); await api.mouse('mouseReleased', x, y); },
    key: async key => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Enter: 13 }[key] }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key }); },
    shot: async file => { const { data } = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(file, Buffer.from(data, 'base64')); },
    close: () => { ws.close(); chrome.kill(); },
  };
  return api;
}
