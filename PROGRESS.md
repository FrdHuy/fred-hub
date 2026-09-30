# PROGRESS — Fred’s Hub

> Claude Code 与 Codex 共用的进度总览。**开始工作前先读本文件和 `AGENTS.md`**，再读 `docs/DESIGN.md`（统一设计语言，任何视觉/交互改动必读）、`docs/HANDOFF.md`（逐版本交接、所有权表）和 `docs/MODULES.md`（模块接口）。
> 本文件管“全局现状 + 待办 + 约定”；每轮的详细改动与验证继续写在 `docs/HANDOFF.md` 和 `docs/开发进度-vX.md`。

最近更新：2026-09-29 · Claude Code（v0.33 手记打字机）
上一次代码改动：v0.33 · 2026-09-29 · Claude Code

---

## 1. 项目简介

Fred’s Hub —— 私人“生活收藏室”网站。首页是一条横向收藏轨道，每个模块是一件可以“物理操作”的物件（光盘、机票、日记本、手稿清单），完成对应动作后进入该模块的内容页。

- 纯静态：原生 HTML / CSS / ES Modules，无构建、无包管理器。
- 本地预览：双击 `启动预览.command` 或 `python3 scripts/preview.py` → http://127.0.0.1:57123/
- 部署方案：GitHub 私有仓库 + Vercel（Root Directory `dist`，无构建）+ 阿里云域名 fredhu.top，见 `docs/部署.md`。
- git 仓库（分支 `main`，2026-09-28 初始化）。`checkpoints/`（v0.8–v0.16 旧备份）只留在本地，已被 git 忽略。

## 2. 已完成功能

| 范围 | 状态 |
| --- | --- |
| 极简首页：`Fred.` 字标、右上角缩略图菜单、单一模块标题 | ✅ v0.12–v0.14 |
| 横向收藏轨道：拖动/惯性/方向键/菜单跳转，停稳前禁止抓取 | ✅ v0.14 |
| 电影（cinema）：俯视光驱，光盘按住拖入、松手吸入，可撤回 | ✅ 交互获用户认可 |
| 旅行（travel）：机票吸附入槽 READING → 左→右刷卡 SUCCESS，拔出 ERROR 可重试 | ✅ 交互获用户认可 |
| 手记（stories）：首页打字机按 RET 进门；内页桌上稿子 → 阅读页；私密篇在打字机上敲暗号解锁；notes/*.md + `node scripts/publish-notes.mjs` 发布；与旅行、人生清单互链 | ✅ v0.33（占位文章） |
| 旅行翻牌屏（travel）：深色候机大厅，平面 Solari 翻牌（ARRIVALS 去过 / DEPARTURES 想去），点一行打印登机牌；data.js 静态数据 + photos/；设计 docs/design/travel.md | ✅ v0.31（占位数据） |
| 人生清单（bucketlist）：百灯控制面板（v0.28）——首页拨杆通电自检；内页读数屏 + 100 灯 + 年份里程表回看 + 选择旋钮 + PRINT 出纸；数据 data.js（text/done/year），所有访客看到同一份 | ✅ v0.28 |
| 影院片单（cinema）：深色 3D CD 盒 cover-flow（中间正面、两侧渐收为书脊），原版语言海报，详情飞出，精简筛选/排序（v0.21）；静态 `data.js`；`scripts/add-movie.mjs` 从 TMDB 自动补全与下载海报 | ✅ v0.18 |
| 模块化接口 `mount(context) → cleanup()`、模块注册表、路由 `#/collection/<id>` | ✅ |
| 检查脚本：`check` / `check-cinema` / `check-bucketlist` / `check-travel` / `check-stories` / `check-contact` / `check-gallery` / `check-swipe` | ✅ 2026-09-28 全部通过 |

## 3. 进行中

- travel 翻牌屏：已完成（v0.31），等 Fred 的真实行程数据替换占位（Claude Code）。
- 手记：已完成（v0.33），等 Fred 写第一篇真实文章（见 notes/README.md）。

## 4. 待办清单（按优先级）

**P1 — 模块内容**
1. 片单：Fred 用真实片单替换 5 部示例（`docs/片单使用说明.md`）。
2. 旅行 travel：翻牌屏已上线（占位数据）。Fred 填 `docs/旅行行程-填写.md` → `node scripts/import-travel.mjs`（见 `docs/填写真实数据.md`）。
3. 手记：notes/ 里是 4 篇占位示例（私密篇暗号 fred），写真实文章后删掉示例再运行 `node scripts/publish-notes.mjs`。
4. 人生清单已导入 66 条（v0.30）。以后改 docs/人生清单候选-200.md 后运行 `node scripts/import-lifelist.mjs --force`，或直接改 data.js。

**P2 — 打磨**
5. 人生清单：条目原地编辑、导出/备份、100 条压力测试。
6. 手机端完整验收（多浏览器矩阵、触控板连续滚动未实测）。
7. ~~清理 `styles.css` / `hub.css` 中旧版未使用规则~~ ✅ v0.32（逐像素验证）。剩余：hub.css 仍有 7 处 `!important` 与层层覆盖，需要时再合并。

**P2 — 全站设计审查（2026-09-29，Claude；Fred：先记下，之后处理）**
v0.32（2026-09-29）按 Fred 的批复处理了大部分；未勾的是 Fred 说「等一下」或「不急」的。
- 第一轮 · 修基础
  - [x] 字标：自托管 Inter 600 子集（`dist/fonts/`，1.7KB，与 Mac 上原先的样子几乎一致），所有设备一致。未做成 SVG：子集字体同样一致，且文字可选、可读屏。
  - [x] 图片瘦身，画质不变：fred-diary 1.7MB → 105KB WebP（700px，≥ 显示尺寸 2 倍）；collection-atlas.png（每次都下载却从不显示）与 cd-player.png 已删除。首页图片下载 3.1MB → 0.1MB。compass.png 保留给暂停的罗盘（不会被加载）。
  - [x] 返回箭头：片单 / 清单 / 旅行统一在页眉 5% 边距上（手机 22px）。日记页等撕页日历重做时统一。
  - [x] 片单计数改等宽读数 `05`。
  - [x] 分享预览图 `dist/og.jpg`（1200×630，四件物件）+ og:image / twitter:card。
  - [ ] 日记本重做时：用代码画、首页与菜单颜色一致（Fred：不急，日记会重做）。
- 第二轮 · 统一质感
  - [x] 材质令牌（`dist/tokens.css`）：暖白 / 灰绿 / 石灰三种外壳 + 液晶玻璃 + 纸。闸机由偏黄卡其改为暖石色（有意做得很轻，避免单调）。DESIGN.md 已同步。
  - [x] 字体令牌：`--font-wordmark` / `--font-mono` / `--font-ui` / `--font-literary`（Didot + 宋体），全站硬编码字体栈已替换；首页原来 11 处裸 `monospace`（Windows 上会变 Courier）已统一。
  - [x] 人生清单去老气：灯的高光缩小变柔（磨砂玻璃而非亮珠），未亮灯改哑光暖灰，读数屏斜向反光去掉。
  - [ ] 片单：选第一部时左半空；TMDB 署名太淡（Fred：各内页等一下处理）。
- 第三轮 · 让网站活起来
  - [x] 首页登机牌显示下一班（`MSN ✈ ICN · FH 008`，无计划时显示最近一趟）；光驱与清单面板本来就读真实数据。
  - [x] 填数据变简单：`docs/填写真实数据.md` 一页说明三个模块；旅行改为填 `docs/旅行行程-填写.md` → `node scripts/import-travel.mjs`。
  - [x] 统一「进门」：物件的屏幕长成房间（闸机液晶 → 候机大厅，光驱读数屏 → 放映室），清单保持面板放大；菜单跳转与回首页用目标页底色淡出，深色页前不再闪白。
  - [ ] 手机首页：露出邻居或读数 `02 / 04`；上方空白上移（未批复）。
  - [ ] 首次访问的无字示范（未批复）。
- 第四轮 · 锦上添花
  - [x] 声音（`dist/sound.js`，Web Audio 实时合成，无音频文件）：默认关，左上简笔喇叭开关并记住；闸机嘀声 / 错误双音、光驱入盘转起、拨杆咔哒 + 电流声、旋钮与里程表档位、片单切换、翻牌哒哒（限流）、打印机声。
  - [ ] 「关于 Fred」护照物件（未批复）。
  - [x] 工程：删除本地旧分支（未合并的 fortune-sticks 保留为 tag `archive/fortune-sticks`）；清理 styles.css / hub.css 死规则（见 HANDOFF v0.32）。

**P3 — 发布**
8. 已上线 https://fred-hub.vercel.app（2026-09-28，GitHub FrdHuy/fred-hub 私有仓库 push 自动部署）；fredhu.top 已绑定（2026-09-30）；之后 OG 图片、性能检查。
9. 罗盘（wheel）已删除（v0.35.2）。手记打磨完成（v0.36）。新模块：磁带随身听（v0.37，占位歌单，Fred 用录音台录入）。下一步：扭蛋机（今日签：黄历 + 星座；之后真心话大冒险，题库由 Fred 提供）→ 打卡钟（时间线）。

## 5. 风格约定（必须保持，引入新库或新设计语言前先问用户）

### 技术栈与目录
- 原生 HTML/CSS/ES Modules；`dist/` 就是可编辑源码，不是构建产物。无 npm、无框架、无打包器。Node 只用于 `scripts/check*.mjs`，Python 只用于本地预览服务器。
- `dist/index.html` 单页；`main.js`（外壳/菜单/路由挂载）、`gallery.js`（横向轨道）、`experience.js`（首页物理动作）、`catalog.js`（模块元数据+封面）、`router.js`、`hub.css` 为**共享文件，同一时间只能一个集成者修改**。
- 模块放在 `dist/modules/<id>/{index.js, style.css, storage.js?, assets/}`；入口同步 `mount({container,item,navigate,createCover})`，返回 cleanup；事件用 `AbortController` 的 `signal` 统一注销。
- 资源缓存版本号：`?v=30` 写在 index.html 与 import 路径中，发版时整体递增。
- 每个版本用 git 提交保存，并新增 `docs/开发进度-v<新版本>.md`（v0.18 起不再复制 `checkpoints/`）。

### 视觉
- **统一设计语言见 `docs/DESIGN.md`：Soft Retro Industrial（温和的复古工业设计，博朗 / 八十年代日本电子 / Teenage Engineering）。以下条目是它的具体落地，冲突时以 DESIGN.md 为准。**
- **首页**保持下面的暖白基调；**模块进入后可有独立风格**（用户 v0.18 决定，新风格先征得用户同意）。深色模块在 catalog 设 `theme: 'dark'`。
- cinema 风格：暖黑 `#0f0d0c`、胶片白 `#ece4d6`、暗灰 `#8a8276`、金 `#d2a052`；Didot/宋体细体标题 + Avenir Next/苹方 Light 小字（只用系统字体）；token 定义在 `.cinema` 上。用户偏好：界面文字越少越好，用简笔线稿图标代替文字标签。
- 首页基调：暖白纸张 + 墨色，克制、留白多，“实物收藏”质感（纸张纹理、阴影、轻微旋转）。
- 颜色 token（`styles.css :root`，模块只复用不另起）：`--paper #fafaf8`、`--ink #242726`、`--muted #747974`、`--line #dedfd9`、`--accent #b34934`（砖红，仅做点缀，如字标句点）。
- 字体：界面 `'Manrope','PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif`；物件标签用等宽小字大字距（如 `8px monospace, letter-spacing .2em`）；人生清单内页 Georgia + 宋体（Songti SC）衬线。
- 动效：主缓动 `--ease: cubic-bezier(.22,.75,.2,1)`；短时淡入/位移（~150ms 标题、~520ms 展开）；**必须尊重 `prefers-reduced-motion`**；指针操作需有键盘等价操作。
- 首页不加分类、搜索、说明文字、装饰标签、通用拖放区或弹窗；内容页是普通页面，不用嵌套对话框。
- 文案：界面中文为主；封面/物件上的装饰文字多为英文大写小字（BOARDING PASS、FRED’S COLLECTION）。

### 代码
- 命名：camelCase 变量/函数，kebab-case CSS 类，BEM 式修饰 `collectible--ticket`；模块内类名带模块前缀（`life-row`、`life-paper`、`wish-paper`）。
- 模块样式全部以 `[data-module="<id>"]` 开头，禁止修改全局选择器。
- 写法紧凑：DOM 用 `document.createElement` + `textContent`（用户数据不走 innerHTML），静态骨架可用模板字符串 innerHTML；CSS 多为单行规则。
- 存储：localStorage key 形如 `fred.hub.<module>.v1`，读写放在模块自己的 `storage.js`，含数据校验，读失败时不覆盖原数据。
- 资源引用用 `new URL('./assets/x', import.meta.url)`，不用根路径。

## 6. 重要技术决定及原因

| 决定 | 原因 |
| --- | --- |
| 不用框架/构建工具 | 个人小站，零依赖、改完刷新即可，任何 agent 都能直接接手 |
| `dist/` 即源码 | 省去构建步骤；静态托管直接指向 `dist` |
| 统一 `mount → cleanup` 模块接口 | 模块可由不同 agent 并行开发，互不影响共享文件 |
| 共享文件单一集成者 + HANDOFF 所有权表 | Claude 与 Codex 看不到彼此对话，靠文档协调避免覆盖 |
| `gallery.position` 为唯一渲染位置 | v0.14 修复切换时机器/物件不同步 |
| 内容用静态数据文件（非后台/非 localStorage） | 网站公开后只有持有项目文件的 Fred 能改；零后端 |
| TMDB 只在本机脚本调用 | 静态站无法隐藏 API 密钥；避免访客等待和第三方故障 |
| 模块 data.js 动态 import | 数据写错只影响该模块页，并能显示错误 |
| 人生清单改为静态数据文件（v0.26） | 原 localStorage 只存在单个浏览器，访客看不到 Fred 的清单 |
| ~~人生清单用 localStorage~~（已废弃） | 先做可用的本地版本；清除浏览器数据会丢失 |
| 罗盘下线但保留源码 | 用户决定暂停，未来可能恢复 |
| git 取代 `checkpoints/` 整目录备份 | 便于两个 agent 对比和回退 |

## 7. 交接规则速记

1. 开始：读 PROGRESS → AGENTS → HANDOFF → MODULES，在 HANDOFF 所有权表登记自己负责的范围。
2. 结束：运行 `node scripts/check.mjs`（及相关 `check-*.mjs`），在 HANDOFF 记录改动文件、验证、限制、下一步；同步更新本文件第 2–4 节和顶部“最近更新”。
