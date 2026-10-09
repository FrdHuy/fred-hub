// 百灯板 → 人生清单。挂在墙上：原点在板子背面中心，正面朝 +z。10 × 10 盏小灯，亮着的是做到了的事。
import { mat, satin, box, cyl, ball, rod, group, paint, picture, rng, tilt } from '../kit.js';

export function build() {
  const random = rng(66);
  const lamps = paint(256, 256, (c, w) => {
    c.fillStyle = '#e9e4d8'; c.fillRect(0, 0, w, w);
    for (let row = 0; row < 10; row++) for (let col = 0; col < 10; col++) {
      const x = 26 + col * 22.6, y = 26 + row * 22.6, lit = random() < .32, cold = lit && random() < .14;
      c.fillStyle = lit ? (cold ? '#f4f7ff' : '#ffb347') : '#b9b2a2'; c.beginPath(); c.arc(x, y, lit ? 6.5 : 5.5, 0, 7); c.fill();
    }
  });
  // 发光贴图里米色底也会微微发亮，所以亮度给得很低，只让亮着的灯显出来。
  const face = picture(.74, .74, lamps, .55); face.position.set(0, .04, .062);
  return group(box(.9, .98, .06, mat('#f1ece2', { roughness: .55 }), 0, -.49, .03), face,
    box(.3, .05, .012, mat('#2f332f'), -.22, -.44, .061), rod(.02, .02, satin(), .3, -.4, .07, 'z'), tilt(cyl(.008, .012, .09, satin(), .3, -.4, .1, 6), .9, 0, 0), ball(.018, mat('#b34934'), .3, -.33, .15, 0));
}
