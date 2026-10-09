// 积木工具：所有几何体都由代码生成，这里是各个物件共用的小零件（方块、圆柱、多面体、画布贴图、接触阴影）。
import * as THREE from './three.js';

// 哑光材质，按「颜色 + 选项」缓存，同样的材质全场景只建一份。
const materials = new Map();
export function mat(color, options = {}) {
  const key = color + JSON.stringify(options);
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: .82, metalness: 0, flatShading: true, ...options }));
  return materials.get(key);
}
// 自发光材质（灯泡、屏幕、指示灯）。power > 1 的部分第 3 阶段会被 Bloom 拾取成光晕。
export const glow = (color, power = 2, base = '#1a1410') => mat(base, { emissive: color, emissiveIntensity: power, roughness: .5 });
// 缎面金属（把手、灯杆）；按 DESIGN.md 不做镜面。
export const satin = (color = '#b9b4aa') => mat(color, { roughness: .42, metalness: .55 });

function mesh(geometry, material, x, y, z) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true;
  return m;
}
// 注意：box / cyl 的 y 是「底面」高度，方便把东西直接放在地板或桌面上；ball 的 y 是球心。
export const box = (w, h, d, material, x = 0, y = 0, z = 0) => mesh(new THREE.BoxGeometry(w, h, d), material, x, y + h / 2, z);
export const cyl = (top, bottom, h, material, x = 0, y = 0, z = 0, sides = 10) => mesh(new THREE.CylinderGeometry(top, bottom, h, sides), material, x, y + h / 2, z);
export const ball = (r, material, x = 0, y = 0, z = 0, detail = 1) => mesh(new THREE.IcosahedronGeometry(r, detail), material, x, y, z);

// 横放的细杆（滚筒、旋钮、绳子）：x / y / z 是杆的中心，axis 是它指向的方向。
export function rod(r, length, material, x, y, z, axis = 'x', sides = 8) {
  const m = mesh(new THREE.CylinderGeometry(r, r, length, sides), material, x, y, z);
  if (axis === 'x') m.rotation.z = Math.PI / 2; else if (axis === 'z') m.rotation.x = Math.PI / 2;
  return m;
}

export function group(...children) { const g = new THREE.Group(), list = children.flat(); if (list.length) g.add(...list); return g; }
export const tilt = (object, x = 0, y = 0, z = 0) => { object.rotation.set(x, y, z); return object; };
export const quiet = object => { object.traverse(o => { o.castShadow = false; }); return object; };

// 灯位：物件只留一个带名字的空节点（如 light:desk），真正的灯由 lights.js 按当前时刻统一安装。
export function anchor(name, x, y, z) { const o = new THREE.Object3D(); o.name = name; o.position.set(x, y, z); return o; }

// 用 2D 画布现画一张贴图（海报、屏幕、灯板），不依赖任何图片文件。
export function paint(width, height, draw) {
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  return texture;
}
// 一张朝 +z 的画面。light > 0 时画面自己发光（屏幕、灯板）。
export function picture(w, h, texture, light = 0) {
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: .7, ...(light ? { emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: light } : {}) });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material); m.receiveShadow = true;
  return m;
}

// 接触阴影：物件脚下一片柔和的暗角（代替昂贵的 SSAO），让东西「坐」在地上。
let blob;
export function contact(w, d, strength = .42, x = 0, z = 0, y = .008) {
  blob ??= paint(64, 64, (c, s) => { const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(.55, 'rgba(0,0,0,.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, s, s); });
  const material = new THREE.MeshBasicMaterial({ map: blob, color: '#2a1608', transparent: true, opacity: strength, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 2;
  m.raycast = () => {};                                    // 阴影贴片比物件大一圈，不能算作「指到了物件」
  return m;
}

// 材质默认是全场景共用的。需要单独变化的东西（悬停发亮的物件、会隐去的墙）先调用 own() 换成自己的一份，
// 返回这些材质；每份材质上记着原始的不透明度和发光强度（userData.base）。
export function own(object) {
  const copies = new Map();
  object.traverse(o => {
    if (!o.isMesh) return;
    if (!copies.has(o.material)) {
      const copy = o.material.clone();
      copy.userData.base = { opacity: copy.opacity, transparent: copy.transparent, depthWrite: copy.depthWrite, glow: copy.emissive?.getHex() ? copy.emissiveIntensity : 0 };
      copies.set(o.material, copy);
    }
    o.material = copies.get(o.material);
  });
  return [...copies.values()];
}
// 把一组 own() 过的材质淡到 k（1 = 原样，0 = 看不见）。只改不透明度：物体仍在场景里，所以照样投影。
export function fade(materials, k) {
  for (const m of materials) { const base = m.userData.base; m.opacity = base.opacity * k; m.transparent = base.transparent || k < 1; m.depthWrite = base.depthWrite && k > .5; }
}

// 固定种子的随机数：花、书、冰箱贴每次打开都在同一个位置。
export function rng(seed) {
  return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const pick = (random, list) => list[Math.floor(random() * list.length)];
