# PROGRESS — Fred’s Hub

> Claude Code 与 Codex 共用的进度总览。**开始工作前先读本文件和 `AGENTS.md`**，再读 `docs/HANDOFF.md`（逐版本交接、所有权表）和 `docs/MODULES.md`（模块接口）。
> 本文件管“全局现状 + 待办 + 约定”；每轮的详细改动与验证继续写在 `docs/HANDOFF.md` 和 `docs/开发进度-vX.md`。

最近更新：2026-09-28 · Claude Code（接手盘点，未改代码）
上一次代码改动：v0.17 · 2026-09-28 · Codex

---

## 1. 项目简介

Fred’s Hub —— 私人“生活收藏室”网站。首页是一条横向收藏轨道，每个模块是一件可以“物理操作”的物件（光盘、机票、日记本、手稿清单），完成对应动作后进入该模块的内容页。

- 纯静态：原生 HTML / CSS / ES Modules，无构建、无包管理器。
- 本地预览：双击 `启动预览.command` 或 `python3 scripts/preview.py` → http://127.0.0.1:57123/
- 尚未发布到公网（`.openai/hosting.json` 指向 `dist/` 静态托管配置）。
- 项目目录**不是 git 仓库**；版本回退依赖 `checkpoints/vX/dist` 整目录备份。

## 2. 已完成功能

| 范围 | 状态 |
| --- | --- |
| 极简首页：`Fred.` 字标、右上角缩略图菜单、单一模块标题 | ✅ v0.12–v0.14 |
| 横向收藏轨道：拖动/惯性/方向键/菜单跳转，停稳前禁止抓取 | ✅ v0.14 |
| 电影（cinema）：俯视光驱，光盘按住拖入、松手吸入，可撤回 | ✅ 交互获用户认可 |
| 旅行（travel）：机票吸附入槽 READING → 左→右刷卡 SUCCESS，拔出 ERROR 可重试 | ✅ 交互获用户认可 |
| 日记（stories）：日记本翻开展开 | ✅ 交互获用户认可 |
| 人生清单（bucketlist）：添加、勾选划线、移除 + 单步撤销、自动序号、localStorage 保存；封面英文 Life List，内页中文 | ✅ v0.15–v0.17 |
| 模块化接口 `mount(context) → cleanup()`、模块注册表、路由 `#/collection/<id>` | ✅ |
| 检查脚本：`check` / `check-bucketlist` / `check-contact` / `check-gallery` / `check-swipe` | ✅ 2026-09-28 全部通过 |

## 3. 进行中

无。所有权表（`docs/HANDOFF.md`）中没有正在编辑的 agent。

## 4. 待办清单（按优先级）

**P0 — 协作基础**
1. `git init` 并做首个提交（排除 `checkpoints/`），以后用分支/提交代替整目录备份，方便 Claude ↔ Codex 交接对比。*需用户确认。*

**P1 — 模块内容（当前三个模块仍是空状态占位）**
2. 旅行 travel：确定数据模型（地点、日期、照片、文字）及存储方式（localStorage / 静态 JSON / 后端）。
3. 电影与剧集 cinema：片单数据模型（片名、年份、类型、评分、短评）与展示。
4. 故事与日记 stories：文章/日记的存储与阅读页。
   > 共同前置决定：内容由 Fred 在页面里编辑（本地存储），还是作为静态数据文件随站点发布？HANDOFF 已标注“先明确本地存储还是后端持久化”。

**P2 — 打磨**
5. 人生清单：条目原地编辑、导出/备份、100 条压力测试。
6. 手机端完整验收（多浏览器矩阵、触控板连续滚动未实测）。
7. 清理 `styles.css` / `hub.css` 中旧版未使用规则（独立任务，勿混入功能改动）。

**P3 — 发布**
8. 公网部署、OG 图片、性能检查。
9. 罗盘（wheel）暂停中，源码保留，是否恢复待定。

## 5. 风格约定（必须保持，引入新库或新设计语言前先问用户）

### 技术栈与目录
- 原生 HTML/CSS/ES Modules；`dist/` 就是可编辑源码，不是构建产物。无 npm、无框架、无打包器。Node 只用于 `scripts/check*.mjs`，Python 只用于本地预览服务器。
- `dist/index.html` 单页；`main.js`（外壳/菜单/路由挂载）、`gallery.js`（横向轨道）、`experience.js`（首页物理动作）、`catalog.js`（模块元数据+封面）、`router.js`、`hub.css` 为**共享文件，同一时间只能一个集成者修改**。
- 模块放在 `dist/modules/<id>/{index.js, style.css, storage.js?, assets/}`；入口同步 `mount({container,item,navigate,createCover})`，返回 cleanup；事件用 `AbortController` 的 `signal` 统一注销。
- 资源缓存版本号：`?v=17` 写在 index.html 与 import 路径中，发版时整体递增。
- 每个版本改动前把 `dist` 备份到 `checkpoints/v<旧版本>/dist`，并新增 `docs/开发进度-v<新版本>.md`。

### 视觉
- 基调：暖白纸张 + 墨色，克制、留白多，“实物收藏”质感（纸张纹理、阴影、轻微旋转）。
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
| 人生清单用 localStorage，无云同步 | 先做可用的本地版本；清除浏览器数据会丢失 |
| 罗盘下线但保留源码 | 用户决定暂停，未来可能恢复 |
| `checkpoints/` 整目录备份 | 项目未使用 git（建议后续改用 git） |

## 7. 交接规则速记

1. 开始：读 PROGRESS → AGENTS → HANDOFF → MODULES，在 HANDOFF 所有权表登记自己负责的范围。
2. 结束：运行 `node scripts/check.mjs`（及相关 `check-*.mjs`），在 HANDOFF 记录改动文件、验证、限制、下一步；同步更新本文件第 2–4 节和顶部“最近更新”。
