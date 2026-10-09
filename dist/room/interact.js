// 交互：悬停高亮 + 名称标签、点击后镜头推近再进入模块、键盘导航。
// 所有 2D 的东西（标签、过渡幕、键盘用的链接列表）都是 HTML，叠在画布上面，不在 canvas 里画。
import * as THREE from './three.js';

const WARM = new THREE.Color('#ffb066');

// options：open(entry) 进入模块（main.js 负责改网址）；tint(moduleId) 那个模块页的底色；sound(name) 站内音效；still 减少动态效果。
export function createInteract({ stage, view, placed, host, open, tint, sound, still }) {
  const { camera, scene, renderer } = stage, canvas = renderer.domElement, abort = new AbortController(), signal = abort.signal;
  const label = Object.assign(document.createElement('div'), { className: 'r3-label' }); label.setAttribute('aria-hidden', 'true');
  const veil = Object.assign(document.createElement('div'), { className: 'r3-veil' }); veil.setAttribute('aria-hidden', 'true');
  // 键盘 / 读屏用的导航：每个物件一个真正的链接（看不见，但能 Tab 到）。聚焦 = 悬停，回车 = 点击。
  const nav = Object.assign(document.createElement('nav'), { className: 'r3-nav' }); nav.setAttribute('aria-label', '小屋里的物件');
  host.append(label, veil, nav);

  // 每个物件量一次：包围球（推近用）和头顶的位置（放标签用）。场景是静止的，不用每帧重算。
  scene.updateMatrixWorld(true);
  const info = new Map(), level = new Map();
  for (const object of placed) {
    const bounds = new THREE.Box3(); object.traverse(o => { if (o.isMesh && !o.material.isMeshBasicMaterial) bounds.expandByObject(o); });
    const sphere = bounds.getBoundingSphere(new THREE.Sphere()), entry = object.userData.entry;
    const item = entry.soon ? Object.assign(document.createElement('button'), { type: 'button', textContent: `${entry.label}（还没建好）` }) : Object.assign(document.createElement('a'), { href: `#/collection/${encodeURIComponent(entry.module)}`, textContent: entry.label });
    if (entry.soon) item.setAttribute('aria-disabled', 'true');
    item.addEventListener('focus', () => { if (!busy) { hot = object; byKey = true; } }, { signal });
    item.addEventListener('blur', () => { if (byKey && hot === object && !busy) hot = null; }, { signal });
    item.addEventListener('click', e => { e.preventDefault(); activate(object); }, { signal });
    nav.append(item);
    info.set(object, { center: sphere.center, radius: sphere.radius, top: new THREE.Vector3(sphere.center.x, bounds.max.y + .14, sphere.center.z), item });
    level.set(object, 0);
  }

  let hot = null, shown = null, byKey = false, busy = false, dirty = false, down = null, linger = 0;
  const pointer = new THREE.Vector2(), raycaster = new THREE.Raycaster(), spot = new THREE.Vector3();
  const aim = e => { const r = canvas.getBoundingClientRect(); pointer.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); };
  // 指针下面是哪件物件：射线打到的第一个网格，顺着父节点往上找到带配置的那一层。随墙隐去的东西不算。
  function pick() {
    raycaster.setFromCamera(pointer, camera);
    for (const hit of raycaster.intersectObjects(placed.filter(o => !o.userData.hidden), true)) {
      for (let o = hit.object; o; o = o.parent) if (o.userData.entry) return o;
    }
    return null;
  }
  canvas.addEventListener('pointermove', e => { if (e.pointerType === 'touch') return; aim(e); dirty = true; byKey = false; }, { signal });
  canvas.addEventListener('pointerleave', () => { if (!byKey && !busy) { hot = null; dirty = false; } }, { signal });
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY }; }, { signal });
  // 点击 = 按下和抬起几乎在同一处；拖动是在转镜头，不算点击。
  canvas.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) { down = null; return; }
    down = null; aim(e); byKey = false;
    const object = pick(); if (object) activate(object); else if (!busy) hot = null;
  }, { signal });
  // 方向键在物件之间移动；Esc 放开当前选中的物件。
  document.addEventListener('keydown', e => {
    if (host.hidden || busy || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.('.site-header')) return;
    const items = [...nav.children], at = items.indexOf(document.activeElement);
    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) { e.preventDefault(); const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1; items[(at + step + items.length) % items.length].focus({ preventScroll: true }); }
    else if (e.key === 'Escape' && at >= 0) items[at].blur();
  }, { signal });

  // 点中物件：还没建好的只亮一下名字；建好的——镜头推近，快到时幕布淡成那一页的底色，然后交给 main.js 打开模块页。
  async function activate(object) {
    if (busy) return;
    const entry = object.userData.entry, { center, radius } = info.get(object);
    hot = object;
    if (entry.soon) { linger = performance.now() + 1600; return; }
    busy = true; sound?.('key'); canvas.style.cursor = '';
    const facing = entry.turn || 0, azimuth = (facing + (45 - facing) * .35) * Math.PI / 180;       // 从物件正面偏向默认视角的方向看过去
    veil.style.background = tint(entry.module);
    const curtain = setTimeout(() => veil.classList.add('is-on'), still ? 0 : 560);
    await view.closeUp(center, radius, azimuth);
    clearTimeout(curtain); veil.classList.add('is-on');
    open(entry);
  }
  // 回到小屋（从模块页返回，或从别处进来）：幕布从来处的底色淡开，镜头如果还停在特写就拉回全景。
  function arrive(color) {
    hot = null; byKey = false; linger = 0;
    if (color) veil.style.background = color;
    veil.classList.add('is-on', 'is-cut'); void veil.offsetWidth; veil.classList.remove('is-on', 'is-cut');
    if (view.close) { busy = true; view.back().then(() => { busy = false; }); } else busy = false;
  }

  function update() {
    if (dirty && !busy) { dirty = false; hot = pick(); canvas.style.cursor = hot ? (hot.userData.entry.soon ? 'default' : 'pointer') : ''; }
    if (linger && performance.now() > linger) { linger = 0; if (!byKey && !busy) { hot = null; dirty = true; } }
    // 高亮：被指着的物件泛起一层暖光、微微放大（灯和屏幕则更亮一点）；离开后慢慢退回去。
    for (const object of placed) {
      const now = level.get(object), want = object === hot && !object.userData.hidden ? 1 : 0;
      if (Math.abs(want - now) < .002) continue;
      const h = still ? want : now + (want - now) * .16; level.set(object, Math.abs(want - h) < .002 ? want : h);
      for (const m of object.userData.materials) { if (!m.emissive) continue; const glow = m.userData.base.glow; if (glow) m.emissiveIntensity = glow * (1 + .7 * h); else { m.emissive.copy(WARM); m.emissiveIntensity = .3 * h; } }
      object.scale.setScalar(1 + .02 * h);
    }
    // 名称标签：把物件头顶的三维位置投影到屏幕，HTML 标签跟着走。
    const named = hot && !busy && !hot.userData.hidden ? hot : null;
    if (named !== shown) { shown = named; label.classList.toggle('is-on', !!named); if (named) { label.textContent = named.userData.entry.label; label.classList.toggle('is-soon', !!named.userData.entry.soon); } }
    if (shown) { spot.copy(info.get(shown).top).project(camera); label.style.transform = `translate(${((spot.x + 1) / 2 * host.clientWidth).toFixed(1)}px,${((1 - spot.y) / 2 * host.clientHeight).toFixed(1)}px) translate(-50%,-100%)`; }
  }
  return { update, arrive, dispose() { abort.abort(); label.remove(); veil.remove(); nav.remove(); } };
}
