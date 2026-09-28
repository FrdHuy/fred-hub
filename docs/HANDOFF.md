最新变更和验证见 [开发进度-v0.28.md](开发进度-v0.28.md)。全局进度见根目录 PROGRESS.md。

# 当前交接 · v0.28 · 2026-09-28

## Canonical path
/Users/fred/Desktop/Project/Fred-Personal-Site
本次 Codex 工作副本：/Users/fred/Documents/Codex/2026-09-22/wo/site
后续 agent 优先使用 canonical 项目。复制前比较差异，不得覆盖另一 agent 的模块更新。

## 用户最新决定
首页精简：仅 Fred.、右上角缩略图菜单、物件与一个名称。无搜索/分类/箭头/描述文字。
只保留横向收藏。光驱为俯视式，光盘向上收入机身；机票先吸附入槽 READING，再从左至右刷卡 SUCCESS；拔出 ERROR 可重试。光盘按住可撤回，插入后松手吸入，未插入松手闲置归位。
光盘、日记、机票的设计与交互已获用户认可，保持不变。罗盘暂时撤下，替换为手稿人生清单；本轮完成基本列表，下一轮再逐一优化各模块内部功能和设计。

## Ownership
| Scope | Owner | State |
| --- | --- | --- |
| 公共首页、交互、菜单、模块注册 | Codex | v0.17 已交接，无运行中编辑 |
| cinema 影院片单（dist/modules/cinema/**、scripts/add-movie.mjs、scripts/check-cinema.mjs；共享：index.html 样式链接、catalog theme、main.js 主题切换、hub.css 深色头部） | Claude Code | v0.18 已交接，无运行中编辑 |
| stories 撕页日历（dist/modules/stories/**；共享：experience.js 中 stories 分支、catalog.js 中 stories 封面、对应样式） | Codex / GPT | 2026-09-28 分配，分支 codex/tear-calendar，先与用户讨论创意 |
| bucketlist 百灯控制面板（dist/modules/bucketlist/**；共享：experience.js 中 bucketlist 分支、catalog.js 中 bucketlist 封面、main.js 中清单打开动画、hub.css 清单返回箭头） | Claude Code | v0.28 已合入 main，无运行中编辑 |
| travel 内容 | 未分配 | 当前为空状态占位 |
| wheel | 暂停 | 源码保留，不在注册表和菜单中 |

开始任务前填写自己的范围；结束更新状态。表格不是程序锁，也不会自动通知另一个 agent。

## Changes
index/main/gallery/experience/hub：极简首页、缩略图菜单、俯视机身与反向吞盘动画、读卡灯。
modules/**：拆分内容入口及统一 mount/cleanup 接口，未增加真实内容。
启动预览.command + scripts/preview.py：双击启动、自动打开浏览器、已有服务复用、禁用预览缓存。
AGENTS.md + CLAUDE.md + MODULES.md：共同开发约定。
旧 v0.10 保存于 checkpoints/v0.10/dist。

## Limits
尚无照片上传、文章编辑、片单存储、旅行地点数据。无公网部署。
历史 styles.css/hub.css 含旧版未使用规则；不要一次性重写全部样式，与当前功能无关的清理留待独立任务。

## Next
Fred 体验反馈优先。按指定模块添加数据模型/编辑能力时，先明确本地存储还是后端持久化。

## 本轮验证
- `node scripts/check.mjs`：模块注册与渲染器一致、路由、资源、JavaScript 语法通过。
- 双击脚本 zsh/Python 语法通过；真实已有服务复用分支通过，确认会请求打开浏览器，不重复启动服务器。
- 浏览器：桌面缩略图菜单切换、光盘拖入后进入片单；390px 手机宽度下从内页菜单切回旅行，拖票读取进入旅行页。
- 已修复移除旧版布局后场景宽度收缩、光盘托盘层级、新旧脚本缓存混用。
- 临时手机视口已恢复。未做完整多浏览器矩阵；启动脚本新建服务分支未通过 Finder 双击逐项验收。

## v0.14 切换同步修复
- gallery.position 是场景渲染唯一位置；index 每帧取视觉最近项，target 只表示目的地。
- travel/cinema 各自持久 receiver，onDraw 同步横向位置与缩放；不再单独淡入淡出或替换机器 DOM。
- 未停稳时禁用物件抓取；物件实际轮廓接收 pointer，周围空白用于浏览收藏。
- 惯性上限从 .8 减至 .28 格；菜单打开平顺停靠；方向键按 target 连续切换。
- 资源版本 v14.1；v0.13 备份位于 checkpoints/v0.13/dist。
- 通过 check-gallery、check-contact、check 三项针对性检查。真实浏览器验证正反向/短拖、菜单、机票入槽、入槽后切换、光盘松手读取到片单页。
- 未做完整移动设备/多浏览器矩阵；连续触控板轮动未单独实测。

## v0.15 人生清单
- 新模块 dist/modules/bucketlist/{index.js,storage.js,style.css}，模块 ID bucketlist，路由 #/collection/bucketlist。
- 罗盘仅移出 catalog/renderer，旧文件保留；首页第四项及菜单自动换为手稿纸张。
- 添加、完成划线、取消完成、移除与单步撤销；初始空列表；localStorage key fred.hub.bucketlist.v1。无云端同步，清除浏览器数据会丢失。
- 首页纸面内容是封面装饰，不是用户数据；不触及光盘/机票接触逻辑与日记展开分支。
- 勾选与刷新保存、删除撤销均在浏览器验证；临时测试条目已清理。check、check-gallery、check-bucketlist 通过。
- v0.14 备份 checkpoints/v0.14/dist。资源版本 v15，清单 CSS v15.1。
- 手写字体使用系统楷体/Noteworthy 回退；不同系统字形可能不同。未做云同步、多人编辑、导出及条目原地改写。

## v0.16 Life List 英文与展开
清单封面、名称、操作、空状态、返回链接统一英文；用户存储条目不修改。手写字体 Bradley Hand / Noteworthy。打开：140ms 轻抬，主路由使用原纸张边界→目标纸张的520ms展开，内容错峰显现；清单打开跳过 FRED 遮罩，其他模块保持原动画。减少动态效果时直接显示。资源 v16，备份 checkpoints/v0.15/dist。check/check-bucketlist 通过，浏览器菜单→封面→英文内页通过。

## v0.17 字体与中文内页
封面和菜单保留 Life List（人生愿望，非日常待办）。打开后全中文，中文宋体、英文 Georgia，替换上一版手写字体。纸张最大宽640px，正文17px，行高约48px，添加序号01、02…100…，完成项目保持原位。未限制100项。数据与v16展开动画不变。check/check-bucketlist通过，浏览器新增、编号、勾选和中文排版验证，测试条目已移除。资源v17，旧版checkpoints/v0.16/dist。未进行100条真实页面压力测试。

## v0.18 影院片单（Claude Code）
- 项目已 `git init`（main）；`checkpoints/` 被忽略，今后用 git 提交代替整目录备份。
- 用户决定：模块进入后可有独立风格，不必呼应首页。cinema 为深色放映厅：银幕 + CD 书脊架，放映光、胶片颗粒、逐字片头、光盘飞入、海报主色书脊、页面氛围色。
- 数据：`dist/modules/cinema/data.js`（只读静态数据，用户手改或用脚本添加），规则在 `films.js`。海报在 `posters/`。
- `scripts/add-movie.mjs`：本机调用 TMDB（Token 在 `.env`，已 gitignore），下载海报、插入 data.js、去重。网站运行时不请求任何 API。
- 共享改动：catalog cinema 加 `theme:'dark'`；main.js 进入模块时设置 `html[data-theme]`，回首页/404 清空；hub.css 末尾追加深色主题头部与 cinema 全幅规则；index.html 加 cinema 样式；资源版本 v18。
- 验证：check / check-cinema / check-bucketlist / check-contact / check-gallery / check-swipe 全部通过。浏览器：桌面与 375px 手机、点击与方向键切换、光盘飞行动画、错误条目提示、语法错误不影响其他页面、无海报光盘、返回首页恢复浅色。真实 TMDB 加片 5 部与重复检测通过。
- 限制：reduced-motion 仅代码与 CSS 覆盖，未在浏览器模拟；首页光盘拖入手势未手动重测（代码未改，check-contact 通过）；TMDB 在部分网络需代理。
- 使用说明：docs/片单使用说明.md；设计：docs/superpowers/specs/2026-09-28-cinema-design.md。
- 下一步：用户用真实片单替换 5 部示例；再按同样流程做 travel 或 stories。

## v0.19 片单改版：3D CD 架（Claude Code）
- 用户反馈 v0.18 文字多、银幕大、书脊粗糙。改为：左上角简笔 CD 图标 + 数量；返回仅简笔箭头（hub.css，文字留给读屏）；删除标题/银幕/放映光。
- 主体为 CSS 3D 珠宝盒横排（front/spine/edge/back 四面），书脊印海报左缘；悬停转动抬起，点击转正展示封面，再点进入详情（封面 FLIP 飞出、光盘滑出旋转、信息逐字浮现），Esc/关闭按钮原路收回并归还焦点。进场后自动转出最新一部。
- 横向滚轮/鼠标拖动/←→/Home/End/Enter；手机紧凑尺寸；reduced-motion 直接切换；-webkit-box-reflect 地面倒影（Firefox 无倒影）。
- 资源 v19。check 全部通过；浏览器 1280×800 与 375 宽验证：选择居中、详情开合两次、Esc 不退回首页、键盘打开。
- 进不去片单的问题：57123 上曾是无 no-store 的 `python -m http.server`，已换成 scripts/preview.py；用户需强制刷新一次。

## v0.20 片单 cover-flow 与筛选（Claude Code）
- 书脊变薄（14px / 手机 11px），左右两侧都印书脊；字体改为系统细体：Didot/宋体（标题）、Avenir Next / 苹方 Light（书脊与信息），无新增字体文件。
- Cover-flow：原生横向滚动 + scroll-snap，JS 按每个盒子离中心的距离连续计算转角/位移/深度，中间正对、两侧朝中间倾斜；方向键连按会累加（aim），滚轮/拖动会清除。
- 详情光盘修复：封面与光盘同一 flight 容器一起飞；光盘旋转为 CSS 动画，打开时开始、关闭时暂停在原角度再收回（不再回弹 0°）；去掉 backdrop-filter 降低卡顿；收尾统一 cancel 残留 fill 动画。
- 书架建立独立层叠上下文（rack z-index:1），筛选面板与详情不再被盒子遮挡。
- 左上角红框：全局 a:focus-visible 为砖红 2px 描边，深色主题改为淡金细线（hub.css 末尾）。
- 筛选/排序：右上角简笔滑杆图标 → 全部/电影/剧集 + 最近加入/评分/年份；非默认时图标带金点；逻辑 `viewFilms` 在 films.js，已加测试。
- 资源 v20。验证：全部 check 通过；1280×800 与 375 宽截图；光盘开合逐帧采样无跳变；排序与筛选结果正确。注意：浏览器面板在后台时动画不推进，测试动画需前台。

## v0.21 书架收拢与原版海报（Claude Code）
- 新增 `dist/modules/cinema/flow.js` 的 `pose(offset,w,d)`：转角 88·(1−e^(−|o|/.85))，位置 0.92w·(1−e^(−|o|))+(d+6)|o|，转动时后推 w/2·sinθ 让书脊与正面同一平面。中间正面、两侧逐渐收成书脊、边缘紧密排列，全程连续。
- 盒子只在滚动槽位里占位（pointer-events:none），视觉由 --x/--z/--turn 放置；倒影改为随盒子转动的翻转封面面（替代被切断的 -webkit-box-reflect）。
- 原版海报：`add-movie.mjs` 通过 TMDB images 选原始语言海报（优先出品国家/地区，粤语片按 zh），失败回退中文区海报；新增 `node scripts/add-movie.mjs --posters` 批量重取。现有 5 部已替换为原版（中/韩/英/日/港繁）。书脊文字仍为中文片名。
- 测试：pose 单调/对称/边缘收紧；pickPoster 语言与地区优先级。资源 v21。
- v0.22：左上角简笔图标光盘与盒子中心未对齐（像马克杯），已按统一中心线重画；资源 v22。

- v0.23：左上角数量图标改为单张光盘线稿（去掉盒子）；资源 v23。

## 部署（2026-09-28，Claude Code）
- GitHub 私有仓库 https://github.com/FrdHuy/fred-hub （origin，main）。本机 git 需经代理 127.0.0.1:7890 访问 GitHub；凭据在钥匙串。
- Vercel 项目 fred-hub，Root Directory = dist，无构建；push main 即自动部署。线上：https://fred-hub.vercel.app 已验证（首页、片单、海报、私有文件 404、cache revalidate）。
- 下一步：Vercel 添加 fredhu.top / www，阿里云云解析按 Vercel 给出的记录配置。步骤见 docs/部署.md。

- v0.24：焦点框只给键盘用户。main.js 记录输入方式（html[data-input=pointer|keyboard]），hub.css 在 pointer 模式隐藏所有 :focus-visible 描边；片单/清单模块的后代焦点样式同步处理。原因：路由切换后脚本 focus() 在鼠标/触屏下也会显示红/金框。资源 v24。

- v0.25：首页手势按方向判断（experience.js）：按在机票/光盘上先观望约 7px，横向交给轨道滑动，纵向才拿起物件，轻点光盘照旧读取。修复手机上从物件起手无法滑动。人生清单名称/封面/提示改为中文（catalog.js、experience.js）。本地手机尺寸验证：物件上横滑切换、纵推光盘进入片单、轻点光盘进入片单。资源 v25。

- v0.26：人生清单改为只读数据文件 dist/modules/bucketlist/data.js（text、done），规则 items.js，check-bucketlist 校验真实数据；去掉添加/移除/撤销和对应样式；若浏览器 localStorage 仍有旧条目，页面提示并可一键复制为 data.js 行（storage.js 只用于读取旧数据）。data.js 目前为空，等 Fred 填写。资源 v26。

## 设计语言统一（2026-09-28）
- 新增 `docs/DESIGN.md`：Soft Retro Industrial（博朗 / 八十年代日本电子 / TE）。首页严格统一为一个产品家族，内页可为“同一栋楼的不同房间”。PROGRESS、MODULES、撕页日历提示词已引用。
- 人生清单方向改为「百灯控制面板」（10×10 琥珀灯 = 100 件事，拨杆通电，液晶读数），竹签筒已放弃；开发前先出设计图给 Fred 确认。分支 claude/fortune-sticks 仍由 Claude 持有（将改名/重做）。

## v0.28 人生清单 · 百灯控制面板（Claude Code）
- 设计：docs/superpowers/specs/2026-09-28-life-panel-design.md（设计图经 Fred 确认）。首页面板拨杆（阻力+阈值，轻点/回车自动）→ 自检 → 进度 → 放大进入内页；内页读数屏 + 100 灯 + 年份里程表（回看人生）+ 选择旋钮（24° 档位）+ PRINT 逐行出纸。
- 数据 data.js 新增选填 year（仅 done 时）；目前清单为空，等 Fred 填写。
- 共享改动：catalog（panelCover）、experience（bucketlist 手势：纵向=拨杆，轻点=开机）、main（清单打开 FLIP：.panel → .deck，去掉通用子元素淡入）、hub.css（清单页返回改简笔箭头）。全局 `button{min-height:44px}` 会撑大灯，deck-lamp 已覆盖。
- 验证：全部 check 通过（新增 lampStates/回看/年份范围/旋钮/拨杆测试）；CDP 真实鼠标键盘测试：短拖回弹不开机、长拖开机并进入、旋钮转 3 档 001→004、里程表回拨到 2018 只亮 7 盏、PRINT 输出 38 行；1440 与 390 宽截图无溢出。
- 限制：无声音；灯在手机上约 17px，建议主要用旋钮/方向键浏览；Firefox 未测。
- 旧的竹签筒 / 陶瓷签筒方案保留在分支 claude/fortune-sticks，未合入。
