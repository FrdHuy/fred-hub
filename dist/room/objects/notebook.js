// 长椅上的手账 → 这些天的样子（统计）和花园图鉴。原点在本子底面中心。
import { mat, box, cyl, group, tilt } from '../kit.js';

export function build() {
  return group(box(.24, .012, .32, mat('#8a5a3c')), box(.22, .026, .3, mat('#f6efe2'), .006, .012, 0), box(.24, .01, .32, mat('#8a5a3c'), 0, .038, 0), box(.012, .05, .32, mat('#6f4a32'), -.12, 0, 0),
    box(.02, .002, .12, mat('#b34934'), .04, .048, .2), tilt(cyl(.008, .008, .22, mat('#e0b354'), .17, .02, .02, 6), Math.PI / 2, .3, 0));
}
