// 镜头：等距视角的初始机位 + OrbitControls（可以绕小屋转一整圈；挡住视线的墙由 cutaway.js 隐去），
// 以及点击物件时的「推近 / 拉回」缓动。
import * as THREE from './three.js';
import { OrbitControls } from './three.js';

const TARGET = new THREE.Vector3(.7, -.25, .7);             // 全景时看向地块中心
const HOME = { azimuth: 45, polar: 59 };                    // 初始方位：正对西墙和北墙的夹角，俯角约 31°
const LIMIT = { polarMin: 40, polarMax: 73 };               // 俯仰 40°–73°：再高成了平面图，再低就看到地块底下了
const rad = degrees => degrees * Math.PI / 180;
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;     // 缓入缓出

export function createView({ camera, scene, renderer }, host, still = false) {
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(TARGET);
  controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = .08; controls.rotateSpeed = .45; controls.zoomSpeed = .7;
  controls.minPolarAngle = rad(LIMIT.polarMin); controls.maxPolarAngle = rad(LIMIT.polarMax);
  const look = TARGET.clone(), spherical = new THREE.Spherical();
  let fit = 0, flight = null, saved = null;                 // saved：推近之前的全景机位（非空 = 正处在特写里，控制器停用）

  // 机位用「看向哪里 + 方位角 + 俯仰角 + 距离」描述；在两个机位之间插值时镜头走的是一段弧线，不是直线穿过去。
  const pose = () => { spherical.setFromVector3(camera.position.clone().sub(look)); return { target: look.clone(), azimuth: spherical.theta, polar: spherical.phi, distance: spherical.radius }; };
  function place(p) { look.copy(p.target); camera.position.setFromSphericalCoords(p.distance, p.polar, p.azimuth).add(look); camera.lookAt(look); }
  function fly(to, ms) {
    flight?.done();
    if (still || !ms) { place(to); return Promise.resolve(); }             // 减少动态效果：直接到位
    const from = pose(), turn = ((to.azimuth - from.azimuth + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;   // 走近的那一边
    return new Promise(done => { flight = { from, to, turn, ms, start: performance.now(), done }; });
  }
  function update() {
    if (flight) {
      const { from, to, turn, ms, start, done } = flight, t = Math.min(1, (performance.now() - start) / ms), e = ease(t);
      place({ target: from.target.clone().lerp(to.target, e), azimuth: from.azimuth + turn * e, polar: from.polar + (to.polar - from.polar) * e, distance: from.distance + (to.distance - from.distance) * e });
      if (t >= 1) { flight = null; done(); }
    } else if (!saved) controls.update();
  }
  // 推近到一个物件：center / radius 是它的包围球，azimuth 是从哪个方向看它。
  function closeUp(center, radius, azimuth) {
    saved ??= pose(); controls.enabled = false;
    const distance = Math.min(fit * .8, Math.max(radius * 6.5, 5.5) * Math.max(1, .9 / camera.aspect));
    return fly({ target: center, azimuth, polar: rad(64), distance }, 950);
  }
  // 拉回全景（回到推近前用户自己转到的角度），然后把镜头交还给 OrbitControls。
  function back(ms = 900) {
    if (!saved) return Promise.resolve();
    const home = saved;
    return fly(home, ms).then(() => { if (saved !== home) return; saved = null; look.copy(TARGET); controls.target.copy(TARGET); controls.enabled = true; controls.update(); });
  }
  // 让整块地正好放进画面：宽屏由高度决定，竖屏（手机）由宽度决定。
  function resize() {
    const width = host.clientWidth || 1, height = host.clientHeight || 1, previous = fit;
    renderer.setSize(width, height, false); camera.aspect = width / height;
    const vertical = Math.tan(rad(camera.fov / 2));
    fit = Math.max(8 / vertical, 9.4 / (vertical * camera.aspect));
    controls.minDistance = fit * .42; controls.maxDistance = fit * 1.12;
    camera.near = 1; camera.far = fit * 3; camera.updateProjectionMatrix();
    if (scene.fog) scene.fog.density = scene.fog.userData.density * 31 / fit;   // 机位越远雾越淡，手机上不会一片灰
    if (saved || flight) { if (saved && previous) saved.distance *= fit / previous; return; }
    const offset = camera.position.clone().sub(controls.target);
    if (previous) offset.multiplyScalar(fit / previous);                 // 窗口变了：保持当前的缩放比例
    else offset.setFromSphericalCoords(fit, rad(HOME.polar), rad(HOME.azimuth));
    camera.position.copy(controls.target).add(offset); controls.update();
  }
  resize();
  return { controls, look, resize, update, closeUp, back, get fit() { return fit; }, get close() { return !!saved; } };
}
