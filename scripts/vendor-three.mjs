// 把固定版本的 Three.js 下载到 dist/vendor/，网站运行时不请求任何第三方源。
// 用法：node scripts/vendor-three.mjs        （源：registry.npmmirror.com，国内可访问）
// 升级版本：改下面的 VERSION，重新运行，再改 dist/room/three.js 里的路径。
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, posix } from 'node:path';

const VERSION = '0.170.0';
const SOURCE = `https://registry.npmmirror.com/three/${VERSION}/files`;
const TARGET = new URL(`../dist/vendor/three-${VERSION}/`, import.meta.url);
const CORE = 'three.module.min.js';

// [包内路径, 本地路径]。addons 只取场景用到的：镜头控制 + 后期辉光链。
const FILES = [
  ['build/three.module.min.js', CORE],
  ['LICENSE', 'LICENSE'],
  ...[
    'controls/OrbitControls.js',
    'postprocessing/EffectComposer.js', 'postprocessing/Pass.js', 'postprocessing/RenderPass.js', 'postprocessing/ShaderPass.js',
    'postprocessing/MaskPass.js', 'postprocessing/UnrealBloomPass.js', 'postprocessing/OutputPass.js',
    'shaders/CopyShader.js', 'shaders/LuminosityHighPassShader.js', 'shaders/OutputShader.js',
  ].map(path => [`examples/jsm/${path}`, `addons/${path}`]),
];

for (const [from, to] of FILES) {
  const response = await fetch(`${SOURCE}/${from}`);
  if (!response.ok) throw new Error(`${from}: HTTP ${response.status}`);
  let body = await response.text();
  // addons 里写的是裸模块名 'three'，浏览器不认识；改成指向本地核心文件的相对路径（不用 importmap）。
  if (to.startsWith('addons/')) body = body.replaceAll(/from\s+'three'/g, `from '${posix.relative(posix.dirname(to), CORE)}'`);
  const file = new URL(to, TARGET);
  await mkdir(dirname(file.pathname), { recursive: true });
  await writeFile(file, body);
  console.log(`${to}  ${(body.length / 1024).toFixed(0)} KB`);
}
console.log(`three@${VERSION} → dist/vendor/three-${VERSION}/`);
