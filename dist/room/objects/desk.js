// 书桌 + 台灯 + 打字机 + 椅子 → 手记。原点在桌子中心的地面上，正面朝 +z（背板在 -z）。
import { mat, glow, satin, box, cyl, ball, rod, group, anchor, contact, tilt, quiet } from '../kit.js';

export function build() {
  const wood = mat('#9a6a45'), dark = mat('#7d5237'), cream = mat('#ece5d6'), ink = mat('#3a3d38');
  const desk = group(contact(2.4, 1.3, .4),
    box(2.0, .06, .8, wood, 0, .72, 0),
    ...[[-.93, -.33], [-.93, .33], [.93, -.33], [.93, .33]].map(([x, z]) => box(.07, .72, .07, dark, x, 0, z)),
    box(.5, .46, .7, wood, .68, .26, 0), box(.42, .17, .02, dark, .68, .5, .355), box(.42, .17, .02, dark, .68, .3, .355),
    ball(.022, satin(), .68, .585, .375, 0), ball(.022, satin(), .68, .385, .375, 0),
  );
  // 打字机：暖白机身、深色键盘、滚筒上卷着一张纸，RET 键是砖红的（与首页那台呼应）。
  const typewriter = group(
    box(.44, .1, .36, cream), box(.44, .1, .15, cream, 0, .1, -.1), box(.36, .012, .17, ink, 0, .1, .07),
    ...[0, 1, 2].map(i => box(.32, .012, .028, mat('#55584f'), 0, .113, .02 + i * .045)), box(.05, .02, .03, mat('#b34934'), .19, .11, .11),
    rod(.035, .5, ink, 0, .235, -.1), tilt(box(.26, .3, .004, mat('#fdfcf8'), 0, .22, -.13), -.2, 0, 0),
  );
  typewriter.position.set(-.38, .78, .02);
  // 台灯：灰绿灯罩，灯泡朝下照着稿纸。
  const lamp = quiet(group(cyl(.1, .11, .025, mat('#6f7d6a')), tilt(cyl(.012, .012, .38, satin(), -.06, .02, 0, 6), 0, 0, .32), tilt(cyl(.012, .012, .3, satin(), -.03, .34, 0, 6), 0, 0, -.9),
    tilt(cyl(.06, .14, .15, mat('#8fa088'), .16, .42, 0, 10), 0, 0, -.25), ball(.04, glow('#ffd9a0', 6), .17, .44, 0), anchor('light:desk', .17, .43, 0)));   // 灯自己不投影，否则灯罩会把灯光挡在里面
  lamp.position.set(.2, .78, -.24);
  // 桌上的零碎：一摞书、马克杯、笔筒、几张稿纸。
  const bits = group(box(.26, .035, .19, mat('#c9764f'), -.82, .78, -.2), tilt(box(.24, .03, .18, mat('#5f7f8a'), -.82, .815, -.2), 0, .2, 0), tilt(box(.2, .028, .16, mat('#e0b354'), -.82, .845, -.2), 0, -.15, 0),
    cyl(.04, .035, .08, mat('#f1e5d0'), -.02, .78, .2, 8), cyl(.035, .035, .1, mat('#6f7d6a'), .05, .78, -.28, 6), tilt(cyl(.006, .006, .16, mat('#e0b354'), .05, .84, -.28, 4), 0, 0, .2),
    tilt(box(.21, .003, .28, mat('#fdfcf8'), -.36, .781, .28), 0, .3, 0), tilt(box(.21, .003, .28, mat('#f6f1e4'), -.33, .784, .27), 0, -.12, 0));
  // 椅子：拉开一点，斜放。
  const chair = group(contact(.75, .75, .36), box(.44, .05, .44, wood, 0, .44, 0), box(.44, .46, .04, wood, 0, .6, .2), box(.36, .05, .02, dark, 0, .78, .18),
    ...[[-.19, -.19], [.19, -.19], [-.19, .19], [.19, .19]].map(([x, z]) => box(.045, .44, .045, dark, x, 0, z)), box(.4, .035, .4, mat('#d9a05b'), 0, .49, 0));
  chair.position.set(-.3, 0, .86); chair.rotation.y = .3;
  desk.add(typewriter, lamp, bits, chair);
  return desk;
}
