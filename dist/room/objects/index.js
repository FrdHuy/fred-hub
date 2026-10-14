// 物件注册表：config.js 里的 object 名字 → 造型函数。加一种新造型：写一个 objects/<名字>.js（导出 build()），在这里登记。
import { own } from '../kit.js';
import { build as desk } from './desk.js';
import { build as fridge } from './fridge.js';
import { build as tv } from './tv.js';
import { build as calendar } from './calendar.js';
import { build as doormat } from './doormat.js';
import { build as polaroids } from './polaroids.js';
import { build as poster } from './poster.js';

export const builders = { desk, fridge, tv, calendar, polaroids, poster, doormat };

// 按配置把物件摆进场景。每个物件组上记着自己的配置（userData.entry），悬停 / 点击靠它认物件（interact.js）。
export function placeObjects(scene, entries) {
  const placed = [];
  for (const entry of entries) {
    const build = builders[entry.object];
    if (!build) { console.warn(`room: 没有叫 ${entry.object} 的物件造型`); continue; }
    const object = build(entry);
    object.position.set(...entry.at); object.rotation.y = (entry.turn || 0) * Math.PI / 180;
    object.userData.entry = entry; object.name = `object:${entry.object}`;
    object.userData.materials = own(object);                     // 自己的一份材质：悬停时单独发亮、随墙隐去
    scene.add(object); placed.push(object);
  }
  return placed;
}
