// 3D 小屋的入口。main.js 在进入 #/room 时才动态加载这个文件（以及 Three.js），其他页面不受影响。
//
//   config.js    物件 ↔ 模块映射（增删模块改这里）
//   scene.js     渲染器、天空、悬浮地块、小屋
//   garden.js    花园
//   decor.js     不对应模块的摆设
//   objects/     每件可点击的物件一个文件 + 注册表
//   lights.js    灯光与「时刻」预设
//   effects.js   光束、微尘（第 3 阶段：Bloom）
//   view.js      镜头与旋转 / 缩放限制
import * as THREE from './three.js';
import { objects, mood } from './config.js';
import { createStage, buildIsland, buildHouse } from './scene.js';
import { buildGarden } from './garden.js';
import { buildDecor } from './decor.js';
import { placeObjects } from './objects/index.js';
import { createLights } from './lights.js';
import { createEffects } from './effects.js';
import { createView } from './view.js';

export function mountRoom(host) {
  const stage = createStage(host), { renderer, scene, camera } = stage;
  scene.add(buildIsland(), buildHouse(), buildGarden(), buildDecor());
  const placed = placeObjects(scene, objects);
  const lights = createLights(stage, mood);                       // 要在物件之后：灯装在物件留下的灯位上
  const effects = createEffects(scene, lights.sunDirection, matchMedia('(prefers-reduced-motion: reduce)').matches);
  const view = createView(stage, host);
  const clock = new THREE.Clock();

  // 渲染循环：只有「在小屋这一页」并且「标签页可见」时才跑，其余时间完全停下，不耗电。
  let frame = 0, wanted = false;
  const render = () => { view.update(); effects.update(clock.getElapsedTime()); renderer.render(scene, camera); };
  const tick = () => { frame = requestAnimationFrame(tick); render(); };
  const sync = () => { cancelAnimationFrame(frame); frame = 0; if (wanted && !document.hidden) tick(); };
  document.addEventListener('visibilitychange', sync);
  const observer = new ResizeObserver(() => { view.resize(); if (!frame) render(); });
  observer.observe(host);
  render();                                                       // 先画一帧（顺便编译着色器），main.js 再把画布淡入

  return {
    stage, view, placed,
    start() { wanted = true; view.resize(); sync(); },
    stop() { wanted = false; sync(); },
    dispose() {
      wanted = false; sync(); observer.disconnect(); document.removeEventListener('visibilitychange', sync); view.controls.dispose();
      scene.traverse(o => { o.geometry?.dispose(); for (const m of [].concat(o.material ?? [])) { m.map?.dispose(); m.dispose(); } });
      renderer.dispose(); renderer.domElement.remove();
    },
  };
}
