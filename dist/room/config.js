// ─────────────────────────────────────────────────────────────────────────────
// 物件 ↔ 模块 映射。增删模块只改这个数组，不用碰场景代码。
//
//   object  用哪个物件造型（dist/room/objects/ 里的文件名，注册表见 objects/index.js）
//   module  点击后进入的模块 id（dist/catalog.js 里的 id）→ 网址 #/collection/<module>
//   soon    true = 模块还没建：只是摆设，悬停显示名字，不能点。建好后删掉 soon、填上 module 即可
//   label   悬停时显示的名字
//   at      位置 [x, y, z]，单位约等于米。房间地板是 y = 0，x / z 各从 -3 到 3；
//           西墙在 x = -3，北墙在 z = -3（默认镜头从 +x +z 方向看过来）
//   turn    绕竖直轴旋转的角度。0 = 正面朝 +z（背靠北墙），90 = 正面朝 +x（背靠西墙）
//   wall    只给挂在墙上的东西写：'west'（x = -3，有窗）/ 'north'（z = -3）/ 'east' / 'south'。
//           镜头转到那面墙背后时，墙会隐去，挂在上面的东西跟着一起隐去
// ─────────────────────────────────────────────────────────────────────────────
export const objects = [
  { object: 'desk', module: 'stories', label: '手记', at: [-2.55, 0, -1.85], turn: 90 },
  { object: 'fridge', module: 'travel', label: '旅行', at: [2.3, 0, -2.58] },
  { object: 'tv', module: 'cinema', label: '电影与剧集', at: [0.3, 0, -2.68] },
  { object: 'gacha', module: 'gacha', label: '扭蛋机', at: [-1.3, 0, -2.7] },
  { object: 'lampboard', module: 'bucketlist', label: '人生清单', at: [-1.3, 2.2, -2.99], wall: 'north' },
  { object: 'polaroids', soon: true, label: '摄影', at: [0.4, 2.2, -2.99], wall: 'north' },
  { object: 'poster', soon: true, label: '雪山计划', at: [-2.99, 2.05, -1.9], turn: 90, wall: 'west' },
  { object: 'computer', soon: true, label: '技术项目', at: [-2.68, 0.78, -2.42], turn: 68 },
];

// 默认时刻。预设表在 lights.js 的 MOODS 里；以后做昼夜 / 天气变化就是往那张表里加预设。
export const mood = 'golden';
