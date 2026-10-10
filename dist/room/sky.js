// 天上的东西：云。
//   · 低处的几朵绕着地块慢慢转——地块像是浮在云层上面；
//   · 高处的一朵挡在太阳和花园之间，它的影子会慢慢扫过草地（这是白天「光在动」的来源）。
// 高处的云如果转到了镜头和小屋之间，会自动淡掉，不挡视线（淡掉后照样投影）。
import * as THREE from './three.js';
import { ball, group, tone, own, fade, rng } from './kit.js';

const LOW = 5, CENTER = new THREE.Vector3(.8, 0, .8);

function cloud(random, material, size) {
  const c = group();
  for (const [x, y, z, r] of [[0, 0, 0, 1.25], [1.35, -.1, .2, .95], [-1.3, -.12, -.15, 1.0], [.4, .35, -.5, .9], [-.3, .1, .75, .8]]) {
    const puff = ball(r * size, material, x * size, y * size, z * size, 1); puff.scale.y = .58; puff.rotation.y = random() * 6; puff.receiveShadow = false; c.add(puff);
  }
  return c;
}

export function createSky(scene, still = false) {
  const random = rng(19), white = tone('cloud', '#ffffff', { roughness: 1, emissive: '#ffffff', emissiveIntensity: .32 });   // 自己带一点亮度：背光的一面不发灰
  // 低处的云：不投影，位置低于草地，绕地块中心缓缓公转。
  const low = Array.from({ length: LOW }, (_, i) => {
    const c = cloud(random, white, 1.1 + random() * .7); c.traverse(o => { o.castShadow = false; });
    c.userData = { angle: i / LOW * Math.PI * 2 + random(), radius: 12.5 + random() * 4, height: -5.2 + random() * 3.4, speed: .012 + random() * .01 };
    c.rotation.y = random() * 6; scene.add(c); return c;
  });
  // 高处的云：一朵投影（沿着太阳方向放在花园上空），一朵只是点缀。
  const shade = cloud(random, white, 1.25), far = cloud(random, white, 1.5);
  far.traverse(o => { o.castShadow = false; });
  const high = [shade, far].map(c => { scene.add(c); return { cloud: c, materials: own(c), shown: -1 }; });
  const sun = new THREE.Vector3(0, 1, 0), spot = new THREE.Vector3();
  let count = 0;

  // look：预设里的 clouds（几朵低云，0 = 没有云）和 cloud（云的颜色）；sunDirection：主光方向。
  function set(look, sunDirection) {
    count = look.clouds ?? 0; sun.copy(sunDirection);
    low.forEach((c, i) => { c.visible = i < count; });
    for (const h of high) { h.cloud.visible = count > 0; for (const m of h.materials) { m.color.set(look.cloud ?? '#ffffff'); m.emissive.copy(m.color); } }
    white.color.set(look.cloud ?? '#ffffff'); white.emissive.copy(white.color);
    update(0);
  }
  function update(time, camera) {
    if (!count) return;
    for (const c of low) { const u = c.userData, a = u.angle + time * u.speed; c.position.set(CENTER.x + Math.cos(a) * u.radius, u.height, CENTER.z + Math.sin(a) * u.radius); }
    // 影子落点从花园左边慢慢走到右边（约一分钟一趟），云在落点沿太阳方向往上 15 的地方。
    spot.set(-4 + (time * .22) % 15, 0, 5.4); shade.position.copy(spot).addScaledVector(sun, 15);
    far.position.set(-10 + Math.sin(time * .02) * 3, 7.5, -11 + Math.cos(time * .017) * 2);
    if (!camera) return;
    const cx = camera.position.x - CENTER.x, cz = camera.position.z - CENTER.z, length = Math.hypot(cx, cz) || 1;
    for (const h of high) {
      const px = h.cloud.position.x - CENTER.x, pz = h.cloud.position.z - CENTER.z, side = (px * cx + pz * cz) / (length * (Math.hypot(px, pz) || 1));   // > 0：云在镜头这一侧
      const k = 1 - Math.min(1, Math.max(0, (side - .05) / .35));
      if (Math.abs(k - h.shown) > .01) { h.shown = k; fade(h.materials, k); }
    }
  }
  return { set, update: (time, camera) => update(still ? 0 : time, camera) };   // prefers-reduced-motion：云不动
}
