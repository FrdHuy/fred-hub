// 花园：小屋前面和侧面的草地——石板小径、树、灌木、花、草丛、木栅栏、长椅、庭院灯。
// 数量多的东西（花、草、栅栏板）用 InstancedMesh，一次绘制调用画完。
import * as THREE from './three.js';
import { mat, tone, tones, glow, satin, box, cyl, ball, group, anchor, contact, rng, pick, tilt } from './kit.js';
import { GRASS, ISLAND, ROOM } from './scene.js';

const PETALS = ['#f4c95d', '#f08a5d', '#f6e7c1', '#e56b6f', '#f2a9b8', '#b79ad6', '#fff4d8'];
const STONES = ['#cfc4b2', '#bfb3a0', '#d8cebd'];
const LEAVES = ['#7fae52', '#95bd60', '#6c9c4a', '#a6c86c'];

// 在草地上（房子占地之外）找一个随机落点。
function spot(random, margin = .5) {
  for (;;) {
    const x = ISLAND.min + margin + random() * (ISLAND.max - ISLAND.min - margin * 2), z = ISLAND.min + margin + random() * (ISLAND.max - ISLAND.min - margin * 2);
    if (Math.max(Math.abs(x), Math.abs(z)) > ROOM.half + .55) return [x, z];
  }
}
function instances(geometry, material, count, place) {
  const mesh = new THREE.InstancedMesh(geometry, material, count), dummy = new THREE.Object3D(), color = new THREE.Color();
  for (let i = 0; i < count; i++) { const tint = place(dummy, i); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); if (tint) mesh.setColorAt(i, color.set(tint)); }
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

function tree(x, z, scale = 1) {
  const random = rng(3), t = group(cyl(.16, .24, 1.9, mat('#7a5238'), 0, 0, 0, 6), tilt(cyl(.07, .1, .9, mat('#7a5238'), .3, 1.2, .1, 5), 0, 0, -.7), contact(2.6, 2.6, .3));
  for (const [dx, dy, dz, r] of [[0, 2.5, 0, 1.05], [.75, 2.2, .2, .7], [-.65, 2.15, -.25, .75], [.1, 3.2, -.1, .7], [-.2, 2.3, .75, .62], [.5, 2.9, -.55, .55]]) {
    const leaf = ball(r, tone('tree' + Math.floor(random() * 4), LEAVES[0]), dx, dy, dz, 0); leaf.rotation.set(random() * 3, random() * 3, 0); t.add(leaf);
  }
  t.position.set(x, GRASS, z); t.scale.setScalar(scale);
  return t;
}
function bush(x, z, size, random) {
  const b = group(contact(size * 2.6, size * 2.6, .3));
  for (let i = 0; i < 3; i++) { const leaf = ball(size * (.75 + random() * .4), tone('bush' + Math.floor(random() * 4), LEAVES[0]), (random() - .5) * size, size * .6, (random() - .5) * size, 0); leaf.rotation.y = random() * 3; b.add(leaf); }
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
  const stone = STONES.map((color, i) => tone('stone' + i, color));
  [[.9, 3.75], [1.05, 4.4], [1.35, 5.0], [1.25, 5.65], [1.6, 6.2], [1.5, 6.8]].forEach(([x, z], i) => {
    const s = cyl(.34 + random() * .08, .36, .05, stone[i % 3], x + (random() - .5) * .1, GRASS - .005, z, 7); s.rotation.y = random() * 3; s.scale.x = 1.15; garden.add(s);
  });
  garden.add(tree(-2.3, 5.5), tree(-4.5, -4.5, .78), lantern(2.3, 5.1), bench(-1.2, 3.75, 0));
  for (const [x, z, size] of [[3.75, -2.6, .42], [3.9, -1.5, .3], [4.3, 2.9, .5], [-3.6, 4.2, .4], [6.3, 6.2, .55], [5.6, -3.3, .5], [6.5, 1.2, .36], [3.6, 6.4, .34], [-1.4, -4.4, .45], [1.6, -4.7, .34], [3.4, -4.3, .4], [-4.6, .6, .4], [-4.4, 2.6, .32]]) garden.add(bush(x, z, size, random));
  for (const [x, z, r] of [[5.2, 4.6, .22], [5.45, 4.85, .13], [-3.5, 6.5, .2], [6.4, -1.6, .18]]) garden.add(ball(r, mat('#b9ae9c'), x, GRASS + r * .5, z, 0));

  // 花：一丛一丛地开——屋侧的花坛、小径两边、树下，再零星撒一些。
  const beds = [[3.6, 4.1, -.6, 2.6, 26], [.1, .75, 4.1, 6.4, 12], [1.9, 2.7, 3.9, 6.6, 14], [-3.6, -1.2, 4.6, 6.6, 12], [4.2, 6.8, 3.4, 6.8, 22], [4.4, 6.9, -3.8, 2.6, 18], [-.6, 3.0, -5.2, -3.7, 20], [-5.2, -3.8, -2.6, 3.4, 18], [4.0, 6.8, -5.2, -3.9, 12]];
  const flowers = beds.flatMap(([x0, x1, z0, z1, n]) => Array.from({ length: n }, () => [x0 + random() * (x1 - x0), z0 + random() * (z1 - z0), .2 + random() * .24, pick(random, PETALS)]));
  garden.add(
    instances(new THREE.CylinderGeometry(.016, .02, 1, 4), tone('stem', '#5f8a44'), flowers.length, (d, i) => { const [x, z, h] = flowers[i]; d.position.set(x, GRASS + h / 2, z); d.scale.set(1, h, 1); d.rotation.set(0, 0, 0); }),
    instances(new THREE.IcosahedronGeometry(.09, 0), tone('petal', '#ffffff'), flowers.length, (d, i) => { const [x, z, h, tint] = flowers[i]; d.position.set(x, GRASS + h + .03, z); d.scale.set(1, .7, 1); d.rotation.set(random(), random() * 3, 0); return tint; }),
    instances(new THREE.IcosahedronGeometry(.032, 0), tone('pollen', '#f2b632'), flowers.length, (d, i) => { const [x, z, h] = flowers[i]; d.position.set(x, GRASS + h + .085, z); d.scale.set(1, 1, 1); }),
  );
  // 屋侧花坛的石头围边。
  for (let i = 0; i < 9; i++) garden.add(ball(.1, mat('#cfc4b2'), 4.25, GRASS + .04, -.7 + i * .42, 0), ...(i < 2 ? [ball(.1, mat('#bfb3a0'), 3.65 + i * .3, GRASS + .04, 2.75, 0)] : []));
  // 草丛：小尖锥，让草地不是一块平板。
  const tufts = Array.from({ length: 150 }, () => [...spot(random, .3), .08 + random() * .1, pick(random, ['#aed072', '#8fb85a', '#bcd983'])]);
  garden.add(instances(new THREE.ConeGeometry(.05, 1, 4), tone('tuft', '#ffffff'), tufts.length, (d, i) => { const [x, z, h, tint] = tufts[i]; d.position.set(x, GRASS + h / 2, z); d.scale.set(1, h, 1); d.rotation.set(0, random() * 3, (random() - .5) * .4); return tint; }));

  // 木栅栏：围一整圈，小径处留出口；矮矮的，不挡视线。
  const near = ISLAND.max - .25, back = ISLAND.min + .25, pickets = [], rails = group(), wood = mat('#efe6d6');
  const run = (from, to, edge, alongX) => {
    const length = to - from, mid = (from + to) / 2;
    for (const y of [.14, .34]) rails.add(alongX ? box(length, .035, .03, wood, mid, GRASS + y, edge) : box(.03, .035, length, wood, edge, GRASS + y, mid));
    for (let p = from + .12; p < to; p += .26) pickets.push(alongX ? [p, edge, 0] : [edge, p, Math.PI / 2]);
  };
  run(back, .95, near, true); run(2.1, near, near, true); run(back, near, near, false); run(back, near, back, true); run(back, near, back, false);
  garden.add(rails, instances(new THREE.BoxGeometry(.09, .5, .025), wood, pickets.length, (d, i) => { const [x, z, turn] = pickets[i]; d.position.set(x, GRASS + .25, z); d.rotation.set(0, turn, 0); d.scale.set(1, 1, 1); }));
  // 地上的落花 / 落叶：一片片贴着草地的小薄片，平时数量为 0，春天和秋天才铺出来。
  const litter = Array.from({ length: 260 }, () => [...spot(random, .3), pick(random, ['#ffffff', '#e9e9e9', '#d6d6d6', '#f6f6f6'])]);
  const fallen = instances(new THREE.BoxGeometry(.13, .008, .08), tone('litter', '#ffffff'), litter.length, (d, i) => { const [x, z, tint] = litter[i]; d.position.set(x, GRASS + .012, z); d.rotation.set(0, random() * 6.28, 0); d.scale.set(1, 1, 1); return tint; });
  fallen.castShadow = false; fallen.count = 0; garden.add(fallen);
  // 树下的一圈：春天是落花，秋天是落叶——比别处密得多，一眼能看出是从这棵树上掉下来的。
  const under = [[-2.3, 5.5, 2.3, 170], [-4.5, -4.5, 1.4, 60]].flatMap(([cx, cz, r, n]) => Array.from({ length: n }, () => { const a = random() * 6.28, d = Math.sqrt(random()) * r; return [cx + Math.cos(a) * d, cz + Math.sin(a) * d, pick(random, ['#ffffff', '#ececec', '#dcdcdc', '#f7f7f7'])]; }))
    .filter(([x, z]) => Math.max(Math.abs(x), Math.abs(z)) > ROOM.half + .3 && Math.max(x, z) < ISLAND.max - .3 && Math.min(x, z) > ISLAND.min + .3);
  const carpet = instances(new THREE.BoxGeometry(.14, .01, .09), tone('carpet', '#ffffff'), under.length, (d, i) => { const [x, z, tint] = under[i]; d.position.set(x, GRASS + .016, z); d.rotation.set(0, random() * 6.28, 0); d.scale.set(1, 1, 1); return tint; });
  carpet.castShadow = false; carpet.count = 0; garden.add(carpet);
  // 冬天的积雪：长椅、庭院灯顶、石头上各一小堆，平时不显示。
  const white = mat('#f4f7fa', { roughness: .9 }), snow = group(box(1.42, .06, .42, white, -1.2, GRASS + .46, 3.75), box(1.42, .05, .1, white, -1.2, GRASS + .84, 3.49), box(.34, .05, .34, white, 2.3, GRASS + 1.6, 5.1),
    ...[[5.2, 4.6, .2], [-3.5, 6.5, .18], [6.4, -1.6, .16]].map(([x, z, r]) => { const cap = ball(r, white, x, GRASS + r * 1.05, z, 0); cap.scale.y = .5; return cap; }));
  snow.traverse(o => { o.castShadow = false; }); snow.visible = false; garden.add(snow);
  const meshes = garden.children.filter(o => o.isInstancedMesh);
  garden.userData.season = { flowers: meshes.filter(m => ['stem', 'petal', 'pollen'].some(name => m.material === tones.get(name))), total: flowers.length, tufts: meshes.find(m => m.material === tones.get('tuft')), fallen, carpet, snow };
  return garden;
}

// 按预设（lights.js 里 MOODS[...].garden）给花园换季：草、树、灌木改色，花开多少，地上有没有落叶，湿不湿，有没有雪。
export function setSeason(garden, house, look) {
  const { flowers, total, tufts, fallen, carpet, snow } = garden.userData.season, paint = (name, color) => tones.get(name)?.color.set(color);
  paint('grass', look.grass); paint('tuft', look.tuft ?? '#ffffff');
  for (let i = 0; i < 4; i++) { paint('tree' + i, look.tree[i]); paint('bush' + i, look.bush[i]); }
  STONES.forEach((color, i) => paint('stone' + i, look.stone ?? color));
  for (const mesh of flowers) mesh.count = Math.round(total * (look.flowers ?? 1));
  tufts.count = look.snow ? 40 : tufts.instanceMatrix.count;
  fallen.count = look.litter ? Math.round(fallen.instanceMatrix.count * look.litter[1]) : 0; if (look.litter) paint('litter', look.litter[0]);
  carpet.count = look.carpet ? carpet.instanceMatrix.count : 0; if (look.carpet) paint('carpet', look.carpet);
  // 花树自己带一点亮度（背光时粉色才不发闷）；别的季节是 0。
  for (let i = 0; i < 4; i++) { const leaf = tones.get('tree' + i); leaf.emissive.copy(leaf.color); leaf.emissiveIntensity = look.treeGlow ?? 0; }
  // 湿润：草和石头变光滑，灯光会在上面留下高光。
  tones.get('grass').roughness = look.wet ? .38 : .82; for (let i = 0; i < 3; i++) { const stone = tones.get('stone' + i); stone.roughness = look.wet ? .16 : .82; stone.metalness = look.wet ? .25 : 0; }
  snow.visible = !!look.snow; for (const cap of house.userData.snow) cap.visible = !!look.snow;
}
