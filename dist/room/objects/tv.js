// 小电视 + 矮柜 + 一摞光盘 → 电影与剧集。原点在柜子底部中心，屏幕朝 +z。
import { mat, satin, box, cyl, rod, group, anchor, contact, paint, picture, rng, pick, tilt } from '../kit.js';

export function build() {
  const wood = mat('#9a6a45'), dark = mat('#7d5237'), random = rng(5);
  const tv = group(contact(1.8, 1.0, .42), box(1.4, .4, .5, wood, 0, .1, 0), ...[[-.62, -.19], [.62, -.19], [-.62, .19], [.62, .19]].map(([x, z]) => cyl(.03, .02, .1, dark, x, 0, z, 6)),
    box(.64, .32, .015, dark, -.34, .14, .25), box(.64, .32, .015, dark, .34, .14, .25), rod(.015, .02, satin(), -.06, .3, .262, 'z', 6), rod(.015, .02, satin(), .06, .3, .262, 'z', 6));
  // 电视画面：一格落日（上下黑边像电影画幅）。
  const frame = paint(256, 192, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#34406e'); g.addColorStop(.5, '#e8846a'); g.addColorStop(.72, '#f6c56f'); g.addColorStop(.73, '#2b3552'); g.addColorStop(1, '#1b2238');
    c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = '#fff1c9'; c.beginPath(); c.arc(w * .62, h * .66, 22, Math.PI, 0); c.fill();
    c.fillStyle = '#141414'; c.fillRect(0, 0, w, 22); c.fillRect(0, h - 22, w, 22);
  });
  const screen = picture(.5, .38, frame, 1.3); screen.position.set(-.25, .79, .243);
  tv.add(box(.74, .56, .5, mat('#d8d0c0', { roughness: .6 }), -.18, .5, -.02), box(.56, .44, .02, mat('#2c2f33'), -.25, .57, .23), screen,
    rod(.025, .02, mat('#3a3d38'), .1, .93, .24, 'z'), rod(.025, .02, mat('#3a3d38'), .1, .83, .24, 'z'), box(.07, .1, .01, mat('#3a3d38'), .1, .6, .232),
    tilt(cyl(.006, .006, .5, satin(), -.3, 1.04, -.1, 4), 0, 0, .5), tilt(cyl(.006, .006, .5, satin(), -.06, 1.04, -.1, 4), 0, 0, -.5), anchor('light:tv', -.25, .8, .7));
  // 柜面右边：一摞 CD 盒，最上面露出半张光盘。
  const colors = ['#e56b6f', '#f4c95d', '#5f7f8a', '#7bc98f', '#c9a0e8', '#f08a5d', '#e9e4d8', '#34406e'];
  for (let i = 0; i < 9; i++) tv.add(tilt(box(.19, .016, .17, mat(pick(random, colors)), .47 + (random() - .5) * .02, .5 + i * .017, .02), 0, (random() - .5) * .3, 0));
  tv.add(cyl(.075, .075, .004, satin('#d9dbd6'), .5, .656, .06, 16), cyl(.012, .012, .006, mat('#3a3d38'), .5, .656, .06, 8));
  // 柜脚边靠墙立着的几张盒子。
  for (let i = 0; i < 5; i++) tv.add(tilt(box(.016, .17, .19, mat(pick(random, colors)), .82 + i * .02, 0, -.1), 0, 0, -.08));
  return tv;
}
