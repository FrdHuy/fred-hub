// 3D 小屋的入口。main.js 在进入 #/room 时才动态加载这个文件（以及 Three.js），其他页面不受影响。
//
//   config.js    物件 ↔ 模块映射（增删模块改这里）
//   scene.js     渲染器、天空、悬浮地块、小屋
//   garden.js    花园
//   decor.js     不对应模块的摆设
//   objects/     每件可点击的物件一个文件 + 注册表
//   lights.js    灯光与「时刻 / 天气」预设（MOODS）
//   weather.js   雨、雪、花瓣、落叶、萤火虫；sky.js 云和云影；moodbar.js 左下角的切换图标
//   effects.js   光束、微尘（第 3 阶段：Bloom）
//   view.js      镜头：旋转 / 缩放限制、推近与拉回
//   cutaway.js   挡住视线的墙自动隐去（所以能转到屋后）
//   interact.js  悬停高亮、名称标签、点击、键盘
//   quality.js   性能档位与自动降级（enter.js 先用它判断要不要加载 3D）
//   enter.js     main.js 调用的入口；flat.js 是没有 WebGL 时的静态版
import * as THREE from './three.js';
import { objects, mood } from './config.js';
import { createStage, buildIsland, buildHouse } from './scene.js';
import { buildGarden, setSeason } from './garden.js';
import { buildDecor } from './decor.js';
import { placeObjects } from './objects/index.js';
import { createLights, MOODS } from './lights.js';
import { createWeather } from './weather.js';
import { createMoodbar } from './moodbar.js';
import { createSky } from './sky.js';
import { createEffects } from './effects.js';
import { createView } from './view.js';
import { createCutaway } from './cutaway.js';
import { createInteract } from './interact.js';
import { detect, createQuality } from './quality.js';

// options：{ open(entry), tint(moduleId), sound(name) }，由 main.js 提供（见 interact.js）。
export function mountRoom(host, options = {}) {
  const stage = createStage(host), { renderer, scene, camera } = stage;
  const house = buildHouse(), decor = buildDecor(), still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const garden = buildGarden();
  scene.add(buildIsland(), house, garden, decor);
  const placed = placeObjects(scene, objects);
  const lights = createLights(stage);                             // 要在物件之后：灯装在物件留下的灯位上
  lights.setMood(mood);
  const weather = createWeather(scene, still), sky = createSky(scene, still);
  const effects = createEffects(stage, lights.sunDirection, still);
  const view = createView(stage, host, still);
  const cutaway = createCutaway(house, decor.userData.onWall, placed);
  const interact = createInteract({ stage, view, placed, host, still, open: () => {}, tint: () => '#100e0c', ...options });
  const clock = new THREE.Clock();

  // 渲染循环：只有「在小屋这一页」并且「标签页可见」时才跑，其余时间完全停下，不耗电。
  let frame = 0, wanted = false;
  const fitCanvas = () => { view.resize(); effects.resize(host.clientWidth || 1, host.clientHeight || 1); };
  // 性能档位：先按设备给一个起点，跑起来之后帧率不够再自动往下降。
  const quality = createQuality(options.quality ?? detect(), { renderer, sun: lights.sun, shadowLamps: lights.shadowLamps, effects: { setBloom: effects.setBloom, setDust(share) { effects.setDust(share); weather.setShare(share); } } }, fitCanvas);
  fitCanvas();
  const render = () => { view.update(); cutaway.update(camera, view.look); interact.update(); const time = clock.getElapsedTime(); effects.update(time); weather.update(time); sky.update(time, camera); effects.render(); };
  let last = 0;
  const tick = now => { frame = requestAnimationFrame(tick); if (last) quality.sample(now - last); last = now; render(); };
  const sync = () => { cancelAnimationFrame(frame); frame = 0; last = 0; quality.rest(); if (wanted && !document.hidden) frame = requestAnimationFrame(tick); };
  document.addEventListener('visibilitychange', sync);
  const observer = new ResizeObserver(() => { fitCanvas(); if (!frame) render(); });
  observer.observe(host);
  // 时刻 / 天气：一条预设管到底——灯和天空（lights）、花园的颜色（garden）、窗口的光束和微尘（effects）、落下来的东西（weather）。
  // 上次选的记在这台设备上；没选过就用 config.js 里的默认值。
  let current = mood;
  try { const saved = localStorage.getItem('fred-room-mood'); if (saved && MOODS[saved]) current = saved; } catch {}
  function applyMood(name) {
    const look = lights.setMood(name); current = name;
    setSeason(garden, house, look.garden); effects.setSun(lights.sunDirection, look.sun.color, look.beam, look.dust); weather.set(look.weather); sky.set(look, lights.sunDirection);
    host.style.background = look.sky[1]; host.style.setProperty('--r3-ink', look.ink ?? '#f6efe2');
    if (!frame) render();
  }
  // 换的时候画面先暗一下再亮起来，像翻过一页。
  let turning = 0;
  const moodbar = createMoodbar(host, MOODS, current, name => {
    try { localStorage.setItem('fred-room-mood', name); } catch {}
    clearTimeout(turning);
    if (still) { applyMood(name); return; }
    host.classList.add('is-turning'); turning = setTimeout(() => { applyMood(name); host.classList.remove('is-turning'); }, 240);
  });
  applyMood(current);
  render();                                                       // 先画一帧（顺便编译着色器），main.js 再把画布淡入

  return {
    stage, view, placed, quality, applyMood,
    // from：来处页面的底色（幕布从这个颜色淡开）。
    start(from) { wanted = true; fitCanvas(); interact.arrive(from); sync(); },
    stop() { wanted = false; sync(); },
    dispose() {
      wanted = false; sync(); clearTimeout(turning); moodbar.dispose(); interact.dispose(); observer.disconnect(); document.removeEventListener('visibilitychange', sync); view.controls.dispose();
      scene.traverse(o => { o.geometry?.dispose(); for (const m of [].concat(o.material ?? [])) { m.map?.dispose(); m.dispose(); } });
      effects.dispose(); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
