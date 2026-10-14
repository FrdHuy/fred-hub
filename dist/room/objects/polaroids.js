// 拍立得照片墙 → 你们的照片。原点在墙面上，正面朝 +z：两根细绳，夹着一排排相纸。
// 锁着时相纸是空白的；开锁后把最新的几张照片（解密后的小图）贴到相纸上，照片不够的相纸继续空着。
import * as THREE from '../three.js';
import { mat, box, rod, group, rng } from '../kit.js';

export function build() {
  const random = rng(31), wall = group(), prints = [];
  [[.38, 5], [-.08, 4]].forEach(([y, count], row) => {
    const width = 1.5 - row * .2;
    for (let i = 0; i < 12; i++) {                                // 绳子：分成小段，中间垂下去
      const t = (i + .5) / 12, sag = Math.sin(t * Math.PI) * .07;
      const piece = rod(.004, width / 12 + .006, mat('#7d5237'), -width / 2 + t * width, y - sag, .012, 'x', 4); piece.rotation.z += -Math.cos(t * Math.PI) * .15; wall.add(piece);
    }
    for (let i = 0; i < count; i++) {
      const t = (i + .5) / count, x = -width / 2 + t * width, top = y - Math.sin(t * Math.PI) * .07;
      const print = new THREE.Mesh(new THREE.PlaneGeometry(.165, .16), new THREE.MeshStandardMaterial({ roughness: .6 })); print.position.set(0, .14, .0045); print.visible = false; print.receiveShadow = true; prints.push(print);
      const photo = group(box(.2, .24, .006, mat('#fdfcf8')), box(.165, .16, .0065, mat('#e9e4da'), 0, .06, .0005), print, box(.025, .05, .014, mat('#d9a05b'), 0, .215, 0));
      photo.position.set(x, top - .25, .014); photo.rotation.z = (random() - .5) * .22; wall.add(photo);
    }
  });
  // data：开锁后的内容（null = 锁着）；memory.photo(id) 给出解密后的图片地址；redraw 贴好一张后重画一帧。
  const loader = new THREE.TextureLoader(); let turn = 0;
  wall.userData.setUnlocked = (data, memory, redraw) => {
    const mine = ++turn;
    for (const print of prints) { print.visible = false; print.material.map?.dispose(); print.material.map = null; }
    (data?.photos ?? []).slice(0, prints.length).forEach(async (photo, i) => {
      const url = await memory.photo(photo.id, 't'); if (!url || mine !== turn) return;
      loader.load(url, texture => {
        if (mine !== turn) { texture.dispose(); return; }
        texture.colorSpace = THREE.SRGBColorSpace;
        // 相纸上的窗口接近正方形：照片居中裁切，不拉伸。
        const shape = (photo.w / photo.h) / (.165 / .16); if (shape > 1) { texture.repeat.x = 1 / shape; texture.offset.x = (1 - 1 / shape) / 2; } else { texture.repeat.y = shape; texture.offset.y = (1 - shape) / 2; }
        const print = prints[i]; print.material.map = texture; print.material.needsUpdate = true; print.visible = true; redraw?.();
      });
    });
  };
  return wall;
}
