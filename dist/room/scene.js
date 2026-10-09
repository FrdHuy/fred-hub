// 场景构建：渲染器与天空、悬浮的切面地块、小屋（地板 + 两面后墙 + 窗）。
// 坐标约定：1 单位 ≈ 1 米；房间地板 y = 0，x / z 各从 -3 到 3；镜头在 +x +z 方向，所以
// 左后墙在 x = -3，右后墙在 z = -3，朝向镜头的两面墙被「切掉」，只留一圈矮墙脚。
import * as THREE from './three.js';
import { mat, box, cyl, ball, group, paint, contact, rng, tilt } from './kit.js';

export const ROOM = { half: 3, wallHeight: 3.2, wallThick: .2 };
export const GRASS = -.14;                                   // 草地比地板低一个门槛
export const ISLAND = { min: -4.2, max: 7.2 };               // 地块在 x / z 上的范围（小屋靠后，前面两侧是花园）
// 左后墙上的窗。光束、地板上的窗格光斑都由它决定（effects.js 也读这个）。
export const WINDOW = { x: -ROOM.half, z0: -.4, z1: 2.0, y0: .95, y1: 2.45 };

const WOOD = { floor: ['#c9975f', '#c08d56', '#d0a069', '#b98450'], dark: '#7d5237', trim: '#a8794f', beam: '#8b5e3c' };
const WALL = { plaster: '#f1e5d0', wainscot: '#a9b596', cut: '#d9c7a8' };

// ── 渲染器 ────────────────────────────────────────────────────────────────────
export function createStage(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));     // 像素比上限 2，高分屏不白白多算
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;        // ACES：高光柔和地压下去，暖光不会死白
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;          // 柔和阴影边缘
  renderer.domElement.className = 'r3-canvas';
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  // 小视角 + 远机位 ≈ 等距视角，但保留一点透视，纵深更自然。
  const camera = new THREE.PerspectiveCamera(24, 1, 1, 200);
  return { renderer, scene, camera };
}

// 天空：一张竖向渐变（画布现画），太阳那一侧再叠一团暖光。
export function skyTexture([top, middle, bottom], glow) {
  return paint(256, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(.55, middle); g.addColorStop(1, bottom);
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    if (!glow) return;
    const r = c.createRadialGradient(w * .12, h * .62, 0, w * .12, h * .62, w * .75); r.addColorStop(0, glow); r.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = r; c.fillRect(0, 0, w, h);
  });
}

// ── 悬浮地块：草皮 → 泥土 → 往下收窄的岩石，底下挂几块碎石 ───────────────────────
export function buildIsland() {
  const size = ISLAND.max - ISLAND.min, mid = (ISLAND.max + ISLAND.min) / 2, random = rng(7);
  const island = group(
    box(size, .32, size, mat('#9cc462'), mid, GRASS - .32, mid),                       // 草皮
    box(size - .14, .8, size - .14, mat('#94664a'), mid, GRASS - 1.12, mid),           // 泥土层
    box(size - .1, .1, size - .1, mat('#77503a'), mid, GRASS - .74, mid),              // 一条深色土纹
  );
  // 四棱台岩石：圆柱取 4 条边再转 45°，上口正好接住方形泥土层。
  const rock = cyl((size - .3) / Math.SQRT2, size * .42, 1.7, mat('#85705f'), mid, GRASS - 2.82, mid, 4);
  rock.rotation.y = Math.PI / 4; island.add(rock);
  for (let i = 0; i < 9; i++) {                                                         // 倒挂的碎石
    const r = .5 + random() * .9, h = .9 + random() * 1.6;
    const stone = cyl(r, .05, h, mat(random() > .5 ? '#756252' : '#85705f'), mid + (random() - .5) * size * .62, GRASS - 2.82 - h, mid + (random() - .5) * size * .62, 5);
    stone.rotation.y = random() * 3; island.add(stone);
  }
  island.traverse(o => { if (o.isMesh && o.position.y < GRASS - .4) o.castShadow = false; });
  return island;
}

// ── 小屋 ──────────────────────────────────────────────────────────────────────
export function buildHouse() {
  const { half: R, wallHeight: H, wallThick: T } = ROOM, random = rng(21), house = group();
  // 地基 + 一条条地板（每条颜色略有不同，接缝处自然出现细线）。
  house.add(box(R * 2 + T * 2 + .1, .3, R * 2 + T * 2 + .1, mat('#8c7a6a'), -T / 2, -.34, -T / 2));
  for (let i = 0; i < 12; i++) house.add(box(.485, .05, R * 2, mat(WOOD.floor[Math.floor(random() * 4)], { roughness: .62 }), -R + .25 + i * .5, -.05, 0));
  house.add(box(R * 2, .02, R * 2, mat('#5d3d28'), 0, -.06, 0));                         // 板缝下面的深色底

  const plaster = mat(WALL.plaster, { roughness: .95 }), green = mat(WALL.wainscot), beam = mat(WOOD.beam), trim = mat(WOOD.trim);
  const { z0, z1, y0, y1 } = WINDOW, wx = -R - T / 2;
  // 左后墙：围着窗洞的四块 + 护墙板 + 顶梁。
  house.add(
    box(T, H, z0 + R + T, plaster, wx, 0, (z0 - R - T) / 2), box(T, H, R - z1, plaster, wx, 0, (R + z1) / 2),
    box(T, y0, z1 - z0, plaster, wx, 0, (z0 + z1) / 2), box(T, H - y1, z1 - z0, plaster, wx, y1, (z0 + z1) / 2),
    box(.035, .9, R * 2, green, -R + .017, 0, 0), box(.06, .05, R * 2, trim, -R + .03, .9, 0), box(.05, .1, R * 2, trim, -R + .042, 0, 0),
    box(T + .08, .1, R * 2 + T + .04, beam, wx, H, -T / 2),
  );
  // 右后墙：整面。
  const wz = -R - T / 2;
  house.add(
    box(R * 2, H, T, plaster, 0, 0, wz),
    box(R * 2, .9, .035, green, 0, 0, -R + .017), box(R * 2, .05, .06, trim, 0, .9, -R + .03), box(R * 2, .1, .05, trim, 0, 0, -R + .042),
    box(R * 2 + .04, .1, T + .08, beam, 0, H, wz),
    box(T + .1, H + .1, T + .1, beam, wx, 0, wz),                                        // 墙角立柱
  );
  // 被切开的两面墙：只留矮墙脚，切口用浅色；+z 一侧留出门口。
  const cut = mat(WALL.cut), DOOR = { x0: .3, x1: 1.5 };
  house.add(
    box(T, .2, R * 2 + T, cut, R + T / 2, -.04, T / 2),
    box(DOOR.x0 + R, .2, T, cut, (DOOR.x0 - R) / 2, -.04, R + T / 2), box(R - DOOR.x1, .2, T, cut, (R + DOOR.x1) / 2, -.04, R + T / 2),
    box(DOOR.x1 - DOOR.x0, .06, T + .3, mat(WOOD.dark), (DOOR.x0 + DOOR.x1) / 2, -.06, R + T / 2 + .1),   // 门槛
    box(T + .1, .5, T + .1, beam, wx, -.04, R + T / 2), box(T + .1, .5, T + .1, beam, R + T / 2, -.04, wz),
  );
  house.add(buildWindow());
  // 墙根的暗角：两条窄长的接触阴影，让墙和地板的交界有分量。
  const along = contact(.7, R * 2, .34, -R + .3, 0), across = contact(R * 2, .7, .34, 0, -R + .3);
  house.add(along, across);
  return house;
}

// 窗：木框 + 窗棂（正是它们在地板上投出窗格）+ 不挡光的玻璃 + 窗台上的小盆栽 + 两片窗帘。
function buildWindow() {
  const { x, z0, z1, y0, y1 } = WINDOW, w = z1 - z0, h = y1 - y0, zc = (z0 + z1) / 2, wood = mat('#f4ede0'), T = ROOM.wallThick;
  const win = group(
    box(T + .06, .07, w + .14, wood, x - T / 2, y0 - .07, zc), box(T + .06, .07, w + .14, wood, x - T / 2, y1, zc),
    box(T + .06, h, .07, wood, x - T / 2, y0, z0 - .035), box(T + .06, h, .07, wood, x - T / 2, y0, z1 + .035),
    box(.05, h, .05, wood, x - T / 2, y0, z0 + w / 3), box(.05, h, .05, wood, x - T / 2, y0, z0 + w * 2 / 3), box(.05, .05, w, wood, x - T / 2, y0 + h * .56, zc),
    box(.26, .04, w + .24, wood, x + .12, y0 - .11, zc),                                 // 窗台
  );
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: '#fff3dc', transparent: true, opacity: .1, roughness: .1, depthWrite: false }));
  glass.rotation.y = Math.PI / 2; glass.position.set(x - T / 2, y0 + h / 2, zc); win.add(glass);
  // 窗台盆栽：影子会落进地板上的光斑里。
  const pot = group(cyl(.09, .07, .13, mat('#c9764f')), ball(.11, mat('#6f9a4a'), 0, .22, 0, 0), ball(.08, mat('#84ad55'), .06, .3, .03, 0), ball(.07, mat('#5f8a44'), -.05, .28, -.04, 0));
  pot.position.set(x + .14, y0 - .07, z0 + .42); win.add(pot);
  // 窗帘：拉开在两侧，杆子在窗上方。
  const cloth = mat('#e8b98a', { roughness: 1 }), rod = cyl(.018, .018, w + .7, mat(WOOD.dark), x + .1, 0, zc, 6);
  rod.rotation.x = Math.PI / 2; rod.position.y = y1 + .2; win.add(rod);
  for (const z of [z0 - .2, z1 + .2]) for (let i = 0; i < 3; i++) win.add(tilt(box(.06, h + .5, .13, cloth, x + .09 + (i % 2) * .03, y0 - .25, z + (i - 1) * .12), 0, (i - 1) * .25, 0));
  return win;
}
