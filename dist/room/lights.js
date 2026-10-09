// 灯光。所有随「时刻」变化的东西都收在 MOODS 这张表里：天空、雾、太阳、天光、每盏灯的亮度、曝光。
// 以后做昼夜 / 天气：往 MOODS 加一条预设（比如 night、rain），再在预设之间做插值即可，场景和物件都不用改。
import * as THREE from './three.js';
import { skyTexture } from './scene.js';

export const MOODS = {
  // 傍晚黄金时刻：太阳低低地从左后方照来，穿过窗户在地板上拉出长长的窗格；屋里的灯刚点亮；背光面由偏冷的天光补上。
  golden: {
    sky: ['#2f3a5c', '#8d6f8c', '#f2b483'], skyGlow: 'rgba(255,196,128,.55)',
    fog: ['#e2a988', .011],
    sun: { from: [-1, .6, -.25], color: '#ffb066', intensity: 5.2 },
    hemisphere: { sky: '#9fb4ea', ground: '#9a7350', intensity: .85 },
    fill: { from: [1, .7, 1], color: '#c3cbee', intensity: .55 },          // 镜头这一侧一点点冷补光，暗部不至于死黑
    lamps: 1, exposure: 1.1,
  },
};

// 每个灯位（物件里名为 light:<名字> 的空节点）装什么灯。只有太阳、台灯、落地灯投影——阴影是最贵的效果，省着用。
const LAMPS = {
  desk: { kind: 'spot', color: '#ffb866', intensity: 14, distance: 4.5, angle: .85, penumbra: .8, shadow: 512 },
  floor: { kind: 'point', color: '#ffb468', intensity: 9, distance: 8, shadow: 512 },
  fairy: { kind: 'point', color: '#ffc47a', intensity: 3.2, distance: 6 },
  tv: { kind: 'point', color: '#ffb48a', intensity: 1.3, distance: 3 },
  screen: { kind: 'point', color: '#9fc0ff', intensity: .9, distance: 2.4 },
  lantern: { kind: 'point', color: '#ffbd72', intensity: 4, distance: 6 },
};

export function createLights({ renderer, scene }, name) {
  const mood = MOODS[name] ?? MOODS.golden;
  scene.background = skyTexture(mood.sky, mood.skyGlow);
  scene.fog = new THREE.FogExp2(mood.fog[0], mood.fog[1]);                 // 轻微的雾：远处的花园略微发灰发暖，拉开前后层次
  scene.fog.userData = { density: mood.fog[1] };
  renderer.toneMappingExposure = mood.exposure;

  scene.add(new THREE.HemisphereLight(mood.hemisphere.sky, mood.hemisphere.ground, mood.hemisphere.intensity));
  const fill = new THREE.DirectionalLight(mood.fill.color, mood.fill.intensity); fill.position.set(...mood.fill.from).multiplyScalar(20); scene.add(fill);

  // 太阳：平行光 + 一张覆盖整块地的阴影贴图。
  const sunDirection = new THREE.Vector3(...mood.sun.from).normalize(), center = new THREE.Vector3(.8, 0, .8);
  const sun = new THREE.DirectionalLight(mood.sun.color, mood.sun.intensity);
  sun.position.copy(center).addScaledVector(sunDirection, 30); sun.target.position.copy(center);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0004; sun.shadow.normalBias = .035;
  Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 5, far: 60 });
  scene.add(sun, sun.target);

  // 室内外的灯：找到每个灯位，装上对应的灯。
  const lamps = [];
  scene.traverse(node => { if (node.name.startsWith('light:')) lamps.push(node); });
  for (const node of lamps) {
    const spec = LAMPS[node.name.slice(6)]; if (!spec) continue;
    const light = spec.kind === 'spot' ? new THREE.SpotLight(spec.color, spec.intensity * mood.lamps, spec.distance, spec.angle, spec.penumbra, 2) : new THREE.PointLight(spec.color, spec.intensity * mood.lamps, spec.distance, 2);
    if (spec.kind === 'spot') { light.target.position.set(.05, -1, .12); node.add(light.target); }     // 朝下偏向桌面中间
    if (spec.shadow) { light.castShadow = true; light.shadow.mapSize.set(spec.shadow, spec.shadow); light.shadow.bias = -.003; light.shadow.normalBias = .03; if (spec.kind === 'point') { light.shadow.camera.near = .2; light.shadow.camera.far = spec.distance; } }
    node.add(light);
  }
  return { mood, sun, sunDirection };
}
