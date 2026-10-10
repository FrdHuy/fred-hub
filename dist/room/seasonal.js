// 季节专属的摆设：只在某一个时刻 / 天气出现的东西（lights.js 里 MOODS 的名字 → 这里的一组东西）。
//   spring  蝴蝶、晾衣绳上的衣服、栅栏上的小鸟、花坛边的洒水壶和几盆小苗
//   autumn  落叶堆和耙子、门口和长椅上的南瓜、干草垛和稻草人、树下的蘑菇、天上飞过的一队雁
//   winter  雪人、挂彩灯的小松树、栅栏上的一串暖灯和积雪、雪堆、脚印、雪橇、柴堆
//   rain    水洼和涟漪、门口的伞和雨靴、石板上的青蛙、闪电
// 加别的季节的摆设：在 build 里加一个同名函数，返回 { group, update?(time) }。
import * as THREE from './three.js';
import { mat, glow, satin, box, cyl, ball, rod, group, contact, rng, pick, tilt } from './kit.js';
import { GRASS, ISLAND } from './scene.js';

const G = GRASS;
const quietBall = (r, material, x, y, z) => { const b = ball(r, material, x, y, z, 0); b.castShadow = false; return b; };   // 小灯泡：不投影

const build = {
  spring() {
    const random = rng(12), all = group(), moving = [];
    // 蝴蝶：两片会扇动的翅膀，绕着花丛画圈。
    const wingColors = ['#ffe07a', '#ffffff', '#a9d4f5', '#ffb38a', '#f6b6cd'];
    for (const [cx, cz, r] of [[3.9, 1.0, .8], [1.2, 5.2, 1.0], [5.4, 5.0, 1.2], [-2.4, 5.0, 1.3], [5.6, -1.5, 1.0], [2.4, 4.4, .7], [0.6, -4.4, 1.0], [-4.4, 0.6, .9], [4.6, 3.0, .6]]) {
      const color = mat(pick(random, wingColors)), left = group(box(.19, .008, .16, color, .095, 0, 0)), right = group(box(.19, .008, .16, color, -.095, 0, 0)), body = rod(.016, .16, mat('#4a382c'), 0, 0, 0, 'z', 5);
      const butterfly = group(left, right, body); butterfly.traverse(o => { o.castShadow = false; });
      moving.push({ kind: 'butterfly', node: butterfly, left, right, cx, cz, r, height: G + .55 + random() * .7, speed: (.35 + random() * .3) * (random() < .5 ? 1 : -1), phase: random() * 6.28 });
      all.add(butterfly);
    }
    // 晾衣绳：两根杆子、一根绳、几件随风轻摆的衣服。
    const post = mat('#efe6d6'), x = 5.7, z0 = -2.5, z1 = .5, line = group(cyl(.04, .05, 1.7, post, x, G, z0, 6), cyl(.04, .05, 1.7, post, x, G, z1, 6), box(.5, .04, .04, post, x, G + 1.62, z0), box(.5, .04, .04, post, x, G + 1.62, z1),
      rod(.006, z1 - z0, mat('#7d5237'), x, G + 1.6, (z0 + z1) / 2, 'z', 4), contact(.6, .6, .3, x, z0, G + .01), contact(.6, .6, .3, x, z1, G + .01));
    [['#ffffff', .62, .7], ['#f6b6cd', .4, .5], ['#a9d4f5', .5, .62], ['#ffe9a8', .34, .4], ['#ffffff', .55, .75]].forEach(([color, w, h], i) => {
      const cloth = group(box(.012, h, w, mat(color, { roughness: 1, emissive: color, emissiveIntensity: .22 }), 0, -h, 0), box(.03, .05, .03, mat('#d9a05b'), 0, -.04, w * .3), box(.03, .05, .03, mat('#d9a05b'), 0, -.04, -w * .3));
      cloth.position.set(x, G + 1.6, z0 + .42 + i * .56); line.add(cloth); moving.push({ kind: 'cloth', node: cloth, phase: i * 1.3 });
    });
    all.add(line);
    // 栅栏上的小鸟。
    const edge = ISLAND.max - .25;
    for (const [bx, color, turn] of [[4.3, '#f4b860', .4], [4.62, '#8fb6d9', -.3], [5.5, '#f6e7c1', 2.6]]) {
      const bird = group(ball(.075, mat(color), 0, .07, 0, 1), ball(.05, mat(color), .06, .13, 0, 1), tilt(cyl(0, .018, .05, mat('#e08a35'), .115, .105, 0, 4), 0, 0, -Math.PI / 2), tilt(box(.1, .012, .05, mat('#5a4334'), -.09, .07, 0), 0, 0, .5));
      bird.position.set(bx, G + .5, edge); bird.rotation.y = turn; all.add(bird);
    }
    // 花坛边：洒水壶、两盆小苗。
    const can = group(cyl(.11, .12, .2, satin('#9fb6a8'), 0, 0, 0, 10), tilt(cyl(.02, .03, .26, satin('#9fb6a8'), .17, .08, 0, 6), 0, 0, -1), tilt(rod(.012, .2, satin('#9fb6a8'), -.12, .16, 0, 'x', 5), 0, 0, 0), contact(.5, .5, .3, 0, 0, .008));
    can.position.set(4.55, G, 2.2); can.rotation.y = .6; all.add(can);
    for (const [px, pz] of [[4.6, 2.7], [4.85, 2.45]]) all.add(cyl(.08, .06, .1, mat('#c9764f'), px, G, pz, 8), ball(.05, mat('#8fc35a'), px, G + .16, pz, 0), ball(.035, mat('#a3d06b'), px + .04, G + .2, pz + .02, 0));
    return { group: all, update(time) {
      for (const m of moving) {
        if (m.kind === 'cloth') { m.node.rotation.z = Math.sin(time * 1.1 + m.phase) * .12; continue; }
        const a = time * m.speed + m.phase, flap = Math.abs(Math.sin(time * 9 + m.phase)) * 1.1;
        m.node.position.set(m.cx + Math.cos(a) * m.r, m.height + Math.sin(time * 1.7 + m.phase) * .18, m.cz + Math.sin(a) * m.r * .8);
        m.node.rotation.y = -a + (m.speed > 0 ? 0 : Math.PI); m.left.rotation.z = flap; m.right.rotation.z = -flap;
      }
    } };
  },

  autumn() {
    const random = rng(23), all = group(), leaves = ['#d9662b', '#eda736', '#c4472a', '#e9c24a', '#b5522a'];
    // 落叶堆 + 靠在旁边的耙子。
    const pile = (x, z, size) => { const p = group(contact(size * 2.6, size * 2.6, .32, 0, 0, .01)); for (let i = 0; i < 9; i++) { const lump = ball(size * (.35 + random() * .3), mat(pick(random, leaves)), (random() - .5) * size * 1.3, size * (.12 + random() * .22), (random() - .5) * size * 1.3, 0); lump.scale.y = .55; lump.rotation.y = random() * 6; p.add(lump); } p.position.set(x, G, z); return p; };
    all.add(pile(3.9, 4.7, .62), pile(-3.6, 3.2, .42));
    const rake = group(cyl(.018, .018, 1.5, mat('#b98a5e'), 0, 0, 0, 5), box(.36, .03, .03, mat('#7d5237'), 0, 0, 0), ...Array.from({ length: 7 }, (_, i) => box(.012, .09, .012, satin('#8f8c86'), -.16 + i * .053, -.08, 0)));
    rake.position.set(4.55, G + .1, 4.3); rake.rotation.set(.1, .5, .38); all.add(rake);
    // 南瓜：门口一堆，长椅上一个。
    const pumpkin = (x, y, z, r, color = '#e8822c') => { const p = group(ball(r, mat(color, { roughness: .6 }), 0, r * .72, 0, 1), cyl(.012, .02, r * .4, mat('#6f7d45'), 0, r * 1.3, 0, 5)); p.children[0].scale.y = .74; p.position.set(x, y, z); p.rotation.y = random() * 6; return p; };
    all.add(pumpkin(1.95, G, 3.75, .22), pumpkin(2.3, G, 3.6, .15, '#f0a03c'), pumpkin(2.12, G, 4.05, .12, '#d96a24'), pumpkin(-1.55, G + .5, 3.72, .13, '#f0a03c'), pumpkin(-.2, G, 4.0, .17), contact(.9, .8, .3, 2.1, 3.8, G + .01));
    // 干草垛 + 稻草人。
    const hay = mat('#e3c069', { roughness: 1 }), bales = group(box(.8, .42, .5, hay, 0, 0, 0), tilt(box(.8, .42, .5, hay, .7, 0, .25), 0, .5, 0), tilt(box(.78, .4, .5, mat('#d9b25a', { roughness: 1 }), .25, .42, .1), 0, -.2, 0), contact(2, 1.5, .34, .35, .1, .01));
    bales.position.set(5.2, G, 1.0); all.add(bales);
    const scarecrow = group(cyl(.035, .04, 1.55, mat('#7d5237'), 0, 0, 0, 5), rod(.03, 1.1, mat('#7d5237'), 0, 1.15, 0, 'x', 5), box(.5, .5, .16, mat('#b5522a', { roughness: 1 }), 0, .78, 0), box(.2, .34, .14, mat('#b5522a', { roughness: 1 }), -.4, .98, 0), box(.2, .34, .14, mat('#b5522a', { roughness: 1 }), .4, .98, 0),
      ball(.15, mat('#e9d29a'), 0, 1.45, 0, 1), cyl(.3, .3, .02, mat('#c99a45'), 0, 1.55, 0, 10), cyl(.12, .16, .16, mat('#c99a45'), 0, 1.57, 0, 8), contact(.8, .8, .3, 0, 0, .01));
    scarecrow.position.set(5.9, G, -1.7); scarecrow.rotation.y = -.7; all.add(scarecrow);
    // 树下的蘑菇。
    for (const [mx, mz, s] of [[-1.5, 5.9, 1], [-1.3, 6.1, .7], [-3.1, 5.0, .8], [-1.75, 6.15, .55]]) all.add(cyl(.03 * s, .04 * s, .1 * s, mat('#f1e5d0'), mx, G, mz, 6), tilt(cyl(.02 * s, .1 * s, .07 * s, mat('#c4472a'), mx, G + .09 * s, mz, 7), 0, 0, 0));
    // 一队南飞的雁：远远地从屋后的天上飞过，约一分钟一趟。
    const flock = group(), dark = mat('#4a4658');
    for (let i = 0; i < 7; i++) { const side = i % 2 ? 1 : -1, back = Math.ceil(i / 2), goose = group(tilt(box(.34, .02, .07, dark, .15, 0, 0), 0, .5, 0), tilt(box(.34, .02, .07, dark, -.15, 0, 0), 0, -.5, 0)); goose.position.set(-back * .55, (i % 3) * .05, side * back * .5); goose.traverse(o => { o.castShadow = false; }); flock.add(goose); }
    all.add(flock);
    return { group: all, update(time) {
      const t = (time * .018) % 1; flock.position.set(-16 + t * 34, 8.6 + Math.sin(time * .3) * .2, -10 + t * 3);
      flock.children.forEach((goose, i) => { const flap = Math.sin(time * 5 + i) * .35; goose.children[0].rotation.z = flap; goose.children[1].rotation.z = -flap; });
    } };
  },

  winter() {
    const random = rng(31), all = group(), white = mat('#f4f7fa', { roughness: .9 }), near = ISLAND.max - .25, back = ISLAND.min + .25;
    // 雪人：三个雪球、胡萝卜鼻子、围巾、小桶帽子、树枝手臂。
    const coal = mat('#3a3d38'), snowman = group(contact(1.3, 1.3, .3, 0, 0, .01), ball(.36, white, 0, .3, 0, 1), ball(.27, white, 0, .78, 0, 1), ball(.2, white, 0, 1.14, 0, 1),
      tilt(cyl(0, .035, .16, mat('#e8822c'), 0, 1.07, .26, 5), Math.PI / 2, 0, 0), ball(.022, coal, -.07, 1.2, .18, 0), ball(.022, coal, .07, 1.2, .18, 0), ball(.022, coal, 0, .86, .26, 0), ball(.022, coal, 0, .72, .27, 0),
      cyl(.22, .22, .07, mat('#c4472a', { roughness: 1 }), 0, .93, 0, 10), box(.09, .26, .05, mat('#c4472a', { roughness: 1 }), .13, .7, .2),
      cyl(.13, .15, .18, mat('#5f7f8a'), 0, 1.3, 0, 8), tilt(cyl(.012, .016, .5, mat('#5a4334'), -.42, .62, 0, 4), 0, 0, 1.1), tilt(cyl(.012, .016, .5, mat('#5a4334'), .42, .62, 0, 4), 0, 0, -1.1));
    snowman.position.set(-.1, G, 4.9); snowman.rotation.y = .5; all.add(snowman);
    // 小松树：三层树冠各压着一层雪，挂着彩色小灯，顶上一颗星。
    const pine = group(contact(1.6, 1.6, .3, 0, 0, .01), cyl(.07, .09, .3, mat('#5a4334'), 0, 0, 0, 6));
    [[.62, .75, .25], [.48, .65, .7], [.33, .55, 1.12]].forEach(([r, h, y]) => { const tier = cyl(0, r, h, mat('#3f7a52'), 0, y, 0, 7), cap = cyl(0, r * .72, h * .7, white, 0, y + h * .34, 0, 7); cap.castShadow = false; pine.add(tier, cap); });
    ['#ff6b5e', '#ffd166', '#7fc8ff', '#ff9ec4', '#ffd166', '#ff6b5e', '#7fc8ff', '#ffd166', '#ff9ec4'].forEach((color, i) => { const a = i * 2.3, y = .42 + i * .13, r = .52 - i * .045; pine.add(quietBall(.035, glow(color, 5), Math.cos(a) * r, y, Math.sin(a) * r)); });
    pine.add(quietBall(.07, glow('#ffe08a', 6), 0, 1.72, 0)); pine.position.set(5.4, G, 5.3); all.add(pine);
    // 栅栏上的一串暖色小灯（朝向默认镜头的两条边）+ 栅栏顶的积雪。
    const bulb = glow('#ffd28a', 5);
    for (let p = back + .4; p < near; p += .62) { if (p < .95 || p > 2.1) all.add(quietBall(.03, bulb, p, G + .43 - Math.abs(Math.sin(p * 2.5)) * .05, near + .05)); all.add(quietBall(.03, bulb, near + .05, G + .43 - Math.abs(Math.sin(p * 2.5)) * .05, p)); }
    for (const [from, to, edge, alongX] of [[back, .95, near, true], [2.1, near, near, true], [back, near, near, false], [back, near, back, true], [back, near, back, false]]) {
      const cap = alongX ? box(to - from, .04, .07, white, (from + to) / 2, G + .5, edge) : box(.07, .04, to - from, white, edge, G + .5, (from + to) / 2); cap.castShadow = false; all.add(cap);
    }
    // 雪堆、小径上的一串脚印、雪橇、盖着雪的柴堆。
    for (const [x, z, r] of [[6.2, 6.3, .8], [-4.8, 6.2, .7], [6.4, -4.6, .75], [3.9, 3.9, .5], [-4.6, 3.3, .55], [4.2, -3.9, .5], [-1.0, -4.6, .6]]) { const drift = ball(r, white, x, G - r * .12, z, 1); drift.scale.y = .34; drift.rotation.y = random() * 6; drift.castShadow = false; all.add(drift); }
    [[1.62, 6.5], [1.42, 6.1], [1.56, 5.7], [1.3, 5.3], [1.42, 4.9], [1.14, 4.5], [1.22, 4.1], [.96, 3.75]].forEach(([x, z], i) => { const step = box(.09, .012, .17, mat('#b4c2d4', { roughness: 1 }), x, G + .004, z); step.rotation.y = .25 + (i % 2 ? .12 : -.12); step.castShadow = false; all.add(step); });
    const sled = group(box(.34, .03, .8, mat('#c4472a')), box(.03, .09, .86, mat('#7d5237'), -.14, -.09, 0), box(.03, .09, .86, mat('#7d5237'), .14, -.09, 0), contact(.7, 1.1, .28, 0, 0, -.1));
    sled.position.set(3.25, G + .12, 4.6); sled.rotation.y = -.6; all.add(sled);
    const logs = group(contact(1.3, .7, .3, 0, 0, .01));
    for (let i = 0; i < 9; i++) { const row = i < 4 ? 0 : i < 7 ? 1 : 2, n = i - [0, 4, 7][row]; logs.add(rod(.075, .5, mat(pick(random, ['#8a5a3c', '#9a6a45', '#7d5237'])), -.24 + n * .16 + row * .08, .075 + row * .14, 0, 'z', 7)); }
    const cover = box(.72, .05, .56, white, 0, .42, 0); cover.castShadow = false; logs.add(cover); logs.position.set(2.5, G, 3.55); all.add(logs);
    return { group: all };
  },

  rain(hooks) {
    const random = rng(41), all = group(), rings = [];
    // 水洼：深色、很光滑的一片，会映出灯光；上面一圈圈涟漪不断扩开。
    const water = mat('#4a5f8e', { roughness: .1, metalness: .3, emissive: '#1b2a4c', emissiveIntensity: .9 }), ripple = new THREE.MeshBasicMaterial({ color: '#b9c9ea', transparent: true, opacity: .5, depthWrite: false, fog: false });
    for (const [x, z, r] of [[2.9, 4.7, .62], [.2, 5.6, .5], [4.9, 2.2, .7], [5.6, 5.9, .55], [-3.4, 4.4, .5], [4.6, -2.4, .6], [1.9, 6.2, .38], [-.6, -4.6, .5]]) {
      const pool = cyl(r, r, .012, water, x, G + .002, z, 12); pool.scale.z = .72; pool.rotation.y = random() * 3; pool.castShadow = false; all.add(pool);
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 20), ripple.clone()); ring.rotation.x = -Math.PI / 2; ring.position.set(x + (random() - .5) * r * .9, G + .018, z + (random() - .5) * r * .5);
        all.add(ring); rings.push({ ring, size: .1 + random() * .14, period: .9 + random() * .8, offset: random() });
      }
    }
    // 门口：一把撑开晾着的伞、一双雨靴；小径的石板上蹲着一只青蛙。
    const umbrella = group(cyl(0, .5, .2, mat('#a23a2c', { roughness: .6 }), 0, .62, 0, 8), cyl(.012, .012, .8, satin(), 0, 0, 0, 5), ball(.03, mat('#5a4334'), 0, 0, 0, 0), contact(1.2, 1.2, .3, 0, 0, .01));
    umbrella.position.set(2.2, G + .32, 3.75); umbrella.rotation.set(.95, .4, .25); all.add(umbrella);
    for (const [bx, turn] of [[.05, .2], [-.12, -.15]]) { const boot = group(cyl(.045, .05, .2, mat('#e9b83a', { roughness: .4 }), 0, 0, 0, 7), box(.08, .06, .14, mat('#e9b83a', { roughness: .4 }), 0, 0, .05)); boot.position.set(.55 + bx, G + .08, 3.42); boot.rotation.y = turn; all.add(boot); }
    const frog = group(ball(.07, mat('#6fae4a', { roughness: .4 }), 0, .05, 0, 1), ball(.045, mat('#6fae4a', { roughness: .4 }), 0, .09, .06, 1), ball(.018, mat('#f4f7c8'), -.03, .125, .08, 0), ball(.018, mat('#f4f7c8'), .03, .125, .08, 0));
    frog.children[0].scale.set(1.2, .7, 1.3); frog.position.set(1.36, G + .05, 5.0); frog.rotation.y = .8; all.add(frog);
    // 闪电：隔十来秒亮两下。真正变亮的是灯光（hooks.flash，见 lights.js），这里只管时间。
    let next = 4;
    return { group: all, update(time) {
      for (const r of rings) { const t = (time / r.period + r.offset) % 1; r.ring.scale.setScalar(r.size * (.25 + t)); r.ring.material.opacity = .55 * (1 - t); }
      const since = time - next;
      if (since > .6) { next = time + 7 + random() * 12; hooks.flash?.(0); }
      else if (since >= 0) hooks.flash?.(since < .09 ? 1 : since < .2 ? .12 : since < .3 ? .75 : Math.max(0, .5 - (since - .3) * 1.7));
    }, rest() { hooks.flash?.(0); } };
  },
};

// hooks：{ flash(k) }——闪电时让灯光亮一下（0–1）。
export function createSeasonal(scene, still = false, hooks = {}) {
  const made = {};                                           // 用到哪个季节才造哪个季节的东西
  let current = null;
  function set(name) {
    if (current) { made[current].group.visible = false; made[current].rest?.(); }
    current = build[name] ? name : null; if (!current) return;
    if (!made[name]) { made[name] = build[name](hooks); scene.add(made[name].group); }
    made[name].group.visible = true; made[name].update?.(0);
  }
  return { set, update(time) { if (current && !still) made[current].update?.(time); } };    // prefers-reduced-motion：蝴蝶和衣服不动
}
