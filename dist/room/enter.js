// 进小屋的第一步（main.js 只认识这个文件）：先看设备，再决定加载 3D 场景还是静态版。
// 这样低端设备和没有 WebGL 的浏览器不会白白下载 Three.js。
import { objects } from './config.js';
import { detect } from './quality.js';
import { mountFlat } from './flat.js';

export async function enterRoom(host, options) {
  const found = detect();
  if (found.webgl) {
    try { const { mountRoom } = await import('./index.js'); return mountRoom(host, { ...options, quality: found }); }
    catch (error) { console.error('room: 3D 场景打不开，改用静态版', error); host.querySelectorAll('.r3-canvas,.r3-label,.r3-veil,.r3-nav').forEach(node => node.remove()); }
  }
  return mountFlat(host, objects);
}
