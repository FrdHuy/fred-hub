// 门垫和垫子下露出一角的钥匙 → 开锁 / 锁门。原点在垫子中心的地面上。
// 锁着时钥匙露在外面、微微发亮；开锁后钥匙被拿走了（index.js 调 userData.setUnlocked）。
import { mat, glow, box, cyl, rod, group, contact } from '../kit.js';

export function build() {
  const brass = glow('#ffcf6a', 1.6, '#c9973a');
  const key = group(rod(.045, .014, brass, 0, 0, 0, 'y', 10), box(.03, .012, .13, brass, 0, -.006, .11), box(.035, .012, .02, brass, .03, -.006, .15), box(.03, .012, .02, brass, .028, -.006, .12));
  key.position.set(.3, .028, .2); key.rotation.y = -.5;
  const doormat = group(contact(1.1, .75, .3, 0, 0, .004), box(.84, .03, .5, mat('#b98a5e', { roughness: 1 })), box(.76, .034, .42, mat('#d9a05b', { roughness: 1 })), box(.5, .038, .2, mat('#c4472a', { roughness: 1 })), key);
  doormat.userData.setUnlocked = data => { key.visible = !data; };
  return doormat;
}
