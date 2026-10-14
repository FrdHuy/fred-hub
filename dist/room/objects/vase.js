// 矮桌上的花瓶 → 你们互相送的花。原点在瓶底。
// 开锁后，瓶里插着最近送的几束（颜色就是那株花的颜色）；还没人送过时只插一枝小草。
import { mat, cyl, ball, group, tilt } from '../kit.js';

export function build() {
  const flowers = group();
  const vase = group(cyl(.045, .055, .13, mat('#9fc2c8', { roughness: .3 })), cyl(.03, .045, .04, mat('#9fc2c8', { roughness: .3 }), 0, .13, 0), flowers);
  vase.userData.setUnlocked = data => {
    for (const old of [...flowers.children]) flowers.remove(old);
    const recent = (data?.bouquets ?? []).slice(0, 3);
    if (!recent.length) { flowers.add(tilt(cyl(.005, .007, .2, mat('#6f9a4a'), 0, .14, 0, 4), 0, 0, .15), ball(.025, mat('#95bd60'), -.02, .34, 0, 0)); return; }
    recent.forEach((bouquet, i) => {
      const a = i * 2.1, lean = .22;
      for (let k = 0; k < 3; k++) {
        const b = a + k * .5, stem = tilt(cyl(.005, .007, .22 + k * .02, mat('#5f9a48'), Math.cos(b) * .015, .14, Math.sin(b) * .015, 4), Math.sin(b) * lean, 0, -Math.cos(b) * lean);
        const head = ball(.034, mat(bouquet.color), Math.cos(b) * .06, .36 + k * .02, Math.sin(b) * .06, 0);
        flowers.add(stem, head);
      }
    });
  };
  vase.userData.setUnlocked(null);
  return vase;
}
