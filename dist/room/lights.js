// 灯光与「时刻 / 天气」。所有随它变化的东西都收在 MOODS 这张表里：天空、雾、太阳（或月亮）、天光、
// 室内灯的亮度、曝光、花园的颜色、飘落的东西。加一种新天气 = 往表里加一条，再在 moodbar.js 里给它一个图标。
import * as THREE from './three.js';
import { skyTexture } from './scene.js';

const GREEN = ['#7fae52', '#95bd60', '#6c9c4a', '#a6c86c'];
// 每条预设：
//   label     名字（读屏和提示用）；ink 角落图标的颜色（天空底部很亮的预设要写一个深色，不写 = 暖白）
//   sky       天空渐变：顶 / 中 / 底；skyGlow 是太阳那一侧的一团光
//   fog       [颜色, 浓度]
//   sun       主光：from 是它所在的方向（始终从西墙那扇窗照进来，只改高度）、颜色、强度
//   hemisphere / fill  天光与镜头一侧的补光（决定暗部的颜色）
//   lamps     室内外灯的亮度倍数（白天调低，夜里调高）
//   beam      窗口光束的浓度（0 = 没有）；dust 光里微尘的多少（0–1）
//   garden    花园：草、树、灌木、草丛的颜色；flowers 开花的比例；litter [颜色, 比例] 地上的落花 / 落叶；
//             stone 石头的颜色（不写 = 原色）；wet 湿润反光；snow 积雪
//   weather   飘落的东西：'rain' | 'snow' | 'petals' | 'leaves' | null（见 weather.js）
export const MOODS = {
  // 傍晚黄金时刻：太阳低低地从左后方照来，在地板上拉出长长的窗格；屋里的灯刚点亮；暗部由偏冷的天光补上。
  golden: {
    label: '傍晚', ink: '#5e4d58', sky: ['#2f3a5c', '#8d6f8c', '#f2b483'], skyGlow: 'rgba(255,196,128,.55)', fog: ['#e2a988', .011],
    sun: { from: [-1, .6, -.25], color: '#ffb066', intensity: 5.2 },
    hemisphere: { sky: '#9fb4ea', ground: '#9a7350', intensity: .85 }, fill: { color: '#c3cbee', intensity: .55 },
    lamps: 1, exposure: 1.1, beam: .06, dust: 1, weather: null,
    garden: { grass: '#9cc462', tree: GREEN, bush: GREEN, tuft: '#ffffff', flowers: 1 },
  },
  // 春：明亮柔和的上午，树开满粉色的花，花瓣慢慢飘落。
  spring: {
    label: '春', ink: '#56617a', sky: ['#6fa9de', '#bfdcf1', '#fde6ee'], skyGlow: 'rgba(255,244,226,.5)', fog: ['#eef3f4', .008],
    sun: { from: [-1, .85, -.25], color: '#fff0d6', intensity: 4.3 },
    hemisphere: { sky: '#bcd9f5', ground: '#a9b98c', intensity: .95 }, fill: { color: '#e2eaf6', intensity: .5 },
    lamps: .3, exposure: .98, beam: .04, dust: .6, weather: 'petals',
    garden: { grass: '#a6d36a', tree: ['#f6b6cd', '#fad0e0', '#f09dbf', '#fbe2ec'], bush: ['#8fc35a', '#a3d06b', '#7bb450', '#b5da7c'], tuft: '#ffffff', flowers: 1, litter: ['#f8c9da', .7] },
  },
  // 夏：正午的蓝天，太阳高，影子短，一切都很绿。
  summer: {
    label: '夏', ink: '#4a5870', sky: ['#2b78cc', '#77b8ec', '#d6edfb'], skyGlow: 'rgba(255,255,240,.45)', fog: ['#dcedf9', .006],
    sun: { from: [-1, 1.25, -.25], color: '#fff5e2', intensity: 4.6 },
    hemisphere: { sky: '#a9d2ff', ground: '#9db57c', intensity: 1 }, fill: { color: '#e6f0ff', intensity: .5 },
    lamps: .15, exposure: .95, beam: .03, dust: .4, weather: null,
    garden: { grass: '#7cc04c', tree: ['#4f9a3c', '#63ad46', '#3f8a36', '#76bb52'], bush: ['#5aa340', '#6fb54c', '#4a9238', '#82c35a'], tuft: '#e8f7d8', flowers: .8 },
  },
  // 秋：比傍晚更橙的斜阳，树是红的黄的，地上铺着落叶，花只剩零星几朵。
  autumn: {
    label: '秋', ink: '#5e4d58', sky: ['#465680', '#c58c72', '#f6c88a'], skyGlow: 'rgba(255,170,92,.6)', fog: ['#e8b98a', .014],
    sun: { from: [-1, .5, -.25], color: '#ff9d52', intensity: 5 },
    hemisphere: { sky: '#a9b4d8', ground: '#9a6a40', intensity: .8 }, fill: { color: '#c9c0d8', intensity: .5 },
    lamps: 1, exposure: 1.08, beam: .07, dust: 1, weather: 'leaves',
    garden: { grass: '#b9ad5c', tree: ['#d9792b', '#e8a53a', '#c4532a', '#e6bf4c'], bush: ['#b98a3c', '#c9a04a', '#a5753a', '#d1b05a'], tuft: '#f0dc98', flowers: .22, litter: ['#d8782c', 1] },
  },
  // 冬：阴天里一点淡淡的太阳，到处是雪，屋里的灯显得格外暖。
  winter: {
    label: '冬', ink: '#56617a', sky: ['#6f86a6', '#b4c4d6', '#e6ecf2'], skyGlow: 'rgba(255,236,214,.45)', fog: ['#dde6ef', .007],
    sun: { from: [-1, .55, -.25], color: '#ffdcb8', intensity: 3 },
    hemisphere: { sky: '#b9cbe8', ground: '#93a2b8', intensity: .62 }, fill: { color: '#d3deee', intensity: .3 },
    lamps: 1.15, exposure: 1, beam: .035, dust: .5, weather: 'snow',
    garden: { grass: '#dfe7ef', tree: ['#e3eaf2', '#d5dfe9', '#edf2f7', '#c9d5e1'], bush: ['#e3eaf2', '#d5dfe9', '#edf2f7', '#c9d5e1'], tuft: '#f2f6fa', flowers: 0, stone: '#d9e1ea', snow: true },
  },
  // 雨夜：深蓝的夜，只有月光和屋里的暖灯；雨丝落下，地面湿得反光。
  rain: {
    label: '雨夜', sky: ['#070b16', '#101930', '#1d2843'], skyGlow: null, fog: ['#18223c', .02],
    sun: { from: [-1, 1, -.25], color: '#7f98d0', intensity: .6 },
    hemisphere: { sky: '#3d4d7c', ground: '#1c2030', intensity: .4 }, fill: { color: '#3d4a6e', intensity: .22 },
    lamps: 1.7, exposure: 1.05, beam: 0, dust: 0, weather: 'rain',
    garden: { grass: '#7fa85a', tree: GREEN, bush: GREEN, tuft: '#ffffff', flowers: .7, stone: '#8f8a84', wet: true },
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

export function createLights({ renderer, scene }) {
  scene.fog = new THREE.FogExp2('#ffffff', .01);                           // 轻微的雾：远处的花园略微发灰，拉开前后层次
  scene.fog.userData = { density: .01 };
  const hemisphere = new THREE.HemisphereLight('#ffffff', '#ffffff', 1), fill = new THREE.DirectionalLight('#ffffff', 1);
  fill.position.set(20, 14, 20); scene.add(hemisphere, fill);              // 补光固定在默认镜头这一侧

  // 太阳：平行光 + 一张覆盖整块地的阴影贴图。
  const sunDirection = new THREE.Vector3(), center = new THREE.Vector3(.8, 0, .8), sun = new THREE.DirectionalLight('#ffffff', 1);
  sun.target.position.copy(center);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0004; sun.shadow.normalBias = .035;
  Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 5, far: 60 });
  scene.add(sun, sun.target);

  // 室内外的灯：找到每个灯位，装上对应的灯。
  const nodes = [], lamps = [], shadowLamps = [];
  scene.traverse(node => { if (node.name.startsWith('light:')) nodes.push(node); });
  for (const node of nodes) {
    const spec = LAMPS[node.name.slice(6)]; if (!spec) continue;
    const light = spec.kind === 'spot' ? new THREE.SpotLight(spec.color, spec.intensity, spec.distance, spec.angle, spec.penumbra, 2) : new THREE.PointLight(spec.color, spec.intensity, spec.distance, 2);
    if (spec.kind === 'spot') { light.target.position.set(.05, -1, .12); node.add(light.target); }     // 朝下偏向桌面中间
    if (spec.shadow) { light.castShadow = true; light.shadow.mapSize.set(spec.shadow, spec.shadow); light.shadow.bias = -.003; light.shadow.normalBias = .03; if (spec.kind === 'point') { light.shadow.camera.near = .2; light.shadow.camera.far = spec.distance; } shadowLamps.push(light); }
    node.add(light); lamps.push({ light, base: spec.intensity });
  }

  // 换一个时刻 / 天气：只改灯和天空的数值，场景里的东西都不动。返回这条预设，其余部分（花园、光束、雨雪）由 index.js 接着处理。
  function setMood(name) {
    const mood = MOODS[name] ?? MOODS.golden;
    scene.background?.dispose?.(); scene.background = skyTexture(mood.sky, mood.skyGlow);
    scene.fog.color.set(mood.fog[0]); scene.fog.density *= mood.fog[1] / scene.fog.userData.density; scene.fog.userData.density = mood.fog[1];
    renderer.toneMappingExposure = mood.exposure;
    hemisphere.color.set(mood.hemisphere.sky); hemisphere.groundColor.set(mood.hemisphere.ground); hemisphere.intensity = mood.hemisphere.intensity;
    fill.color.set(mood.fill.color); fill.intensity = mood.fill.intensity;
    sunDirection.set(...mood.sun.from).normalize(); sun.position.copy(center).addScaledVector(sunDirection, 30);
    sun.color.set(mood.sun.color); sun.intensity = mood.sun.intensity;
    for (const lamp of lamps) lamp.light.intensity = lamp.base * mood.lamps;
    return mood;
  }
  return { setMood, sun, sunDirection, shadowLamps };
}
