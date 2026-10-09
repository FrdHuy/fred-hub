// 全场景唯一的 Three.js 入口：版本固定为 0.170.0，文件自托管在 dist/vendor/（见 scripts/vendor-three.mjs）。
// 所有文件都从这里导入，保证浏览器里只有一份 three 实例；升级版本只改这两行路径。
export * from '../vendor/three-0.170.0/three.module.min.js';
export { OrbitControls } from '../vendor/three-0.170.0/addons/controls/OrbitControls.js';
