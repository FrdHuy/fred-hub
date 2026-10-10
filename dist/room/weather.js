// 天气里会「落下来」或「飞着」的东西：雨丝 + 落地的水花、雪、春天的花瓣、秋天的落叶、夏夜的萤火虫。
// 只落在屋外（屋子被切开了顶，雨雪落进屋里会很怪）。数量会按性能档位打折（setShare）。
import * as THREE from './three.js';
import { paint, rng } from './kit.js';
import { GRASS, ISLAND, ROOM } from './scene.js';

const TOP = 8.5;                                             // 从多高开始落
const KINDS = {
  rain: { streaks: 900, splashes: 150 },
  snow: { flakes: 520, color: '#ffffff', size: .11, fall: .55, sway: .35, opacity: .95 },
  petals: { flakes: 260, color: '#fcd3e2', size: .09, fall: .32, sway: .6, opacity: .95 },
  leaves: { flakes: 190, color: '#e8862e', size: .13, fall: .42, sway: .7, opacity: 1 },
};

export function createWeather(scene, still = false) {
  const random = rng(77), span = ISLAND.max - ISLAND.min;
  // 屋外的一个随机落点。
  const outside = () => { for (;;) { const x = ISLAND.min + random() * span, z = ISLAND.min + random() * span; if (Math.max(Math.abs(x), Math.abs(z)) > ROOM.half + .35) return [x, z]; } };

  // ── 雨：每一滴是一小段斜线，落到地面后从头再来 ──
  const R = KINDS.rain, drops = Array.from({ length: R.streaks }, () => { const [x, z] = outside(); return { x, z, offset: random(), speed: .9 + random() * .5, length: .28 + random() * .22 }; });
  const rainGeometry = new THREE.BufferGeometry(); rainGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(R.streaks * 6), 3));
  const rain = new THREE.LineSegments(rainGeometry, new THREE.LineBasicMaterial({ color: '#a9bfe8', transparent: true, opacity: .32, depthWrite: false, fog: false }));
  // 水花：雨点落地的地方亮一下、跳起一点点。
  const splash = Array.from({ length: R.splashes }, () => { const [x, z] = outside(); return { x, z, offset: random(), period: .5 + random() * .7 }; });
  const dot = paint(32, 32, (c, s) => { const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.6, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, s, s); });
  const splashGeometry = new THREE.BufferGeometry(); splashGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(R.splashes * 3), 3));
  const splashes = new THREE.Points(splashGeometry, new THREE.PointsMaterial({ color: '#cfdcf5', map: dot, size: .11, transparent: true, opacity: .7, depthWrite: false, fog: false }));

  // ── 雪 / 花瓣 / 落叶：同一批飘落的小点，换颜色、大小和速度 ──
  const most = Math.max(KINDS.snow.flakes, KINDS.petals.flakes, KINDS.leaves.flakes);
  const flakes = Array.from({ length: most }, () => { const [x, z] = outside(); return { x, z, offset: random(), speed: .7 + random() * .6, phase: random() * 6.28 }; });
  const flakeGeometry = new THREE.BufferGeometry(); flakeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(most * 3), 3));
  const flakeMaterial = new THREE.PointsMaterial({ map: dot, size: .08, transparent: true, depthWrite: false, fog: false });
  const falling = new THREE.Points(flakeGeometry, flakeMaterial);
  // ── 萤火虫：在花园里低低地游荡，各自一明一灭。亮度写在顶点颜色里；材质颜色大于 1，所以亮起来时会被 Bloom 晕开 ──
  const FLIES = 85, flies = Array.from({ length: FLIES }, () => { const [x, z] = outside(); return { x, z, y: GRASS + .25 + random() * 1.5, phase: random() * 6.28, pace: .25 + random() * .3, blink: .5 + random() * .9 }; });
  const flyGeometry = new THREE.BufferGeometry();
  flyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(FLIES * 3), 3)); flyGeometry.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(FLIES * 3), 3));
  const fireflies = new THREE.Points(flyGeometry, new THREE.PointsMaterial({ map: dot, size: .17, vertexColors: true, color: new THREE.Color(3.2, 3.6, 1.1), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  for (const object of [rain, splashes, falling, fireflies]) { object.frustumCulled = false; object.renderOrder = 5; object.visible = false; scene.add(object); }

  let kind = null, share = 1, wanted = null;
  function apply() {
    kind = wanted; rain.visible = splashes.visible = kind === 'rain'; fireflies.visible = kind === 'fireflies'; falling.visible = !!kind && kind !== 'rain' && kind !== 'fireflies';
    flyGeometry.setDrawRange(0, Math.round(FLIES * share));
    rainGeometry.setDrawRange(0, Math.round(R.streaks * share) * 2); splashGeometry.setDrawRange(0, Math.round(R.splashes * share));
    if (falling.visible) { const k = KINDS[kind]; flakeMaterial.color.set(k.color); flakeMaterial.size = k.size; flakeMaterial.opacity = k.opacity; flakeGeometry.setDrawRange(0, Math.round(k.flakes * share)); }
    update(0);
  }
  function update(time) {
    if (kind === 'rain') {
      const a = rainGeometry.attributes.position.array, b = splashGeometry.attributes.position.array, height = TOP - GRASS;
      drops.forEach((d, i) => {
        const y = TOP - ((d.offset + time * d.speed * 1.5) % 1) * height, lean = (TOP - y) * .06;       // 微微斜着落
        a[i * 6] = d.x + lean; a[i * 6 + 1] = y; a[i * 6 + 2] = d.z; a[i * 6 + 3] = d.x + lean + d.length * .06; a[i * 6 + 4] = y - d.length; a[i * 6 + 5] = d.z;
      });
      splash.forEach((s, i) => {
        const t = ((time / s.period + s.offset) % 1) / .3;                                              // 每个周期只有前三成时间看得见
        b[i * 3] = s.x; b[i * 3 + 1] = t < 1 ? GRASS + .03 + Math.sin(t * Math.PI) * .1 : -99; b[i * 3 + 2] = s.z;
      });
      rainGeometry.attributes.position.needsUpdate = splashGeometry.attributes.position.needsUpdate = true;
    } else if (kind === 'fireflies') {
      const a = flyGeometry.attributes.position.array, c = flyGeometry.attributes.color.array;
      flies.forEach((f, i) => {
        a[i * 3] = f.x + Math.sin(time * f.pace + f.phase) * .9; a[i * 3 + 1] = f.y + Math.sin(time * f.pace * 1.7 + f.phase * 2) * .22; a[i * 3 + 2] = f.z + Math.cos(time * f.pace * .8 + f.phase) * .9;
        const glow = Math.max(0, Math.sin(time * f.blink + f.phase * 3)) ** 2;                          // 大半时间是暗的，亮起来很短
        c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = glow;
      });
      flyGeometry.attributes.position.needsUpdate = flyGeometry.attributes.color.needsUpdate = true;
    } else if (kind) {
      const k = KINDS[kind], a = flakeGeometry.attributes.position.array, height = TOP - GRASS;
      flakes.forEach((f, i) => {
        const fall = (f.offset + time * f.speed * k.fall / height) % 1;
        a[i * 3] = f.x + Math.sin(time * .6 + f.phase) * k.sway; a[i * 3 + 1] = TOP - fall * height; a[i * 3 + 2] = f.z + Math.cos(time * .45 + f.phase * 1.7) * k.sway * .7;
      });
      flakeGeometry.attributes.position.needsUpdate = true;
    }
  }
  return {
    set(next) { wanted = next; apply(); },
    setShare(next) { share = next; apply(); },
    update: time => { if (!still) update(time); },          // prefers-reduced-motion：停在半空，不动（萤火虫停在 apply 时的那一刻）
  };
}
