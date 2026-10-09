// 冰箱（贴满冰箱贴和明信片）→ 旅行。原点在冰箱底部中心，门朝 +z。
import { mat, satin, box, cyl, ball, rod, group, contact, rng, pick, tilt } from '../kit.js';

export function build() {
  const shell = mat('#dfe8dc', { roughness: .5 }), random = rng(11), front = .365;
  const fridge = group(contact(1.2, 1.15, .45), box(.78, 1.72, .7, shell, 0, .05, 0), box(.7, .05, .6, mat('#5d5a54'), 0, 0, 0),
    box(.76, .012, .012, mat('#9aa69a'), 0, 1.24, front - .01), box(.035, .3, .04, satin(), -.3, 1.32, front + .02), box(.035, .5, .04, satin(), -.3, .66, front + .02),
    box(.14, .05, .01, mat('#b34934'), .25, 1.66, front));
  // 明信片：白边 + 一块风景色；冰箱贴：各种颜色的小方块、小圆片。
  const sky = ['#7fb7e6', '#f08a5d', '#f4c95d', '#7bc98f', '#c9a0e8', '#e56b6f', '#5f7f8a'];
  for (const [x, y, w, h, r] of [[.06, 1.48, .2, .15, .08], [.2, .98, .17, .23, -.1], [-.12, .82, .22, .16, .05], [.14, .52, .18, .14, -.06], [-.1, .4, .14, .19, .12]]) {
    const card = group(box(w, h, .004, mat('#fdfcf8')), box(w - .03, h * .62, .005, mat(pick(random, sky)), 0, h * .3, .001), box(w - .03, h * .2, .006, mat(pick(random, ['#86a85a', '#e9e4d8', '#5f7f8a'])), 0, h * .3, .001), ball(.016, mat(pick(random, sky)), 0, h - .015, .012, 0));
    card.position.set(x, y, front); card.rotation.z = r; fridge.add(card);
  }
  for (let i = 0; i < 16; i++) {
    const x = -.2 + random() * .5, y = .25 + random() * 1.4, round = random() > .5, color = mat(pick(random, sky));
    const magnet = round ? rod(.022, .012, color, x, y, front + .004, 'z') : tilt(box(.04, .035, .012, color, x, y, front + .004), 0, 0, random() - .5);
    fridge.add(magnet);
  }
  // 冰箱顶上：一只小地球仪和一只旧皮箱。
  fridge.add(box(.5, .2, .34, mat('#b98a5e'), .08, 1.77, -.05), box(.52, .03, .36, mat('#7d5237'), .08, 1.84, -.05), box(.1, .03, .02, mat('#7d5237'), .08, 1.9, .13),
    cyl(.07, .09, .03, mat('#7d5237'), -.2, 1.97, .08, 8), ball(.12, mat('#6fa3c7'), -.2, 2.14, .08, 1), ball(.07, mat('#86a85a'), -.16, 2.18, .13, 0), ball(.05, mat('#86a85a'), -.25, 2.1, .14, 0));
  return fridge;
}
