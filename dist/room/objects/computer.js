// 电脑屏幕 → 技术项目（模块未建，config 里标 soon）。原点在桌面上，屏幕朝 +z。
import { mat, satin, box, cyl, group, anchor, paint, picture, tilt } from '../kit.js';

export function build() {
  // 屏幕内容：深色编辑器里几行彩色代码，现画的。
  const code = paint(256, 160, (c, w, h) => {
    c.fillStyle = '#1d2330'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a3142'; c.fillRect(0, 0, w, 16);
    ['#e56b6f', '#f4c95d', '#7bc98f'].forEach((color, i) => { c.fillStyle = color; c.beginPath(); c.arc(10 + i * 11, 8, 3, 0, 7); c.fill(); });
    const colors = ['#7fb7e6', '#f4c95d', '#c9a0e8', '#7bc98f', '#e9e4d8', '#f08a5d']; let seed = 5;
    for (let row = 0; row < 11; row++) { let x = 12 + (row % 4 === 0 ? 0 : row % 3 === 0 ? 24 : 12); for (let k = 0; k < 4 && x < w - 30; k++) { seed = (seed * 31 + 7) % 97; const len = 14 + seed % 42; c.fillStyle = colors[(row + k + seed) % 6]; c.fillRect(x, 28 + row * 11, len, 4); x += len + 7; } }
  });
  const dark = mat('#2c2f33'), screen = picture(.6, .37, code, 1.5);
  screen.position.set(0, .345, .022);
  return group(cyl(.11, .12, .015, satin('#8f8c86'), 0, 0, -.02, 12), box(.04, .16, .03, satin('#8f8c86'), 0, .015, -.04), box(.64, .41, .035, dark, 0, .14, 0), screen,
    tilt(box(.4, .014, .13, mat('#e8e2d3'), 0, .004, .24), .06, 0, 0), box(.06, .02, .09, mat('#e8e2d3'), .3, 0, .25), anchor('light:screen', 0, .34, .35));
}
