// 花园：小屋前面和侧面的草地——石板小径、树、灌木、花、草丛、木栅栏、长椅、庭院灯。
// 数量多的东西（花、草、栅栏板）用 InstancedMesh，一次绘制调用画完。
import * as THREE from './three.js';
import { mat, glow, satin, box, cyl, ball, group, anchor, contact, rng, pick, tilt } from './kit.js';
import { GRASS, ISLAND, ROOM } from './scene.js';

const PETALS = ['#f4c95d', '#f08a5d', '#f6e7c1', '#e56b6f', '#f2a9b8', '#b79ad6', '#fff4d8'];
const LEAVES = ['#7fae52', '#95bd60', '#6c9c4a', '#a6c86c'];

// 在草地上（房子占地之外）找一个随机落点。
function spot(random, margin = .5) {
  for (;;) {
    const x = ISLAND.min + margin + random() * (ISLAND.max - ISLAND.min - margin * 2), z = ISLAND.min + margin + random() * (ISLAND.max - ISLAND.min - margin * 2);
    if (x > ROOM.half + .5 || z > ROOM.half + .5) return [x, z];
  }
}
function instances(geometry, material, count, place) {
  const mesh = new THREE.InstancedMesh(geometry, material, count), dummy = new THREE.Object3D(), color = new THREE.Color();
  for (let i = 0; i < count; i++) { const tint = place(dummy, i); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); if (tint) mesh.setColorAt(i, color.set(tint)); }
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

function tree(x, z) {
  const random = rng(3), t = group(cyl(.16, .24, 1.9, mat('#7a5238'), 0, 0, 0, 6), tilt(cyl(.07, .1, .9, mat('#7a5238'), .3, 1.2, .1, 5), 0, 0, -.7), contact(2.6, 2.6, .3));
  for (const [dx, dy, dz, r] of [[0, 2.5, 0, 1.05], [.75, 2.2, .2, .7], [-.65, 2.15, -.25, .75], [.1, 3.2, -.1, .7], [-.2, 2.3, .75, .62], [.5, 2.9, -.55, .55]]) {
    const leaf = ball(r, mat(pick(random, LEAVES)), dx, dy, dz, 0); leaf.rotation.set(random() * 3, random() * 3, 0); t.add(leaf);
  }
  t.position.set(x, GRASS, z);
  return t;
}
function bush(x, z, size, random) {
  const b = group(contact(size * 2.6, size * 2.6, .3));
  for (let i = 0; i < 3; i++) { const leaf = ball(size * (.75 + random() * .4), mat(pick(random, LEAVES)), (random() - .5) * size, size * .6, (random() - .5) * size, 0); leaf.rotation.y = random() * 3; b.add(leaf); }
  b.position.set(x, GRASS, z);
  return b;
}
// 庭院灯：木杆上一只小灯笼，灯位叫 light:lantern。
function lantern(x, z) {
  const l = group(cyl(.04, .05, 1.25, mat('#5a4334'), 0, 0, 0, 6), box(.3, .03, .3, mat('#4a382c'), 0, 1.25, 0), box(.2, .24, .2, glow('#ffc47a', 3.2, '#3a2a1c'), 0, 1.28, 0),
    cyl(.02, .2, .12, mat('#4a382c'), 0, 1.52, 0, 4), anchor('light:lantern', 0, 1.4, 0), contact(.7, .7, .35));
  l.children[3].rotation.y = Math.PI / 4; l.position.set(x, GRASS, z);
  return l;
}
function bench(x, z, turn) {
  const wood = mat('#b98a5e'), dark = mat('#7d5237'), b = group(contact(1.7, .9, .32));
  for (let i = 0; i < 3; i++) b.add(box(1.4, .04, .12, wood, 0, .42, -.14 + i * .14));
  for (let i = 0; i < 2; i++) b.add(box(1.4, .04, .12, wood, 0, .62 + i * .16, -.26));
  for (const sx of [-.6, .6]) b.add(box(.06, .42, .4, dark, sx, 0, 0), box(.06, .9, .05, dark, sx, 0, -.27));
  b.position.set(x, GRASS, z); b.rotation.y = turn;
  return b;
}

export function buildGarden() {
  const random = rng(42), garden = group(), R = ROOM.half;
  // 石板小径：从门口弯向地块边缘。
  const stone = [mat('#cfc4b2'), mat('#bfb3a0'), mat('#d8cebd')];
  [[.9, 3.75], [1.05, 4.4], [1.35, 5.0], [1.25, 5.65], [1.6, 6.2], [1.5, 6.8]].forEach(([x, z], i) => {
    const s = cyl(.34 + random() * .08, .36, .05, stone[i % 3], x + (random() - .5) * .1, GRASS - .005, z, 7); s.rotation.y = random() * 3; s.scale.x = 1.15; garden.add(s);
  });
  garden.add(tree(-2.3, 5.5), lantern(2.3, 5.1), bench(-1.2, 3.75, 0));
  for (const [x, z, size] of [[3.75, -2.6, .42], [3.9, -1.5, .3], [4.3, 2.9, .5], [-3.6, 4.2, .4], [6.3, 6.2, .55], [5.6, -3.3, .5], [6.5, 1.2, .36], [3.6, 6.4, .34]]) garden.add(bush(x, z, size, random));
  for (const [x, z, r] of [[5.2, 4.6, .22], [5.45, 4.85, .13], [-3.5, 6.5, .2], [6.4, -1.6, .18]]) garden.add(ball(r, mat('#b9ae9c'), x, GRASS + r * .5, z, 0));

  // 花：一丛一丛地开——屋侧的花坛、小径两边、树下，再零星撒一些。
  const beds = [[3.6, 4.1, -.6, 2.6, 26], [.1, .75, 4.1, 6.4, 12], [1.9, 2.7, 3.9, 6.6, 14], [-3.6, -1.2, 4.6, 6.6, 12], [4.2, 6.8, 3.4, 6.8, 22], [4.4, 6.9, -3.8, 2.6, 18]];
  const flowers = beds.flatMap(([x0, x1, z0, z1, n]) => Array.from({ length: n }, () => [x0 + random() * (x1 - x0), z0 + random() * (z1 - z0), .2 + random() * .24, pick(random, PETALS)]));
  garden.add(
    instances(new THREE.CylinderGeometry(.016, .02, 1, 4), mat('#5f8a44'), flowers.length, (d, i) => { const [x, z, h] = flowers[i]; d.position.set(x, GRASS + h / 2, z); d.scale.set(1, h, 1); d.rotation.set(0, 0, 0); }),
    instances(new THREE.IcosahedronGeometry(.09, 0), mat('#ffffff'), flowers.length, (d, i) => { const [x, z, h, tint] = flowers[i]; d.position.set(x, GRASS + h + .03, z); d.scale.set(1, .7, 1); d.rotation.set(random(), random() * 3, 0); return tint; }),
    instances(new THREE.IcosahedronGeometry(.032, 0), mat('#f2b632'), flowers.length, (d, i) => { const [x, z, h] = flowers[i]; d.position.set(x, GRASS + h + .085, z); d.scale.set(1, 1, 1); }),
  );
  // 屋侧花坛的石头围边。
  for (let i = 0; i < 9; i++) garden.add(ball(.1, mat('#cfc4b2'), 4.25, GRASS + .04, -.7 + i * .42, 0), ...(i < 2 ? [ball(.1, mat('#bfb3a0'), 3.65 + i * .3, GRASS + .04, 2.75, 0)] : []));
  // 草丛：小尖锥，让草地不是一块平板。
  const tufts = Array.from({ length: 150 }, () => [...spot(random, .3), .08 + random() * .1, pick(random, ['#aed072', '#8fb85a', '#bcd983'])]);
  garden.add(instances(new THREE.ConeGeometry(.05, 1, 4), mat('#ffffff'), tufts.length, (d, i) => { const [x, z, h, tint] = tufts[i]; d.position.set(x, GRASS + h / 2, z); d.scale.set(1, h, 1); d.rotation.set(0, random() * 3, (random() - .5) * .4); return tint; }));

  // 木栅栏：沿着朝向镜头的两条边，小径处留出口；矮矮的，不挡视线。
  const edge = ISLAND.max - .25, pickets = [], rails = group(), wood = mat('#efe6d6');
  const run = (from, to, alongX) => {
    const length = to - from, mid = (from + to) / 2;
    for (const y of [.14, .34]) rails.add(alongX ? box(length, .035, .03, wood, mid, GRASS + y, edge) : box(.03, .035, length, wood, edge, GRASS + y, mid));
    for (let p = from + .12; p < to; p += .26) pickets.push(alongX ? [p, edge + .02, 0] : [edge + .02, p, Math.PI / 2]);
  };
  run(-3.9, .95, true); run(2.1, edge, true); run(-3.9, edge, false);
  garden.add(rails, instances(new THREE.BoxGeometry(.09, .5, .025), wood, pickets.length, (d, i) => { const [x, z, turn] = pickets[i]; d.position.set(x, GRASS + .25, z); d.rotation.set(0, turn, 0); d.scale.set(1, 1, 1); }));
  return garden;
}
