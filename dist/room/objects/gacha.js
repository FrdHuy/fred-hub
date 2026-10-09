// 扭蛋机 → 扭蛋机。原点在底部中心，出蛋口朝 +z。暖白顶盖和底座夹住灰绿的透明仓（与首页那台同一造型）。
import * as THREE from '../three.js';
import { mat, satin, box, ball, rod, group, contact, rng, pick, tilt } from '../kit.js';

export function build() {
  const shell = mat('#f1ece2', { roughness: .55 }), random = rng(9);
  const machine = group(contact(.95, .9, .42), box(.5, .46, .44, mat('#9a6a45')), box(.54, .03, .48, mat('#7d5237'), 0, .46, 0),   // 小木柜
    box(.46, .5, .42, shell, 0, .49, 0), box(.2, .12, .02, mat('#2c2f33'), -.08, .54, .205), box(.5, .07, .46, shell, 0, 1.46, 0), box(.3, .03, .28, shell, 0, 1.53, 0),
    rod(.07, .03, satin(), .1, .78, .22, 'z', 12), tilt(box(.11, .03, .03, mat('#b34934'), .1, .78, .245), 0, 0, .5),
    rod(.03, .012, mat('#e0b354'), -.12, .88, .212, 'z', 10));
  // 透明仓：薄薄的灰绿亚克力，不投影，里面堆着彩色扭蛋。
  const glass = new THREE.Mesh(new THREE.BoxGeometry(.44, .47, .4), new THREE.MeshStandardMaterial({ color: '#cfe0cf', transparent: true, opacity: .26, roughness: .15, depthWrite: false }));
  glass.position.set(0, 1.225, 0); machine.add(glass);
  const eggs = ['#f1ece2', '#e56b6f', '#f4c95d', '#7fb7e6', '#f2a9b8', '#7bc98f', '#f08a5d', '#c9a0e8'];
  for (let i = 0; i < 26; i++) { const layer = Math.floor(i / 9); machine.add(ball(.055, mat(pick(random, eggs), { roughness: .4 }), -.15 + (i % 3) * .15 + (random() - .5) * .04, 1.05 + layer * .095, -.13 + (Math.floor(i / 3) % 3) * .13 + (random() - .5) * .04, 1)); }
  return machine;
}
