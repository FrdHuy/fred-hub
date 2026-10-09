// 性能档位与降级。这个文件不依赖 Three.js：进小屋前先在这里判断设备，极低端 / 没有 WebGL 时根本不去下载 3D 代码。
//
//   档位 4  全部效果：太阳 + 台灯 + 落地灯阴影（2048）、Bloom、全部微尘、像素比上限 2
//   档位 3  关掉两盏灯的阴影，太阳阴影降到 1024           ← 手机从这里起步
//   档位 2  关闭所有阴影（接触阴影贴片还在）
//   档位 1  再关闭 Bloom，像素比上限 1.5
//   档位 0  再把微尘减到约三分之一，像素比 1
//   flat    不用 WebGL：静态截图 + 普通 2D 导航（flat.js）
//
// 运行中还会看实际帧率：连续偏慢就自动降一档，并记在这台设备上（下次直接用那一档）。
// 测试：网址里加 ?room=0…4 固定档位，?room=flat 看静态版。例：127.0.0.1:57123/?room=1#/room
const KEY = 'fred-room-quality', TOP = 4;
const WEAK_GPU = /mali-4|mali-t6|adreno \(tm\) [1-4]\d\d|powervr sgx|intel\(r\) hd graphics [2-4]\d{3}|gma/i, SOFTWARE = /swiftshader|llvmpipe|software|basic render/i;
const clamp = n => Math.max(0, Math.min(TOP, n));

export function detect() {
  const forced = new URLSearchParams(location.search).get('room');
  if (forced === 'flat') return { webgl: false, reason: 'forced' };
  if (/^[0-4]$/.test(forced ?? '')) return { webgl: true, level: Number(forced), fixed: true, reason: 'forced' };
  // 有没有 WebGL、显卡是什么：建一个临时画布问一下。
  let gpu = '';
  try {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    if (!gl) return { webgl: false, reason: 'no-webgl' };
    const info = gl.getExtension('WEBGL_debug_renderer_info'); gpu = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch { return { webgl: false, reason: 'no-webgl' }; }
  if (SOFTWARE.test(gpu)) return { webgl: false, reason: 'software', gpu };          // 没有显卡加速，CPU 硬算：直接给静态版
  let level = TOP, reason = 'desktop';
  const phone = matchMedia('(pointer: coarse)').matches && Math.max(screen.width, screen.height) < 1100;
  if (phone) { level = 3; reason = 'mobile'; }
  if ((navigator.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4) { level -= 1; reason += '+small'; }
  if (WEAK_GPU.test(gpu)) { level = Math.min(level, 1); reason = 'weak-gpu'; }
  try { const saved = localStorage.getItem(KEY); if (saved !== null && Number(saved) < level) { level = Number(saved); reason = 'remembered'; } } catch {}
  return { webgl: true, level: clamp(level), reason, gpu };
}

// 把档位落实到场景上。parts：{ renderer, sun, shadowLamps, effects }；onChange：像素比变了之后重新量画布。
export function createQuality(found, { renderer, sun, shadowLamps, effects }, onChange) {
  let level = -1, frames = 0, total = 0;
  function set(next) {
    next = clamp(next); if (next === level) return;
    level = next; frames = -40; total = 0;                                  // 换档后先放过 40 帧（重新编译着色器会卡一下）
    renderer.setPixelRatio(Math.min(devicePixelRatio, level >= 3 ? 2 : level >= 1 ? 1.5 : 1));
    sun.castShadow = level >= 3;
    const size = level >= 4 ? 2048 : 1024;
    if (sun.shadow.mapSize.x !== size) { sun.shadow.mapSize.set(size, size); sun.shadow.map?.dispose(); sun.shadow.map = null; }
    for (const lamp of shadowLamps) lamp.castShadow = level >= 4;
    effects.setBloom(level >= 2); effects.setDust(level >= 1 ? 1 : .35);
    onChange?.(level);
  }
  // 每帧报一次耗时（毫秒）。60 帧平均超过 30ms（不到 33 帧 / 秒）就降一档。
  function sample(ms) {
    if (found.fixed || level === 0 || ms > 250) return;                     // 超过 250ms 多半是切了标签页，不算
    if (++frames <= 0) return;
    total += ms;
    if (frames < 60) return;
    const average = total / frames; frames = 0; total = 0;
    if (average > 30) { set(level - 1); try { localStorage.setItem(KEY, String(level)); } catch {} }
  }
  set(found.level);
  return { set, sample, rest() { frames = -20; total = 0; }, get level() { return level; } };
}
