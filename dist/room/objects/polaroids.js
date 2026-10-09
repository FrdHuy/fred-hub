// 拍立得照片墙 → 摄影（模块未建，config 里标 soon）。原点在墙面上，正面朝 +z：两根细绳，夹着一排排照片。
import { mat, box, rod, group, rng, pick } from '../kit.js';

export function build() {
  const random = rng(31), wall = group(), tones = ['#7fb7e6', '#f08a5d', '#86a85a', '#f4c95d', '#5f7f8a', '#e56b6f', '#c9a0e8', '#34406e', '#f2a9b8'];
  [[.38, 5], [-.08, 4]].forEach(([y, count], row) => {
    const width = 1.5 - row * .2;
    for (let i = 0; i < 12; i++) {                                // 绳子：分成小段，中间垂下去
      const t = (i + .5) / 12, sag = Math.sin(t * Math.PI) * .07;
      const piece = rod(.004, width / 12 + .006, mat('#7d5237'), -width / 2 + t * width, y - sag, .012, 'x', 4); piece.rotation.z += -Math.cos(t * Math.PI) * .15; wall.add(piece);
    }
    for (let i = 0; i < count; i++) {
      const t = (i + .5) / count, x = -width / 2 + t * width, top = y - Math.sin(t * Math.PI) * .07;
      const photo = group(box(.2, .24, .006, mat('#fdfcf8')), box(.165, .16, .007, mat(pick(random, tones)), 0, .06, .001), box(.165, .05, .008, mat(pick(random, tones)), 0, .06, .001), box(.025, .05, .014, mat('#d9a05b'), 0, .215, 0));
      photo.position.set(x, top - .25, .014); photo.rotation.z = (random() - .5) * .22; wall.add(photo);
    }
  });
  return wall;
}
