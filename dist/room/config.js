// ─────────────────────────────────────────────────────────────────────────────
// 小屋里的物件 ↔ 你们的回忆。增删物件只改这个数组，不用碰场景代码。
// （小屋从 2026-10-14 起是两个人的小屋：物件装的是回忆，不再通向网站的模块；模块从「收藏」首页进。）
//
//   object  用哪个物件造型（dist/room/objects/ 里的文件名，注册表见 objects/index.js）
//   memory  它装着哪一类回忆：letters 信 / photos 照片 / days 纪念日 / places 去过的地方 /
//           watched 一起看过的 / wishes 想去的地方 / things 小物件。
//           内容来自 memories/（加密后是 memories/sealed.js），排版在 panel.js 的 SHOW 里
//   action  'unlock' = 这是门垫下的钥匙：点它输入暗号（开着时点它是锁门）
//   label   悬停时显示的名字
//   at      位置 [x, y, z]，单位约等于米。房间地板是 y = 0，x / z 各从 -3 到 3；
//           西墙在 x = -3，北墙在 z = -3（默认镜头从 +x +z 方向看过来）
//   turn    绕竖直轴旋转的角度。0 = 正面朝 +z（背靠北墙），90 = 正面朝 +x（背靠西墙）
//   wall    只给挂在墙上的东西写：'west'（x = -3，有窗）/ 'north'（z = -3）/ 'east' / 'south'。
//           镜头转到那面墙背后时，墙会隐去，挂在上面的东西跟着一起隐去
//   view    （选填）推近时从哪个方位角看它，单位度；不写就按 turn 推算
// ─────────────────────────────────────────────────────────────────────────────
export const MEMORIES = ['letters', 'photos', 'days', 'places', 'watched', 'wishes', 'things'];

export const objects = [
  { object: 'desk', memory: 'letters', label: '信', at: [-2.55, 0, -1.85], turn: 90 },
  { object: 'polaroids', memory: 'photos', label: '照片', at: [0.4, 2.2, -2.99], wall: 'north' },
  { object: 'calendar', memory: 'days', label: '纪念日', at: [-1.3, 2.25, -2.99], wall: 'north' },
  { object: 'fridge', memory: 'places', label: '去过的地方', at: [2.3, 0, -2.58] },
  { object: 'tv', memory: 'watched', label: '一起看过的', at: [0.3, 0, -2.68] },
  { object: 'poster', memory: 'wishes', label: '想去的地方', at: [-2.99, 2.05, -1.9], turn: 90, wall: 'west' },
  { object: 'doormat', action: 'unlock', label: '钥匙', at: [0.9, -0.09, 3.72], view: 20 },
];

// 默认时刻。预设表在 lights.js 的 MOODS 里。
export const mood = 'golden';
