// 静态版：没有 WebGL、没有显卡加速，或者 3D 代码加载失败时用——一张小屋的截图 + 普通的 2D 链接。不依赖 Three.js。
// 截图是从真实场景渲染出来的（fallback.jpg，生成方法见 docs/design/room.md）。
export function mountFlat(host, objects) {
  const flat = Object.assign(document.createElement('div'), { className: 'r3-flat' });
  const image = Object.assign(document.createElement('img'), { src: new URL('./fallback.jpg', import.meta.url).href, alt: '花园里的一间小木屋，傍晚的阳光穿过窗户照在地板上', decoding: 'async' });
  const nav = document.createElement('nav'); nav.setAttribute('aria-label', '小屋里的物件');
  for (const entry of objects) if (!entry.soon) nav.append(Object.assign(document.createElement('a'), { href: `#/collection/${encodeURIComponent(entry.module)}`, textContent: entry.label }));
  flat.append(image, nav); host.append(flat);
  return { flat: true, start() {}, stop() {}, dispose() { flat.remove(); } };
}
