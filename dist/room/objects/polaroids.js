// 拍立得照片墙 → 你们的照片。原点在墙面上，正面朝 +z：两根细绳，夹着一排排相纸。
// 锁着时相纸是空白的；开锁后才显出画面（第 2 步会换成真正的照片）。
import { mat, box, rod, group, rng, pick } from '../kit.js';

export function build() {
  const random = rng(31), wall = group(), prints = [], tones = ['#7fb7e6', '#f08a5d', '#86a85a', '#f4c95d', '#5f7f8a', '#e56b6f', '#c9a0e8', '#34406e', '#f2a9b8'];
  [[.38, 5], [-.08, 4]].forEach(([y, count], row) => {
    const width = 1.5 - row * .2;
    for (let i = 0; i < 12; i++) {                                // 绳子：分成小段，中间垂下去
      const t = (i + .5) / 12, sag = Math.sin(t * Math.PI) * .07;
      const piece = rod(.004, width / 12 + .006, mat('#7d5237'), -width / 2 + t * width, y - sag, .012, 'x', 4); piece.rotation.z += -Math.cos(t * Math.PI) * .15; wall.add(piece);
    }
    for (let i = 0; i < count; i++) {
      const t = (i + .5) / count, x = -width / 2 + t * width, top = y - Math.sin(t * Math.PI) * .07;
      const sky = box(.165, .16, .007, mat(pick(random, tones)), 0, .06, .001), land = box(.165, .05, .008, mat(pick(random, tones)), 0, .06, .001); prints.push(sky, land);
      const photo = group(box(.2, .24, .006, mat('#fdfcf8')), box(.165, .16, .0065, mat('#e9e4da'), 0, .06, .0005), sky, land, box(.025, .05, .014, mat('#d9a05b'), 0, .215, 0));
      photo.position.set(x, top - .25, .014); photo.rotation.z = (random() - .5) * .22; wall.add(photo);
    }
  });
  wall.userData.setUnlocked = data => { for (const print of prints) print.visible = !!data; };
  wall.userData.setUnlocked(null);
  return wall;
}
