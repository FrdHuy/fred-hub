// 摆设：不对应任何模块、只负责让屋子有人住的东西——地毯、矮桌、坐垫和猫、落地灯、书架、绿植、墙上的小串灯。
import { mat, glow, satin, box, cyl, ball, rod, group, anchor, contact, rng, pick, tilt, quiet } from './kit.js';
import { ROOM } from './scene.js';

function rug(x, z) {
  const r = group(box(3.0, .018, 2.1, mat('#c9764f', { roughness: 1 })), box(2.72, .022, 1.82, mat('#f1e5d0', { roughness: 1 })), box(2.56, .026, 1.66, mat('#d98a5f', { roughness: 1 })), box(1.5, .03, .7, mat('#f1e5d0', { roughness: 1 })), box(1.3, .034, .5, mat('#e0b354', { roughness: 1 })));
  r.traverse(o => { o.castShadow = false; }); r.position.set(x, 0, z); r.rotation.y = .1;
  return r;
}
function table(x, z) {
  const wood = mat('#b98a5e'), t = group(contact(1.2, 1.2, .4), cyl(.42, .42, .04, wood, 0, .3, 0, 14), ...[0, 2.1, 4.2].map(a => tilt(cyl(.025, .018, .3, mat('#7d5237'), Math.cos(a) * .28, 0, Math.sin(a) * .28, 6), 0, 0, 0)),
    cyl(.045, .035, .07, mat('#f1e5d0'), .12, .34, .1, 8), cyl(.038, .038, .004, mat('#8a5a3c'), .12, .4, .1, 8),                 // 一杯茶
    tilt(box(.24, .03, .17, mat('#5f7f8a'), -.14, .34, -.08), 0, .5, 0), cyl(.04, .05, .11, mat('#e9e4d8'), -.1, .34, .2, 7),
    ball(.045, mat('#f4c95d'), -.1, .55, .2, 0), ball(.04, mat('#e56b6f'), -.06, .5, .23, 0), ball(.04, mat('#f6e7c1'), -.14, .51, .17, 0));
  t.position.set(x, 0, z);
  return t;
}
// 晒太阳的猫：窝在坐垫上，正好落在窗格光斑里。
function cat(x, z, turn) {
  const fur = mat('#e39a4e'), c = group(contact(1.0, 1.0, .38), cyl(.36, .38, .11, mat('#e0b354', { roughness: 1 }), 0, 0, 0, 12));
  const body = ball(.19, fur, 0, .2, 0, 1); body.scale.set(1.25, .62, 1);
  const tail = rod(.03, .3, fur, -.12, .15, .19, 'x', 6); tail.rotation.y = .5;
  c.add(body, ball(.1, fur, .2, .2, .08, 1), tilt(cyl(0, .035, .07, fur, .23, .27, .03, 4), 0, 0, -.15), tilt(cyl(0, .035, .07, fur, .21, .27, .14, 4), 0, 0, -.15), tail, ball(.05, mat('#f6e7c1'), .27, .17, .09, 0));
  c.position.set(x, 0, z); c.rotation.y = turn;
  return c;
}
function floorLamp(x, z) {
  const shade = quiet(group(cyl(.15, .24, .32, glow('#ffc98a', 1.5, '#f1e5d0'), 0, 1.42, 0, 12), ball(.05, glow('#ffe1b0', 6), 0, 1.55, 0)));
  const l = group(contact(.8, .8, .4), cyl(.16, .18, .03, mat('#7d5237'), 0, 0, 0, 12), cyl(.014, .014, 1.45, satin('#9c8f7c'), 0, .03, 0, 6), shade, anchor('light:floor', 0, 1.5, 0));
  l.position.set(x, 0, z);
  return l;
}
function bookshelf(x, z, turn) {
  const wood = mat('#9a6a45'), random = rng(17), s = group(contact(1.1, .7, .4, 0, .1), box(.84, 1.75, .02, mat('#7d5237'), 0, 0, -.14), box(.03, 1.75, .3, wood, -.42, 0, 0), box(.03, 1.75, .3, wood, .42, 0, 0));
  const spines = ['#c9764f', '#5f7f8a', '#e0b354', '#86a85a', '#f1e5d0', '#e56b6f', '#34406e', '#b79ad6', '#8a5a3c'];
  for (let level = 0; level < 5; level++) {
    const y = .04 + level * .42; s.add(box(.84, .03, .3, wood, 0, y, 0));
    if (level === 4) { s.add(cyl(.08, .06, .11, mat('#c9764f'), -.2, y + .03, 0, 8), ball(.1, mat('#6f9a4a'), -.2, y + .22, 0, 0), ball(.07, mat('#84ad55'), -.13, y + .28, .04, 0), box(.2, .14, .02, mat('#f4ede0'), .18, y + .03, 0)); break; }
    for (let bx = -.37; bx < .34;) { const w = .035 + random() * .035, h = .24 + random() * .1; if (random() < .12) { bx += .08; continue; } s.add(tilt(box(w, h, .2, mat(pick(random, spines)), bx + w / 2, y + .03, .02), 0, 0, random() < .1 ? .16 : 0)); bx += w + .004; }
  }
  s.position.set(x, 0, z); s.rotation.y = turn;
  return s;
}
function plant(x, z) {
  const random = rng(4), p = group(contact(.9, .9, .4), cyl(.17, .12, .3, mat('#e9e4d8'), 0, 0, 0, 8), cyl(.15, .15, .02, mat('#5d3d28'), 0, .29, 0, 8));
  for (let i = 0; i < 9; i++) { const a = i * 2.4, lean = .25 + random() * .5, h = .5 + random() * .55, leaf = ball(.15 + random() * .06, mat(pick(random, ['#5f8a44', '#6f9a4a', '#4f7a3c', '#84ad55'])), Math.cos(a) * lean * .6, .3 + h, Math.sin(a) * lean * .6, 0); leaf.scale.set(1, .28, .7); leaf.rotation.set(random() - .5, a, lean); p.add(leaf, tilt(cyl(.01, .012, h, mat('#5f8a44'), Math.cos(a) * lean * .3, .3, Math.sin(a) * lean * .3, 4), Math.sin(a) * lean * .5, 0, -Math.cos(a) * lean * .5)); }
  p.position.set(x, 0, z);
  return p;
}
// 右后墙顶上的一串小灯：细线垂成几道弧，灯泡自发光（第 3 阶段 Bloom 会给它们光晕）。
function fairyLights() {
  const R = ROOM.half, line = group(), bulb = glow('#ffd28a', 5);
  for (let i = 0; i < 22; i++) { const t = (i + .5) / 22, x = -R + .3 + t * (R * 2 - .6), y = 2.92 - Math.abs(Math.sin(t * Math.PI * 3)) * .16; line.add(ball(.028, bulb, x, y - .03, -R + .06, 0), rod(.004, .28, mat('#5d3d28'), x, y, -R + .05, 'x', 4)); }
  line.add(anchor('light:fairy', 0, 2.6, -R + .5));
  return quiet(line);
}

export function buildDecor() {
  return group(rug(.5, 1.05), table(1.35, .45), cat(.25, 1.5, -.5), floorLamp(2.5, -1.2), bookshelf(-2.84, 2.48, Math.PI / 2), plant(1.48, -2.6), fairyLights(),
    cyl(.3, .32, .12, mat('#d98a5f', { roughness: 1 }), 2.1, 0, .9, 12), contact(.9, .9, .34, 2.1, .9));
}
