// Finds the proxy this Mac already uses, so TMDB scripts work without editing .env:
// HTTPS_PROXY in the environment / .env → the macOS system proxy (what Clash & co. set) → a common local proxy port.
import { execFileSync } from 'node:child_process';
import { createConnection } from 'node:net';

export function systemProxy(scutilOutput) {
  const value = key => scutilOutput.match(new RegExp(`\\b${key}\\s*:\\s*(\\S+)`))?.[1];
  if (value('HTTPSEnable') === '1' && value('HTTPSProxy') && value('HTTPSPort')) return `http://${value('HTTPSProxy')}:${value('HTTPSPort')}`;
  if (value('HTTPEnable') === '1' && value('HTTPProxy') && value('HTTPPort')) return `http://${value('HTTPProxy')}:${value('HTTPPort')}`;
  return null;
}
const listening = port => new Promise(resolve => {
  const socket = createConnection({ host: '127.0.0.1', port, timeout: 400 });
  socket.once('connect', () => { socket.destroy(); resolve(true); });
  socket.once('error', () => resolve(false)); socket.once('timeout', () => { socket.destroy(); resolve(false); });
});

export async function detectProxy(env = process.env) {
  const configured = env.HTTPS_PROXY || env.https_proxy || env.HTTP_PROXY || env.http_proxy;
  if (configured) return configured;
  if (process.platform === 'darwin') {
    try { const found = systemProxy(execFileSync('scutil', ['--proxy'], { encoding: 'utf8' })); if (found) return found; } catch {}
  }
  // Clash 7890 / Clash Verge 7897 / V2rayU & ShadowsocksX 1087 / Surge 6152.
  for (const port of [7890, 7897, 1087, 6152]) if (await listening(port)) return `http://127.0.0.1:${port}`;
  return null;
}
