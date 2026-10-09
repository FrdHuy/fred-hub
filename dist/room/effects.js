// 特效：穿过窗户的光束、光里浮动的微尘、Bloom 辉光。以后的雨、雪、萤火虫也放这里。
// Bloom 和微尘数量可以开关（setBloom / setDust），由 quality.js 按设备性能决定。
import * as THREE from './three.js';
import { EffectComposer, RenderPass, UnrealBloomPass, OutputPass } from './three.js';
import { WINDOW } from './scene.js';
import { rng } from './kit.js';

// 辉光强度 / 扩散半径 / 亮度阈值。阈值按「线性亮度」算：只有灯泡、灯罩、屏幕和最亮的那片阳光会溢出光晕，草地和墙不会发灰。
const BLOOM = { strength: .42, radius: .75, threshold: 1.7 };

export function createEffects({ renderer, scene, camera }, sunDirection, still = false) {
  const ray = sunDirection.clone().negate(), { x, z0, z1, y0, y1 } = WINDOW, random = rng(8);
  // 窗上一点顺着阳光走到地板的落点。
  const land = p => p.clone().addScaledVector(ray, p.y / -ray.y);
  // 光束：每格窗一片半透明的斜棱柱，靠窗亮、落地处淡；叠加混合，不写深度。
  const positions = [], colors = [], panes = 3, gap = .06, width = (z1 - z0) / panes;
  for (let i = 0; i < panes; i++) {
    const a = z0 + i * width + gap, b = z0 + (i + 1) * width - gap;
    const [A, B, C, D] = [[y0, a], [y0, b], [y1, b], [y1, a]].map(([y, z]) => new THREE.Vector3(x, y, z)), [A2, B2, C2, D2] = [A, B, C, D].map(land);
    for (const [p, q, q2, p2] of [[D, C, C2, D2], [A, B, B2, A2], [A, D, D2, A2], [B, C, C2, B2]]) {
      for (const v of [p, q, q2, p, q2, p2]) { positions.push(v.x, v.y, v.z); const near = v.x === x ? 1 : .18; colors.push(near, near, near); }
    }
  }
  const beamGeometry = new THREE.BufferGeometry();
  beamGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); beamGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const beam = new THREE.Mesh(beamGeometry, new THREE.MeshBasicMaterial({ color: '#ffbf80', vertexColors: true, transparent: true, opacity: .06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  beam.renderOrder = 3; scene.add(beam);

  // 微尘：只在光束里看得见。每一粒记住自己在窗上的位置和沿光线走了多远，慢慢飘。
  const count = 110, motes = Array.from({ length: count }, () => ({ y: y0 + random() * (y1 - y0), z: z0 + random() * (z1 - z0), along: random(), speed: .006 + random() * .012, phase: random() * 6.28 }));
  const dustGeometry = new THREE.BufferGeometry(); dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
  const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: '#ffe3b5', size: .035, transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  dust.renderOrder = 4; dust.frustumCulled = false; scene.add(dust);
  const point = new THREE.Vector3();
  function update(time) {
    const array = dustGeometry.attributes.position.array;
    motes.forEach((m, i) => {
      const along = (m.along + time * m.speed) % 1, reach = m.y / -ray.y;
      point.set(x, m.y, m.z).addScaledVector(ray, reach * along);
      array[i * 3] = point.x + Math.sin(time * .3 + m.phase) * .04; array[i * 3 + 1] = point.y + Math.sin(time * .22 + m.phase * 2) * .05; array[i * 3 + 2] = point.z + Math.cos(time * .27 + m.phase) * .04;
    });
    dustGeometry.attributes.position.needsUpdate = true;
  }
  update(0);

  // Bloom：场景先画进一张半浮点（HDR）的离屏画布，提取高亮部分模糊后叠回去，最后统一做 ACES 色调映射。
  // 用到时才创建；关闭时直接 renderer.render，一点额外开销都没有。
  let composer = null, bloom = false;
  function setBloom(on) {
    bloom = on;
    if (!on || composer) return;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 }));   // samples：离屏画布也要抗锯齿
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(size, BLOOM.strength, BLOOM.radius, BLOOM.threshold));
    composer.addPass(new OutputPass());
  }
  return {
    update: still ? () => {} : update,                 // prefers-reduced-motion：微尘停在原地
    render() { if (bloom) composer.render(); else renderer.render(scene, camera); },
    resize(width, height) { if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(width, height); } },
    setBloom, setDust(share) { dustGeometry.setDrawRange(0, Math.round(count * share)); },
    dispose() { composer?.dispose(); },
  };
}
