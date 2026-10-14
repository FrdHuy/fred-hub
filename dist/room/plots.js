// 花圃和里面的植物（规则在 growth.js，这里只管把它们造出来）。
//   · 两片翻过的土一直都在；锁着时是空的，开锁后才长出你们的植物，每株旁边一块小木牌
//   · 植物长成什么样只看种下了多少天；冬天盖着雪休眠（不会死），开春照旧
//   · 那棵大树是你们的树：从在一起那天算，每满一年长大一圈
//   · 在一起满 100 / 365 / 520 / 1000 天，花园里自动多一样东西
//   · 今天浇过水的植物头顶有几点微光
import * as THREE from './three.js';
import { mat, glow, box, cyl, ball, rod, group, contact, own, tilt } from './kit.js';
import { GRASS } from './scene.js';
import { BEDS, plantsFrom, milestonesOf, watered } from './growth.js';
import { dayCount } from './memory.js';

const TOP = GRASS + .045, green = () => mat('#5f9a48'), leafy = () => mat('#7fb857');
const pickOf = (id, list) => { let h = 7; for (const c of id) h = (h * 31 + c.codePointAt(0)) >>> 0; return list[h % list.length]; };

// 每个品种开花时的样子：返回一朵花（原点在茎的底部）。
const BLOOM = {
  sunflower: () => group(cyl(.014, .018, .6, green(), 0, 0, 0, 5), tilt(ball(.07, leafy(), .08, .3, 0, 0), 0, 0, .6), tilt(cyl(.11, .11, .028, mat('#f6c12e'), 0, .6, .02, 9), 1.0, 0, 0), tilt(cyl(.055, .055, .034, mat('#7a4a22'), 0, .602, .024, 8), 1.0, 0, 0)),
  tulip: id => group(cyl(.012, .015, .3, green(), 0, 0, 0, 5), tilt(ball(.06, leafy(), .05, .1, 0, 0), 0, 0, 1.1), cyl(.058, .03, .095, mat(pickOf(id, ['#e5484d', '#f2a3bd', '#f6c945', '#fdf6ec', '#b98bd9'])), 0, .3, 0, 6)),
  rose: id => { const red = mat(pickOf(id, ['#d1343f', '#e6657a', '#f1b2c0'])); return group(cyl(.012, .015, .32, green(), 0, 0, 0, 5), tilt(ball(.05, leafy(), .05, .16, 0, 0), 0, 0, .9), ball(.068, red, 0, .37, 0, 1), ball(.04, red, .01, .42, .01, 0)); },
  lavender: () => group(cyl(.01, .012, .26, green(), 0, 0, 0, 4), ...[0, 1, 2, 3].map(i => ball(.034 - i * .004, mat(i % 2 ? '#9b7fd1' : '#b49be0'), 0, .26 + i * .05, 0, 0))),
  daisy: () => group(cyl(.01, .013, .24, green(), 0, 0, 0, 5), tilt(cyl(.075, .075, .012, mat('#fffaf0'), 0, .24, .01, 8), .8, 0, 0), tilt(ball(.03, mat('#f2b632'), 0, .25, .02, 0), .8, 0, 0)),
  hydrangea: id => { const blue = pickOf(id, [['#8fb2e6', '#a9c2ee'], ['#e6a3c4', '#f0bdd6'], ['#b7a4e6', '#cdbff0']]); return group(cyl(.014, .017, .22, green(), 0, 0, 0, 5), ball(.09, leafy(), 0, .14, 0, 0), ...[[0, .3, 0], [.07, .27, .02], [-.06, .27, -.03], [.01, .26, .07]].map(([x, y, z], i) => ball(.062, mat(blue[i % 2]), x, y, z, 0))); },
};
const stake = () => group(box(.014, .17, .03, mat('#a8794f'), .15, 0, .13), box(.1, .065, .012, mat('#f6efe2'), .15, .13, .145));
function plantModel(plant, dormant) {
  const p = group(stake());
  if (dormant) { const snow = ball(.11, mat('#f4f7fa', { roughness: .9 }), 0, .02, 0, 0); snow.scale.y = .5; p.add(snow); return p; }            // 冬天：雪下面睡着
  if (plant.stage === 'mound') { const soil = ball(.09, mat('#5d3d28', { roughness: 1 }), 0, .01, 0, 0); soil.scale.y = .45; p.add(soil); }
  else if (plant.stage === 'sprout') p.add(cyl(.009, .012, .09, green(), 0, 0, 0, 4), tilt(ball(.035, leafy(), .03, .1, 0, 0), 0, 0, .7), tilt(ball(.035, leafy(), -.03, .1, 0, 0), 0, 0, -.7));
  else if (plant.stage === 'bud') p.add(cyl(.011, .014, .2, green(), 0, 0, 0, 5), tilt(ball(.045, leafy(), .04, .09, 0, 0), 0, 0, .9), tilt(ball(.045, leafy(), -.04, .12, 0, 0), 0, 0, -.9), cyl(.012, .03, .06, mat('#9fcf6a'), 0, .2, 0, 5));
  else {
    // 开花：满一年多开一朵、整丛大一圈（按最多 4 年算）。
    const years = Math.min(plant.years, 4), clump = group();
    for (let i = 0; i <= years; i++) { const flower = BLOOM[plant.species](plant.id + i), a = i * 2.4; flower.position.set(i ? Math.cos(a) * .1 : 0, 0, i ? Math.sin(a) * .1 : 0); flower.scale.setScalar(1 - i * .08); flower.rotation.y = a; clump.add(flower); }
    clump.scale.setScalar(1 + years * .13); p.add(clump);
  }
  return p;
}
// 里程碑：按在一起的天数自动出现的东西。
const EXTRA = {
  birdhouse: () => { const g = group(cyl(.03, .04, 1.25, mat('#8a5a3c'), 0, 0, 0, 5), box(.24, .2, .2, mat('#f6efe2'), 0, 1.25, 0), tilt(box(.2, .02, .26, mat('#c4472a'), -.07, 1.47, 0), 0, 0, .6), tilt(box(.2, .02, .26, mat('#c4472a'), .07, 1.47, 0), 0, 0, -.6), rod(.035, .012, mat('#3a3d38'), 0, 1.36, .101, 'z', 8), contact(.5, .5, .3, 0, 0, .01)); g.position.set(-1.95, GRASS, 6.5); return g; },
  swing: () => { const g = group(rod(.008, 1.5, mat('#e9d9b0'), -.2, 1.15, 0, 'y', 4), rod(.008, 1.5, mat('#e9d9b0'), .2, 1.15, 0, 'y', 4), box(.5, .035, .2, mat('#b98a5e'), 0, .38, 0)); g.position.set(-1.6, GRASS, 5.05); g.rotation.y = .3; g.rotation.x = .08; return g; },
  lights: () => { const b = BEDS[1], g = group(cyl(.025, .03, .9, mat('#efe6d6'), b.x[0] - .12, GRASS, b.z[0] - .12, 5), cyl(.025, .03, .9, mat('#efe6d6'), b.x[1] + .12, GRASS, b.z[1] + .12, 5)), bulb = glow('#ffd28a', 5); for (let i = 0; i <= 8; i++) { const t = i / 8, lamp = ball(.03, bulb, b.x[0] - .12 + t * (b.x[1] - b.x[0] + .24), GRASS + .86 - Math.sin(t * Math.PI) * .22, b.z[0] - .12 + t * (b.z[1] - b.z[0] + .24), 0); lamp.castShadow = false; g.add(lamp); } return g; },
  well: () => { const g = group(cyl(.42, .45, .4, mat('#bfb3a0'), 0, 0, 0, 9), cyl(.34, .34, .02, mat('#3d4f78', { roughness: .1 }), 0, .34, 0, 9), cyl(.03, .03, 1.1, mat('#8a5a3c'), -.4, 0, 0, 5), cyl(.03, .03, 1.1, mat('#8a5a3c'), .4, 0, 0, 5), cyl(0, .62, .3, mat('#c4472a'), 0, 1.1, 0, 4), contact(1.3, 1.3, .32, 0, 0, .01)); g.position.set(2.4, GRASS, -4.7); return g; },
};

// garden：garden.js 的 buildGarden()（要用到里面那棵大树）。onChange(list)：可以点的东西变了（交给 interact.js）。
export function createPlots(scene, garden, onChange) {
  const root = group(); scene.add(root);
  // 花圃：一直都在。深色的土 + 一圈石头。
  for (const b of BEDS) {
    const w = b.x[1] - b.x[0], d = b.z[1] - b.z[0], soil = box(w, .06, d, mat('#6e4a32', { roughness: 1 }), (b.x[0] + b.x[1]) / 2, GRASS - .02, (b.z[0] + b.z[1]) / 2); soil.castShadow = false; root.add(soil);
    const edge = (x, z, i) => root.add(ball(.075, mat(i % 2 ? '#cfc4b2' : '#bfb3a0'), x, GRASS + .03, z, 0));
    for (let x = b.x[0], i = 0; x <= b.x[1] + .01; x += .22, i++) { edge(x, b.z[0] - .04, i); edge(x, b.z[1] + .04, i + 1); }
    for (let z = b.z[0] + .22, i = 0; z < b.z[1] - .01; z += .22, i++) { edge(b.x[0] - .04, z, i); edge(b.x[1] + .04, z, i + 1); }
  }
  const tree = garden.userData.tree, growing = group(); root.add(growing);
  // 浇过水的微光：一小团慢慢浮动的亮点。
  const sparkle = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: new THREE.Color(2.4, 2.6, 1.8), size: .05, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  sparkle.frustumCulled = false; sparkle.renderOrder = 5; root.add(sparkle);
  let data = null, dormant = false, things = [], lit = [], pour = null;

  function rebuild() {
    for (const old of [...growing.children]) { growing.remove(old); old.traverse(o => o.geometry?.dispose()); }
    things = []; tree.scale.setScalar(1); delete tree.userData.entry; delete tree.userData.baseScale;
    if (data) {
      for (const plant of plantsFrom(data)) {
        const model = plantModel(plant, dormant); model.position.set(plant.at[0], TOP, plant.at[1]); model.rotation.y = (plant.at[0] * 7 + plant.at[1] * 3) % .6 - .3;
        model.userData.entry = { label: plant.title, plant, view: 45 }; model.userData.materials = own(model); growing.add(model); things.push(model);
      }
      const since = data.days?.since;
      if (since) {
        const days = dayCount(since), years = Math.max(0, Math.floor((days - 1) / 365));
        tree.userData.baseScale = 1 + Math.min(years, 5) * .07; tree.scale.setScalar(tree.userData.baseScale);
        tree.userData.entry = { label: '我们的树', view: 45, plant: { id: 'tree', title: '我们的树', date: since, days, years, stage: 'tree', note: years ? `已经长大了 ${years} 圈。` : '每满一年，它长大一圈。' } };
        tree.userData.materials = []; things.push(tree);                     // 树叶的颜色跟着季节走，不单独高亮
        for (const key of milestonesOf(days)) growing.add(EXTRA[key]());
      }
    }
    glint(); onChange?.(things);
  }
  // 今天浇过水的那些：算好微光的位置。
  function glint() {
    const wet = watered(); lit = things.filter(o => wet.has(o.userData.entry.plant.id));
    sparkle.geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(lit.length * 9), 3)); sparkle.visible = lit.length > 0; update(0);
  }
  function update(time) {
    if (!lit.length && !pour) return;
    const a = sparkle.geometry.attributes.position?.array;
    lit.forEach((object, i) => { const tall = object === tree ? 3.3 : .5; for (let k = 0; k < 3; k++) { const t = time * .7 + i * 1.7 + k * 2.1; a[i * 9 + k * 3] = object.position.x + Math.sin(t) * .13; a[i * 9 + k * 3 + 1] = object.position.y + tall * (.55 + .25 * Math.sin(t * 1.3 + k)); a[i * 9 + k * 3 + 2] = object.position.z + Math.cos(t * .9) * .13; } });
    if (a) sparkle.geometry.attributes.position.needsUpdate = true;
    // 浇水的那一下：被浇的那株轻轻点两下头。
    if (pour) { const t = (performance.now() - pour.start) / 900, base = pour.object.userData.baseScale ?? 1; if (t >= 1) { pour.object.scale.setScalar(base); pour = null; } else pour.object.scale.setScalar(base * (1 + Math.sin(t * Math.PI * 2) * .06 * (1 - t))); }
  }
  return {
    set(next) { data = next; rebuild(); },
    setDormant(next) { if (next !== dormant) { dormant = next; rebuild(); } },
    watered(object) { pour = { object, start: performance.now() }; glint(); },
    update,
  };
}
