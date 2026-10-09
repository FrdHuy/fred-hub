// 剖面：镜头转到哪面墙的外侧，哪面墙就隐去（连同挂在上面的东西），所以可以绕着小屋转一整圈而不被墙挡住。
// 隐去只是把材质淡到透明——墙还在场景里，照样挡太阳，所以屋里的光影不会因为转动镜头而改变。
import { own, fade } from './kit.js';

const NORMAL = { west: [-1, 0], north: [0, -1], east: [1, 0], south: [0, 1] };   // 每面墙朝外的方向（x, z）
const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

// house：scene.js 的 buildHouse()；extras：{ 墙名: [挂在这面墙上的 Object3D] }；placed：按配置摆好的物件（entry.wall 指明挂在哪面墙）。
export function createCutaway(house, extras, placed) {
  const { walls, posts } = house.userData.cutaway, shown = {}, parts = {};
  for (const name of Object.keys(walls)) {
    shown[name] = -1;
    parts[name] = { materials: [own(walls[name]), ...(extras[name] ?? []).map(own)].flat(), objects: placed.filter(o => o.userData.entry.wall === name) };
  }
  const corners = posts.map(post => ({ materials: own(post.part), walls: post.walls, shown: -1 }));
  function update(camera, target) {
    const dx = camera.position.x - target.x, dz = camera.position.z - target.z, length = Math.hypot(dx, dz) || 1;
    for (const name of Object.keys(walls)) {
      const [nx, nz] = NORMAL[name], outside = (dx * nx + dz * nz) / length;       // > 0：镜头在这面墙的外侧
      const k = 1 - smooth(-.04, .16, outside);
      if (Math.abs(k - shown[name]) < .002) continue;
      shown[name] = k; fade(parts[name].materials, k);
      for (const object of parts[name].objects) { fade(object.userData.materials, k); object.userData.hidden = k < .5; }
    }
    for (const corner of corners) {
      const k = Math.min(...corner.walls.map(name => shown[name]));
      if (Math.abs(k - corner.shown) > .002) { corner.shown = k; fade(corner.materials, k); }
    }
  }
  return { update };
}
