// 墙上的日历 → 纪念日和时间线。挂在墙上：原点在背面中心，正面朝 +z。
// 锁着时是一本普通日历（今天几号）；开锁后翻成「在一起第 N 天」（index.js 调 userData.setUnlocked）。
import { mat, box, cyl, group, paint, picture } from '../kit.js';
import { dayCount } from '../memory.js';

export function build() {
  let face;
  const draw = data => paint(256, 320, (c, w, h) => {
    const since = data?.days?.since, today = new Date();
    c.fillStyle = '#fdfaf3'; c.fillRect(0, 0, w, h); c.fillStyle = '#c4472a'; c.fillRect(0, 0, w, 74);
    c.textAlign = 'center'; c.fillStyle = '#fdfaf3'; c.font = '600 30px ui-monospace, Menlo, monospace'; c.fillText(since ? 'DAY' : `${today.getFullYear()} · ${String(today.getMonth() + 1).padStart(2, '0')}`, w / 2, 48);
    const big = String(since ? dayCount(since) : today.getDate());
    c.fillStyle = '#343832'; c.font = `600 ${big.length > 3 ? 104 : 140}px Georgia, serif`; c.fillText(big, w / 2, 222);
    c.fillStyle = '#8a8d82'; c.font = '22px ui-monospace, Menlo, monospace'; c.fillText(since ? since.replaceAll('-', '.') : ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][today.getDay()], w / 2, 282);
  });
  face = picture(.52, .65, draw(null)); face.position.set(0, -.03, .026);
  const calendar = group(box(.6, .78, .024, mat('#f1ece2'), 0, -.39, .012), face, box(.6, .05, .03, mat('#7d5237'), 0, .34, .015), cyl(.012, .012, .03, mat('#3a3d38'), -.18, .385, .02, 6), cyl(.012, .012, .03, mat('#3a3d38'), .18, .385, .02, 6));
  calendar.userData.setUnlocked = data => { const texture = draw(data); face.material.map?.dispose(); face.material.map = texture; face.material.needsUpdate = true; };
  return calendar;
}
