// 来花园的小动物（每天一位，规则在 growth.js 的 visitorOf）。原点在脚下，面朝 +z。
import { mat, box, cyl, ball, group, contact, tilt } from './kit.js';

const BUILD = {
  bird: () => group(contact(.3, .3, .3, 0, 0, .01), ball(.075, mat('#8fb6d9'), 0, .1, 0, 1), ball(.05, mat('#8fb6d9'), 0, .17, .05, 1), ball(.03, mat('#f6efe2'), 0, .09, .055, 0), tilt(cyl(0, .015, .045, mat('#e8a33a'), 0, .17, .11, 4), Math.PI / 2, 0, 0), tilt(box(.05, .012, .09, mat('#5f7f8a'), 0, .11, -.09), .4, 0, 0), cyl(.006, .006, .04, mat('#c97a3a'), .02, 0, 0, 3), cyl(.006, .006, .04, mat('#c97a3a'), -.02, 0, 0, 3)),
  hedgehog: () => {
    const body = ball(.14, mat('#6e5240', { roughness: 1 }), 0, .1, -.02, 0), quills = mat('#4a3628', { roughness: 1 }), h = group(contact(.5, .5, .32, 0, 0, .01), body);
    body.scale.set(1.15, .72, 1.3);
    for (let i = 0; i < 14; i++) { const a = (i % 7) / 6 * Math.PI - Math.PI / 2, row = Math.floor(i / 7), spike = tilt(cyl(0, .028, .11, quills, Math.sin(a) * .11, .13 + row * .03, -.05 - row * .07, 4), -.9 - row * .3, 0, -a * .8); h.add(spike); }       // 背上一排排刺
    h.add(ball(.065, mat('#e9d29a'), 0, .08, .14, 1), ball(.018, mat('#2a2522'), 0, .085, .205, 0), ball(.011, mat('#2a2522'), .032, .112, .17, 0), ball(.011, mat('#2a2522'), -.032, .112, .17, 0));
    return h;
  },
  rabbit: () => { const body = ball(.12, mat('#f4f1ea'), 0, .12, 0, 1); body.scale.set(1, .95, 1.25); return group(contact(.5, .5, .3, 0, 0, .01), body, ball(.08, mat('#f4f1ea'), 0, .23, .1, 1), tilt(box(.035, .16, .02, mat('#f4f1ea'), .03, .28, .08), -.2, 0, -.15), tilt(box(.035, .16, .02, mat('#f4f1ea'), -.03, .28, .08), -.2, 0, .15), ball(.012, mat('#e6a3c4'), 0, .23, .18, 0), ball(.04, mat('#ffffff'), 0, .13, -.15, 0)); },
  cat: () => { const fur = mat('#e39a4e'), body = ball(.13, fur, 0, .14, 0, 1); body.scale.set(.9, 1.15, 1); return group(contact(.5, .5, .32, 0, 0, .01), body, ball(.09, fur, 0, .31, .03, 1), tilt(cyl(0, .03, .07, fur, .045, .38, .03, 4), 0, 0, -.2), tilt(cyl(0, .03, .07, fur, -.045, .38, .03, 4), 0, 0, .2), tilt(box(.03, .03, .2, fur, .06, .03, -.14), 0, .5, 0), ball(.045, mat('#f6e7c1'), 0, .1, .1, 0)); },
};
export const animalModel = kind => (BUILD[kind] ?? BUILD.bird)();
// 待着时的小动作：小鸟和兔子轻轻蹦，刺猬左右晃，猫慢慢起伏。
export function idle(model, kind, time) {
  if (kind === 'bird' || kind === 'rabbit') model.position.y = model.userData.ground + Math.max(0, Math.sin(time * (kind === 'bird' ? 5 : 2.4))) * (kind === 'bird' ? .03 : .06);
  else if (kind === 'hedgehog') model.rotation.y = model.userData.turn + Math.sin(time * 1.3) * .25;
  else model.scale.y = (model.userData.size ?? 1) * (1 + Math.sin(time * 1.6) * .02);
}
