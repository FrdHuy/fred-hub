// 花圃和里面的植物（规则在 growth.js，这里只管把它们造出来）。
//   · 纪念花圃（时间线里的日子）+ 养成花圃（亲手种的，随花园等级一块块翻土），每株旁边一块小木牌
//   · 植物长成什么样只看天数（养成花圃里的花被浇过水会快一点）；冬天盖着雪休眠（不会死），开春照旧
//   · 花园等级解锁的装饰（鸟浴盆、小池塘、温室）；花圃旁的木牌点开是花园的样子
//   · 那棵大树是你们的树：从在一起那天算，每满一年长大一圈
//   · 在一起满 100 / 365 / 520 / 1000 天，花园里自动多一样东西
//   · 今天浇过水的植物头顶有几点微光
import * as THREE from './three.js';
import { mat, glow, box, cyl, ball, rod, group, contact, own, tilt, paint, picture } from './kit.js';
import { GRASS } from './scene.js';
import { BEDS, memorialPlants, gardenPlants, milestonesOf, wateredToday, levelOf, bedsFor, decorFor, visitorOf } from './growth.js';
import { animalModel, idle } from './animals.js';
import { dayCount } from './memory.js';

const TOP = GRASS + .045, green = () => mat('#5f9a48'), leafy = () => mat('#7fb857');

// 每个品种开花时的样子：返回一朵花（原点在茎的底部）。
const BLOOM = {
  sunflower: () => group(cyl(.014, .018, .6, green(), 0, 0, 0, 5), tilt(ball(.07, leafy(), .08, .3, 0, 0), 0, 0, .6), tilt(cyl(.11, .11, .028, mat('#f6c12e'), 0, .6, .02, 9), 1.0, 0, 0), tilt(cyl(.055, .055, .034, mat('#7a4a22'), 0, .602, .024, 8), 1.0, 0, 0)),
  tulip: color => group(cyl(.012, .015, .3, green(), 0, 0, 0, 5), tilt(ball(.06, leafy(), .05, .1, 0, 0), 0, 0, 1.1), cyl(.058, .03, .095, mat(color), 0, .3, 0, 6)),
  rose: color => { const red = mat(color); return group(cyl(.012, .015, .32, green(), 0, 0, 0, 5), tilt(ball(.05, leafy(), .05, .16, 0, 0), 0, 0, .9), ball(.068, red, 0, .37, 0, 1), ball(.04, red, .01, .42, .01, 0)); },
  lavender: () => group(cyl(.01, .012, .26, green(), 0, 0, 0, 4), ...[0, 1, 2, 3].map(i => ball(.034 - i * .004, mat(i % 2 ? '#9b7fd1' : '#b49be0'), 0, .26 + i * .05, 0, 0))),
  daisy: () => group(cyl(.01, .013, .24, green(), 0, 0, 0, 5), tilt(cyl(.075, .075, .012, mat('#fffaf0'), 0, .24, .01, 8), .8, 0, 0), tilt(ball(.03, mat('#f2b632'), 0, .25, .02, 0), .8, 0, 0)),
  // 季节限定的三种。
  primrose: color => group(...[0, 1.6, 3.2, 4.7].map(a => { const leaf = ball(.06, leafy(), Math.cos(a) * .06, .02, Math.sin(a) * .06, 0); leaf.scale.y = .35; return leaf; }), ...[[0, .1, 0], [.05, .09, .04], [-.05, .085, -.03]].map(([x, y, z]) => cyl(.035, .035, .012, mat(color), x, y, z, 6)), ball(.012, mat('#f2b632'), 0, .11, 0, 0)),
  cosmos: color => group(cyl(.008, .01, .55, green(), 0, 0, 0, 4), tilt(cyl(.085, .085, .01, mat(color), 0, .55, .02, 8), .6, 0, 0), tilt(ball(.022, mat('#f2b632'), 0, .555, .025, 0), .6, 0, 0)),
  hellebore: color => group(cyl(.012, .014, .24, green(), 0, 0, 0, 5), ball(.07, mat('#4f7a3c'), 0, .08, 0, 0), tilt(cyl(.065, .022, .055, mat(color), .03, .2, .03, 6), 2.5, 0, 0), tilt(cyl(.055, .02, .05, mat(color), -.04, .18, -.02, 6), 2.6, 1, 0)),
  hydrangea: color => { const blue = [color, color]; return group(cyl(.014, .017, .22, green(), 0, 0, 0, 5), ball(.09, leafy(), 0, .14, 0, 0), ...[[0, .3, 0], [.07, .27, .02], [-.06, .27, -.03], [.01, .26, .07]].map(([x, y, z], i) => ball(.062, mat(blue[i % 2]), x, y, z, 0))); },
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
    for (let i = 0; i <= years; i++) { const flower = BLOOM[plant.species](plant.color), a = i * 2.4; flower.position.set(i ? Math.cos(a) * .1 : 0, 0, i ? Math.sin(a) * .1 : 0); flower.scale.setScalar(1 - i * .08); flower.rotation.y = a; clump.add(flower); }
    clump.scale.setScalar(1 + years * .13); p.add(clump);
  }
  return p;
}
// 里程碑：按在一起的天数自动出现的东西。
const EXTRA = {
  birdhouse: () => { const g = group(cyl(.03, .04, 1.25, mat('#8a5a3c'), 0, 0, 0, 5), box(.24, .2, .2, mat('#f6efe2'), 0, 1.25, 0), tilt(box(.2, .02, .26, mat('#c4472a'), -.07, 1.47, 0), 0, 0, .6), tilt(box(.2, .02, .26, mat('#c4472a'), .07, 1.47, 0), 0, 0, -.6), rod(.035, .012, mat('#3a3d38'), 0, 1.36, .101, 'z', 8), contact(.5, .5, .3, 0, 0, .01)); g.position.set(-1.95, GRASS, 6.5); return g; },
  swing: () => { const g = group(rod(.008, 1.5, mat('#e9d9b0'), -.2, 1.15, 0, 'y', 4), rod(.008, 1.5, mat('#e9d9b0'), .2, 1.15, 0, 'y', 4), box(.5, .035, .2, mat('#b98a5e'), 0, .38, 0)); g.position.set(-1.6, GRASS, 5.05); g.rotation.y = .3; g.rotation.x = .08; return g; },
  lights: () => { const b = BEDS[1], g = group(cyl(.025, .03, .9, mat('#efe6d6'), b.x[0] - .12, GRASS, b.z[0] - .12, 5), cyl(.025, .03, .9, mat('#efe6d6'), b.x[1] + .12, GRASS, b.z[1] + .12, 5)), bulb = glow('#ffd28a', 5); for (let i = 0; i <= 8; i++) { const t = i / 8, lamp = ball(.03, bulb, b.x[0] - .12 + t * (b.x[1] - b.x[0] + .24), GRASS + .86 - Math.sin(t * Math.PI) * .22, b.z[0] - .12 + t * (b.z[1] - b.z[0] + .24), 0); lamp.castShadow = false; g.add(lamp); } return g; },
  // 花园等级解锁的装饰。
  birdbath: () => { const g = group(cyl(.09, .14, .55, mat('#cfc4b2'), 0, 0, 0, 8), cyl(.32, .2, .1, mat('#d8cebd'), 0, .55, 0, 10), cyl(.27, .27, .02, mat('#7fa8c8', { roughness: .1 }), 0, .62, 0, 10), ball(.05, mat('#8fb6d9'), .18, .7, .05, 0), contact(.9, .9, .3, 0, 0, .01)); g.position.set(6.15, GRASS, 4.75); return g; },
  pond: () => { const water = cyl(.85, .85, .03, mat('#5f88b0', { roughness: .08, metalness: .3 }), 0, -.005, 0, 12); water.scale.z = .7; const g = group(water); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; g.add(ball(.12, mat(i % 2 ? '#cfc4b2' : '#bfb3a0'), Math.cos(a) * .9, .03, Math.sin(a) * .64, 0)); } g.add(cyl(.12, .12, .01, mat('#6f9a4a'), .3, .03, .1, 7), ball(.04, mat('#fdf6ec'), .3, .06, .1, 0)); g.position.set(5.0, GRASS, -4.45); return g; },
  greenhouse: () => { const glass = new THREE.MeshStandardMaterial({ color: '#dff0ea', transparent: true, opacity: .32, roughness: .1, depthWrite: false }), frame = mat('#f4ede0'); const g = group(box(1.3, .1, 1.7, mat('#8c7a6a'), 0, 0, 0)); const pane = (w, h, x, y, z, ry = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glass); m.position.set(x, y, z); m.rotation.y = ry; g.add(m); }; pane(1.3, .9, 0, .55, .85); pane(1.3, .9, 0, .55, -.85); pane(1.7, .9, .65, .55, 0, Math.PI / 2); pane(1.7, .9, -.65, .55, 0, Math.PI / 2); for (const [x, z] of [[-.65, -.85], [.65, -.85], [-.65, .85], [.65, .85]]) g.add(box(.05, 1.0, .05, frame, x, .1, z)); g.add(tilt(box(1.4, .04, 1.8, mat('#dff0ea', { transparent: true, opacity: .45 }), -.3, 1.18, 0), 0, 0, .5), tilt(box(1.4, .04, 1.8, mat('#dff0ea', { transparent: true, opacity: .45 }), .3, 1.18, 0), 0, 0, -.5)); for (let i = 0; i < 4; i++) g.add(ball(.12, mat(['#7fae52', '#e5484d', '#95bd60', '#f6c945'][i]), -.35 + i * .23, .25, (i % 2 - .5) * .5, 0)); g.position.set(-4.55, GRASS, -2.3); return g; },
  well: () => { const g = group(cyl(.42, .45, .4, mat('#bfb3a0'), 0, 0, 0, 9), cyl(.34, .34, .02, mat('#3d4f78', { roughness: .1 }), 0, .34, 0, 9), cyl(.03, .03, 1.1, mat('#8a5a3c'), -.4, 0, 0, 5), cyl(.03, .03, 1.1, mat('#8a5a3c'), .4, 0, 0, 5), cyl(0, .62, .3, mat('#c4472a'), 0, 1.1, 0, 4), contact(1.3, 1.3, .32, 0, 0, .01)); g.position.set(2.4, GRASS, -4.7); return g; },
};

// garden：garden.js 的 buildGarden()（要用到里面那棵大树）。onChange(list)：可以点的东西变了（交给 interact.js）。
// 花园木牌：插在花圃旁边，点开是花园的样子（等级、心意、种子、种花）。
function signpost() {
  const board = paint(128, 96, (c, w, h) => { c.fillStyle = '#e9d9b0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#7d5237'; c.lineWidth = 5; c.beginPath(); c.moveTo(64, 70); c.bezierCurveTo(30, 40, 46, 16, 64, 34); c.bezierCurveTo(82, 16, 98, 40, 64, 70); c.stroke(); });
  const face = picture(.36, .27, board); face.position.set(0, .78, .032);
  const sign = group(cyl(.03, .035, .66, mat('#8a5a3c'), 0, 0, 0, 5), box(.42, .32, .05, mat('#b98a5e'), 0, .62, 0), face, contact(.5, .5, .28, 0, 0, .01));
  sign.position.set(4.45, GRASS, 4.25); sign.rotation.y = .4;
  sign.userData.entry = { label: '花园', garden: true, view: 45 };
  sign.userData.materials = own(sign);
  return sign;
}

// garden：garden.js 的 buildGarden()（要用到里面那棵大树）。onChange(list)：可以点的东西变了（交给 interact.js）。
// decor：屋里的摆设（猫出门那天，坐垫上的猫要不在）。
export function createPlots(scene, garden, onChange, decor) {
  const root = group(), beds = group(); scene.add(root); root.add(beds);
  // 花圃：深色的土 + 一圈石头。已经解锁的才翻好土（锁着时按 1 级显示：纪念花圃 + 第一块）。
  function lay(level) {
    for (const old of [...beds.children]) { beds.remove(old); old.traverse(o => o.geometry?.dispose()); }
    for (const b of bedsFor(level)) {
      const w = b.x[1] - b.x[0], d = b.z[1] - b.z[0], soil = box(w, .06, d, mat(b.id === 'memorial' ? '#5d3d28' : '#6e4a32', { roughness: 1 }), (b.x[0] + b.x[1]) / 2, GRASS - .02, (b.z[0] + b.z[1]) / 2); soil.castShadow = false; beds.add(soil);
      const edge = (x, z, i) => beds.add(ball(.075, mat(i % 2 ? '#cfc4b2' : '#bfb3a0'), x, GRASS + .03, z, 0));
      for (let x = b.x[0], i = 0; x <= b.x[1] + .01; x += .22, i++) { edge(x, b.z[0] - .04, i); edge(x, b.z[1] + .04, i + 1); }
      for (let z = b.z[0] + .22, i = 0; z < b.z[1] - .01; z += .22, i++) { edge(b.x[0] - .04, z, i); edge(b.x[1] + .04, z, i + 1); }
    }
  }
  lay(1);
  const tree = garden.userData.tree, growing = group(), sign = signpost(); root.add(growing, sign);
  // 浇过水的微光：一小团慢慢浮动的亮点。
  const sparkle = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: new THREE.Color(2.4, 2.6, 1.8), size: .05, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  sparkle.frustumCulled = false; sparkle.renderOrder = 5; root.add(sparkle);
  let data = null, dormant = false, things = [], lit = [], pour = null, guest = null;

  function rebuild() {
    for (const old of [...growing.children]) { growing.remove(old); old.traverse(o => o.geometry?.dispose()); }
    things = [sign]; guest = null; tree.scale.setScalar(1); delete tree.userData.entry; delete tree.userData.baseScale;
    const level = data ? levelOf(data) : 1; lay(level);
    if (data) {
      for (const plant of [...memorialPlants(data), ...gardenPlants(data)]) {
        const model = plantModel(plant, dormant); model.position.set(plant.at[0], TOP, plant.at[1]); model.rotation.y = (plant.at[0] * 7 + plant.at[1] * 3) % .6 - .3;
        model.userData.entry = { label: plant.title, plant, view: 45 }; model.userData.materials = own(model); growing.add(model); things.push(model);
      }
      for (const key of decorFor(level)) growing.add(EXTRA[key]());
      // 今天的访客：站在它今天的位置，点它看看它带没带种子。
      const visitor = visitorOf(data), animal = animalModel(visitor.kind);
      animal.position.set(visitor.at[0], GRASS, visitor.at[1]); animal.rotation.y = Math.PI / 4 + Math.sin(visitor.at[0] * 3) * .5;      // 大致朝着默认镜头，脸看得见
      animal.scale.setScalar(1.7);                                 // 比真实比例大一些，全景里也认得出来
      animal.userData = { ground: GRASS, turn: animal.rotation.y, size: 1.7, baseScale: 1.7, kind: visitor.kind, entry: { label: visitor.name, visitor, view: 45 } };
      animal.userData.materials = own(animal); growing.add(animal); things.push(animal); guest = animal;
      const since = data.days?.since;
      if (since) {
        const days = dayCount(since), years = Math.max(0, Math.floor((days - 1) / 365));
        tree.userData.baseScale = 1 + Math.min(years, 5) * .07; tree.scale.setScalar(tree.userData.baseScale);
        tree.userData.entry = { label: '我们的树', view: 45, plant: { id: 'tree', title: '我们的树', date: since, days, years, stage: 'tree', note: years ? `已经长大了 ${years} 圈。` : '每满一年，它长大一圈。' } };
        tree.userData.materials = []; things.push(tree);                     // 树叶的颜色跟着季节走，不单独高亮
        for (const key of milestonesOf(days)) growing.add(EXTRA[key]());
      }
    }
    if (decor?.userData.cat) decor.userData.cat.visible = guest?.userData.kind !== 'cat';
    glint(); onChange?.(things);
  }
  // 今天浇过水的那些：算好微光的位置。
  function glint() {
    const wet = wateredToday(data); lit = things.filter(o => wet.has(o.userData.entry.plant?.id));          // 今天有人浇过就有微光
    sparkle.geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(lit.length * 9), 3)); sparkle.visible = lit.length > 0; update(0);
  }
  function update(time) {
    if (guest) idle(guest, guest.userData.kind, time);
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
    get sign() { return sign; },
    update,
  };
}
