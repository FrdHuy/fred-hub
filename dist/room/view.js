// 镜头：等距视角的初始机位 + 受限的 OrbitControls。
// 限制的目的：永远只能从「被切开」的那一侧看，转不到墙背后，也推不进墙里、拉不到看不清。
import * as THREE from './three.js';
import { OrbitControls } from './three.js';

const TARGET = new THREE.Vector3(1.2, -.25, 1.2);            // 看向地块中心偏小屋一点
const HOME = { azimuth: 45, polar: 59 };                    // 初始方位：正对两面后墙的夹角，俯角约 31°
const LIMIT = { azimuth: 34, polarMin: 40, polarMax: 73 };  // 左右各转 34°；俯仰 40°–73°（再低就看到地块底下了）
const rad = degrees => degrees * Math.PI / 180;

export function createView({ camera, scene, renderer }, host) {
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(TARGET);
  controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = .08; controls.rotateSpeed = .45; controls.zoomSpeed = .7;
  controls.minAzimuthAngle = rad(HOME.azimuth - LIMIT.azimuth); controls.maxAzimuthAngle = rad(HOME.azimuth + LIMIT.azimuth);
  controls.minPolarAngle = rad(LIMIT.polarMin); controls.maxPolarAngle = rad(LIMIT.polarMax);
  let fit = 0;
  // 让整块地正好放进画面：宽屏由高度决定，竖屏（手机）由宽度决定。
  function resize() {
    const width = host.clientWidth || 1, height = host.clientHeight || 1, previous = fit;
    renderer.setSize(width, height, false); camera.aspect = width / height;
    const vertical = Math.tan(rad(camera.fov / 2));
    fit = Math.max(7.3 / vertical, 8.6 / (vertical * camera.aspect));
    controls.minDistance = fit * .45; controls.maxDistance = fit * 1.12;
    const offset = camera.position.clone().sub(controls.target);
    if (previous) offset.multiplyScalar(fit / previous);                 // 窗口变了：保持当前的缩放比例
    else offset.setFromSphericalCoords(fit, rad(HOME.polar), rad(HOME.azimuth));
    camera.position.copy(controls.target).add(offset); camera.near = fit * .1; camera.far = fit * 3; camera.updateProjectionMatrix();
    if (scene.fog) scene.fog.density = scene.fog.userData.density * 31 / fit;   // 机位越远雾越淡，手机上不会一片灰
    controls.update();
  }
  resize();
  return { controls, resize, update: () => controls.update(), home: { target: TARGET, ...HOME }, get fit() { return fit; } };
}
