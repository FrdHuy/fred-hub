// 雪山海报 → 运动 / 雪山计划（模块未建，config 里标 soon）。原点在墙面上，正面朝 +z。
import { mat, box, group, paint, picture } from '../kit.js';

export function build() {
  const art = paint(256, 336, (c, w, h) => {
    const sky = c.createLinearGradient(0, 0, 0, h * .7); sky.addColorStop(0, '#3d5a8c'); sky.addColorStop(.6, '#9fb6d8'); sky.addColorStop(1, '#f6d7b8');
    c.fillStyle = sky; c.fillRect(0, 0, w, h); c.fillStyle = '#fff3d6'; c.beginPath(); c.arc(w * .76, h * .2, 16, 0, 7); c.fill();
    const peak = (points, color) => { c.fillStyle = color; c.beginPath(); points.forEach(([x, y], i) => c[i ? 'lineTo' : 'moveTo'](x * w, y * h)); c.fill(); };
    peak([[0, .78], [.22, .42], [.42, .7], [.5, .78]], '#8fa6c9'); peak([[.2, .8], [.56, .2], [1, .8]], '#e9eef6'); peak([[.56, .2], [.7, .5], [.62, .56], [.74, .8], [1, .8]], '#b7c6de');
    peak([[.56, .2], [.47, .36], [.53, .4], [.5, .47], [.58, .42], [.63, .36]], '#ffffff'); peak([[0, .8], [.3, .68], [.62, .76], [1, .7], [1, 1], [0, 1]], '#2f4a63');
    peak([[0, .88], [.4, .8], [1, .86], [1, 1], [0, 1]], '#22384d');
    c.fillStyle = '#f6efe2'; c.font = '600 15px ui-monospace, Menlo, monospace'; c.fillText('SUMMIT', 18, h - 18);
  });
  const print = picture(.72, .945, art); print.position.z = .026;
  return group(box(.8, 1.03, .025, mat('#7d5237'), 0, -.515, .012), print);
}
