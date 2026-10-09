最新变更和验证见 [开发进度-v0.30.md](开发进度-v0.30.md)。全局进度见根目录 PROGRESS.md。

# 当前交接 · v0.30 · 2026-09-28

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
| stories → 手记（打字机；dist/modules/stories/**；共享：catalog 封面/名称、experience 分支） | Claude Code | v0.33 已完成（占位文章），无运行中编辑 |
| bucketlist 百灯控制面板（dist/modules/bucketlist/**；共享：experience.js 中 bucketlist 分支、catalog.js 中 bucketlist 封面、main.js 中清单打开动画、hub.css 清单返回箭头） | Claude Code | v0.28 已合入 main，无运行中编辑 |
| travel 翻牌屏（dist/modules/travel/**；设计见 docs/design/travel.md） | Claude Code | v0.31 已完成（占位数据），无运行中编辑 |
| music 磁带（dist/modules/music/**、scripts/music-picker.mjs、scripts/tapedeck/、scripts/check-music.mjs；共享：catalog 封面、experience 控制器、main.js 进门起点、hub.css 返回箭头、sound.js 新声音） | 搁置 | v0.37.1 Fred：效果太差，从首页和菜单撤下；源码保留、未注册（catalog / modules/index.js / index.html 样式链接已去掉） |
| 3D 小屋 `#/room`（dist/room/**、dist/vendor/three-0.170.0/**、scripts/vendor-three.mjs、scripts/check-room.mjs；共享：index.html 加 #room-view 与样式链接、router.js 加 room 路由、main.js showRoom 与路由分支；设计 docs/design/room.md） | Claude Code | 分支 `claude/room-3d`，第 1 阶段完成，未合入 main、未推送 |
| wheel | 已删除（v0.35.2，Fred 决定） | 源码、compass.png 与相关 CSS 已移除 |

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

## v0.29 人生时间线 + 光盘质感（Claude Code）
- 年份拨轮修复：原范围从清单最早年份到今年，空清单时只有 2025–2026，看起来“滚不动”。现在至少回看十年（或到最早年份），到头时滚筒轻弹提示。
- 人生大事件：data.js `{ text, milestone: true, year }`，冷白色灯（愿望完成仍为琥珀）；回看早于其年份时不亮；读数 `◎ MILESTONE · 年份`，计数附 `◎ nn`，打印纸标 ◎。
- 200 条候选：docs/人生清单候选-200.md（10 类 × 20，勾选 [x] + 年份，删不要的，末节写大事件）→ `node scripts/import-lifelist.mjs`（>100 条会拦下；已有数据需 --force）。导入顺序：带年份的大事件与完成事项按年份在前，拨年份时灯从左到右依次亮。逻辑在 scripts/lib/lifelist-import.mjs，已测。
- 光盘：dist/sheen.js（main.js 挂载）让虹彩角度与高光随鼠标 / 手机倾斜缓动（iOS 未请求权限，保持默认）；hub.css `.silver-disc` 背景加 --sheen/--gx/--gy。光驱：液晶 NO DISC → READING → `nn TITLES`（读取 cinema data.js 数量），EJECT 键（插入中按下退盘，空闲时指示灯闪）。
- 验证：全部 check 通过；CDP 真实输入：光源三方向 sheen 变化、推入光盘 READING → 05 TITLES → 进入片单、空清单年份可回拨到 2016。推得过深会脱离插槽（原有设计）。

## v0.30 真实清单 + 旋钮质感 + 每模块一处砖红（Claude Code）
- Fred 勾选完成：66 条（大事件 4、做到 25、愿望 37），已导入 data.js。修正一处笔误「在雪山露营晚」→「在雪山露营一晚」。
- 导入顺序改为按内容：大事件（按年份）在前，其后按文档主题分组，每组内做到的（按年份）→ 未写年份的做到 → 愿望。文档同步重排。测试已更新。
- 旋钮重做：滚花外圈 / 车削铝顶盖 / 凹刻指示线三层，光影固定在左上不随旋转；刻度环更细；标签与刻度拉开。
- 砖红：机票 ✈、光盘标签句点（`FRED’S COLLECTION.`）；DESIGN.md 改为“每个模块只点一处砖红”。读卡器状态灯的红色表示 ERROR，故不在读卡器上放砖红。
- 资源 v30。全部 check 通过；截图核对首页三物件、内页真实数据、旋钮特写。

- v0.30.1：人生清单导入顺序改为按文字哈希打散（scripts/lib/lifelist-import.mjs 的 scatter）：看起来随机、刷新不变、新增条目不挪动其他条目；已重新导入 66 条。

## v0.31 旅行 · Solari 翻牌屏（Claude Code）
- 设计：docs/design/travel.md（v7 设计图经 Fred 确认）。首页登机牌 + 闸机不变；内页深色候机大厅：平面哑光翻牌（标题 ARRIVALS/DEPARTURES、目的地 12 格、时钟），其余等宽小字；点一行，出纸口吐出暖白登机牌（全页唯一砖红 ✈）。
- 文件：dist/modules/travel/{index.js 页面, flap.js 翻牌引擎, trips.js 纯数据规则, data.js, style.css, fonts/（Barlow Semi Condensed 500 自托管子集 5.8KB + OFL）, photos/}；scripts/check-travel.mjs。
- 数据：data.js `{ home, arrivals, departures }`，目前是**占位示例**（台词带“（占位）”），Fred 按 docs/旅行行程-填写.md 填好后替换。航班号按时间编号；DEPARTURES 状态：最近一个未过期日期 BOARDING、其余 SCHEDULED、已过期 DELAYED、无日期 SOMEDAY。没照片时显示按三字码生成的天空色块。
- 共享改动：catalog travel `theme:'dark'`；index.html 加 travel/style.css；modules/index.js 带版本号；hub.css 返回简笔箭头加 travel；资源 v31。
- 交互：ARR/DEP 拨档或点标题整屏翻牌；Esc 先收登机牌（document 捕获阶段拦截，菜单打开时不拦），再按一次回首页；↑↓ 在行间移动；reduced-motion 直接显示终态。
- 验证：全部 check 通过；CDP 真实点击：展开/换行/Esc 收起不离开页面/切到 DEP（BOARDING,SCHEDULED,SOMEDAY,SOMEDAY）/回首页主题复位；1440 与 390 宽截图无横向溢出；reduced-motion 下 0 个动画。
- 未做：翻牌声音（等全站声音开关）；首页登机牌仍是 HERE → THERE / FH 001，可以以后联动最新航班。

## v0.32 全站打磨：基础 / 质感 / 数据 / 进门 / 声音 / 维护（Claude Code）
- 基础：字标自托管 Inter 600 子集（dist/fonts/，所有设备一致）；首页图片下载 3.1MB → 0.1MB（fred-diary 转 700px WebP，删除从不显示的 collection-atlas.png 与未用的 cd-player.png）；片单/清单/旅行返回箭头统一在页眉 5% 边距；片单计数改等宽 `05`；分享图 dist/og.jpg + og:image。
- 令牌：新增 dist/tokens.css（最先加载）——字体变量 `--font-wordmark/-mono/-ui/-literary`、材质变量（暖白/灰绿/石灰外壳、液晶、纸）。全站硬编码字体栈改为变量（首页 11 处裸 monospace）。闸机改石灰外壳；人生清单灯去亮珠高光、读数屏去斜反光。
- 数据：首页登机牌显示下一班（catalog.js 读 travel data）；`node scripts/import-travel.mjs` 把 docs/旅行行程-填写.md 写成 data.js（scripts/lib/travel-import.mjs，已测）；docs/填写真实数据.md 一页说明。
- 进门：main.js `openRoom()` 取代奶白 FRED 幕布——从首页进片单/旅行时读数屏长成房间，其余用目标页底色淡出。`.fred-curtain` 已删除。
- 声音：dist/sound.js（`play(name)` / `soundOn()` / `setSound()`），默认关，页眉左侧喇叭开关（localStorage `fred-sound`）。接入点：experience.js status()、panel-home powerOn、清单旋钮/里程表/PRINT、片单 pick、旅行翻牌/出纸/拨档。
- 维护：styles.css 16.6KB → 8.7KB、hub.css 31.6KB → 25.9KB（删除 192 条选择器，类名在所有 JS/HTML 中都不出现；动态拼接的前缀视为存活）。删除前后对 21 个页面/状态（含闸机 reading/error/success、光驱 reading、菜单、登机牌、打印、404、手机）做确定性截图（冻结时钟 + reduced-motion），逐像素一致。本地旧分支已删，未合并的 fortune-sticks 存为 tag archive/fortune-sticks。资源 v32。
- 共享文件改动：index.html、main.js、experience.js、catalog.js、styles.css、hub.css、tokens.css（新）、sound.js（新）。**Codex/GPT 的 codex/tear-calendar 合并时注意**：styles.css/hub.css 删了大量旧规则，stories 相关的 `.diary-*` 规则保留未动。
- 未做（Fred 暂缓）：片单首张左半空与 TMDB 署名、日记页、手机首页位置读数、首次示范、「关于 Fred」。

## v0.33 手记（打字机）+ 缎面拨杆（Claude Code）
- stories 改为「手记」：首页暖白便携打字机（设计 docs/design/notes-typewriter-v3.html；唯一砖红 = RET 键），纸上是最新一篇公开手记的标题。手势：纵向按住 RET 往下压（26px，阈值 .62）→ 响铃、纸卷出 → 进门；轻点/回车自动按下。进门时打字机的纸长成页面（main.js openRoom）。
- 内页：桌上的稿子（按 id 固定的微倾斜，年份筛选，`NN MANUSCRIPTS`）→ 阅读页（一张稿纸；照片像贴上的相片；FIN；上一篇/下一篇）。私密篇盖 CONFIDENTIAL 章，点开后在打字机上敲暗号（实体键盘、手机键盘、屏幕按键都行）：错了响铃、纸抖、清空；对了纸卷出、正文出现；在手记内部（桌面↔文章）保持解锁，离开手记再进来要重新输入（v0.33.3）。
- 写作：notes/*.md（开头 标题/日期/类型 必填；地点/旅行/大事件/暗号 选填；照片放同一文件夹）→ `node scripts/publish-notes.mjs` → dist/modules/stories/data.js + media/（sips 压到 1600px，文件名为内容哈希）。有暗号的正文用 AES-GCM（PBKDF2 12 万次）加密后才写进 data.js（dist/modules/stories/seal.js，浏览器与 Node 共用）。notes/ 不部署；仓库是私有的，但暗号也在 notes/ 原文里。说明见 notes/README.md。
- 路由：新增子路径 `#/collection/<id>/<sub>`（router.js）；同一模块内切换时 main.js 调用模块 cleanup.route(sub)，不重新挂载。手记用它打开文章；旅行 `#/collection/travel/FH 006` 打开那一趟登机牌；清单 `#/collection/bucketlist/<原文>` 选中那盏灯。
- 联动：登机牌底部 `READ THE LOG →`（同三字码、90 天内最近的一篇游记）；手记游记 → `FH 006 · MSN ✈ KEF →`；阶段 → `◎ 大事件 →`；清单读数屏出现 `READ →`。
- 声音：新增 type / bell / feed。注意：模块内若已有本地 `play` 动画函数，声音用 `import { play as sound }`（v0.32 曾因重名导致切换失灵）。
- 人生清单拨杆改为缎面结构（滚花螺母、垫圈、球轴、渐细拨杆、哑光红套头）；阴影用 cos/sin 反向旋转，光始终在左上。DESIGN.md：金属只做缎面。
- 删除：日记本 fred-diary.webp、hub.css 里的 diary/journal 规则和 stories 占位页样式（13 条死选择器 + 旧 .detail-view[data-module=stories]）。资源 v33。
- 验证：新增 check-stories（头部、Markdown、封印往返、联动规则、data.js）；全部 check 通过。CDP 真实输入：短按回弹/长按进门、打开文章、Esc 回桌面、错暗号清空、对暗号解锁、会话内记住、手记↔旅行↔清单三向链接；1440 与 390 宽无横向溢出。
- 调试记录：隐藏输入框在 Chrome 中光标不在末尾，逐字输入会被倒序（fred → derf），暗号永远不对。改为暗号保存在变量里，输入框只接收按键后清空。
- 占位：notes/ 里 4 篇示例（标注“（占位）”，私密篇暗号 fred）与 3 张占位图。

- v0.33.1（Fred 反馈）：① 打字机加滑架（.tw-carriage，carriage.js）：首页按 RET → 打出 READ ON（每一击滑架左移一格）→ 响铃 → 滑架被推回右侧撞停（微回弹 + 回车声）→ 换两行 → 纸卷出；暗号页每敲一个字滑架左移一格，退格右移，错了滑架推回并清空，对了推回、换行、出纸。② 首页打字机居中（比格子宽时 grid 会把它挤到一边，改为从自身中心定位）。③ 手势：鼠标按在物件上任何方向都抓物件（3px），不再被判为横滑；触屏规则不变。④ 全站去掉焦点框（`*:focus{outline:none}`，删除各处 focus 样式）。Fred 的质量排名：机票 > 人生清单 > 电影片单。
- v0.33.2：首页打字机的纸改为空白 + 闪烁光标；按 RET 后逐字打出最新一篇的标题（中文也行，滑架按每个字的实际宽度左移），再响铃、推回、换行、出纸（Fred 的提议）。

- v0.33.3：① 暗号只在手记内有效，离开模块即忘（不再用 sessionStorage）。② 翻牌屏（电脑/平板）加统计条：FLIGHTS / COUNTRIES / DAYS AWAY / NEXT DEPARTURE（T-080 倒计时，翻牌显示）；表格加 PAX（同行人数+1，从「同行」拆分）与 LOG（有游记时显示）；标题下改为 SINCE · LONGEST。手机隐藏统计条和新列，保持紧凑。trips.js 新增 pax / daysUntil，stats(travel, today)。

- v0.33.4 片单勾选器：`node scripts/cinema-picker.mjs` 在本机开一个 127.0.0.1 小服务 + 海报墙（scripts/picker/index.html）：电影/剧集 × 大家都看过/高分/华语/日韩/按年份/我的片单 + 搜索，点海报=看过，保存时并发 4 路补全详情与原版海报（w500）写入 data.js（scripts/lib/cinema-list.mjs 纯函数，已测）。评分改为影片自己的 TMDB 分数（tmdbStars：vote_average/2，半星，投票 <20 不显示；片单详情星星旁标 TMDB）；add-movie 不再要评分。代理：scripts/lib/proxy.mjs 自动用环境变量 → macOS 系统代理（scutil --proxy）→ 常见端口，Fred 的 .env 里不需要写代理。片单页海报改为接近视野才加载（IntersectionObserver，rootMargin 900px），避免片单变长后一次拉几十 MB。
- v0.34 片单扩容：Fred 用勾选器录入 225 部。① 性能：尺寸只在 resize 时测量；每帧只摆放可能出现在屏幕上的盒子（reach 按 pose 计算，约 ±6），其余加 .is-far 隐藏——实测 173 个盒子时每帧 16.7ms。② 系列套装：films.js 新增 series 字段与 boxSets()；同系列 ≥2 部合成一个加厚的套装盒（×N），详情列出系列各片，可逐部打开、← 返回系列。`node scripts/cinema-series.mjs` 从 TMDB belongs_to_collection 回填（225 部中 129 部有系列，合成 28 套，架上 225 → 173）；勾选器新增的片子自动带 series。③ 一点红：光驱的 EJECT 键改为砖红功能键，光盘标签句点改回灰色（DESIGN.md 同步）。
- v0.34.1 旅行录入工具：`node scripts/travel-recorder.mjs`（本机 127.0.0.1）。城市搜索用 OpenStreetMap Nominatim（accept-language=en，带 User-Agent）；国家名用 Intl.DisplayNames 转中文；机场用 OurAirports 公开表（首次下载后缓存 scripts/.cache/airports.json，已 gitignore），airportChoices 优先 150 km 内的大型国际机场（雷克雅未克 → KEF 而不是 RKV），另给 2 个备选。照片拖入 → sips 1600px → dist/modules/travel/photos/。保存写回 docs/旅行行程-填写.md（formSource，与 parseTravelForm 互逆，已测）和 data.js。
- v0.35 片单两层：默认「放映表」（pick: true 的片子，CD 货架 + 详情里显示 note；未选时用 TMDB 最高分 16 部代替）；「全部看过」= 观影报告（看过/导演/年代/最长系列/跨度，films.js report）+ 按年份的海报墙（byYear，可按电影/剧集筛选，点开是固定在屏幕上的详情）。访客「你看过几部？」：勾放映表里看过的 → 重合数、百分比、3 部推荐（overlap），只存 localStorage fred-cinema-seen。旧的筛选/排序面板移除。勾选器新增「★ 放映表」标签（pick + note，applyChanges curated）；修复切换标签时旧请求结果混入新标签的竞态（loadToken）。
- v0.35.1 夜间巡检（Claude，Fred 睡觉时自主完成）：14 个页面状态 × 电脑 1440 / 手机 390 截图审查，无 JS 报错、无横向溢出。修复：① 片单「你看过几部？」的关闭 × 与右上角菜单重叠、标题压在 Fred. 下面 → 浮层内容下移到头部之下，背景改为不透明；② 同一浮层里海报格子是 2:3 固定比例，片名溢出被下一行海报盖住 → 格子高度随内容，图片自己保持 2:3；③ 手机「全部看过」统计格边线错位（第 3 格缩进、竖线断开）→ 两列网格，奇数列无左线、首行无上线；④ 手记手机端 CONFIDENTIAL 章超出稿纸 → 手机上缩小。资源 v37。全部 check 通过。待 Fred 决定的事项见 docs/待决定.md。
- v0.35.2 Fred 的决定（见 docs/待决定.md）：片单货架保持居中、TMDB 声明保持、手机首页不加位置点、不做首访演示、打字机节奏保持、READ → 保持；「关于 Fred」等数据齐了再做；fredhu.top 已绑定。删除转盘：dist/wheel.js、dist/modules/wheel/、assets/compass.png、hub.css/styles.css 中全部 wheel/compass/tool-intro/spin-button 规则（逐条核对，未改动其他规则）；check.mjs 改为断言它们不存在。资源 v38。下一轮：手记整体视觉打磨（12B）。
- v0.36 手记打磨（Fred 决定 12B）：① 桌上稿子统一为打字机纸上那样的一行打字头 `Nº 004 · CHAPTER`（去掉各式方框印章），倾斜收敛到 ±0.9°、下沉 0–8px；稿纸加细纸纹（内联 SVG 噪点，--grain，无外部文件）；底部改为日期 / 地点两端，去掉卡片上的 MIN。② 私密稿：模糊条 + 大印章 → 一条横过稿纸的纸封条（锁形图标 + CONFIDENTIAL），标题仍可见。③ 打开：点哪张稿子，阅读页就从那张稿子的位置和角度长出来、摆正（560ms，内容稍后淡入），配新声音 `paper`（sound.js，纸张掀起的沙声）。④ 阅读页：顶部同样的打字头；照片一行等高、按各自比例分宽（加载后设置 --r），每张用一条胶带贴住，图注统一为居中等宽小字。⑤ 暗号页：底部 TYPE THE PASSWORD · RETURN / CLOSE 文字去掉，改为右上角 ×（与片单一致）。资源 v39；全部 check 通过；CDP 走查：打开、Esc、错/对暗号、× 关闭均正常。
- v0.37 磁带（随身听）新模块：首页是灰绿外壳的随身听（一处砖红：PLAY 键），按住 PLAY 往下按过阈值 → 键锁住、磁带轮转、指示灯亮、VU 指针动 → 磁带窗长成房间（与打字机/面板同一控制器 hold/release/auto/reset）。房间：大随身听 + J 卡曲目表 + 桌上的磁带。拖磁带进仓门（或轻点）→ 飞入、咔哒；PLAY 真放歌（dist/modules/music/deck.js：<audio> → Web Audio 磁带链：140Hz 暖、7kHz 高架 -4dB、12.5kHz 低通、wow & flutter 调速且不保音高、底噪、启动变调 0.55→1、停止降速；AnalyserNode 驱动 VU）；STOP 停，停着再按 = EJECT；◀◀ ▶▶ 点一下换一首，按住连续卷带；在磁带轮上画圈 = 铅笔倒带（顺时针前进，一圈 6 秒）；点仓里的磁带 = 翻面；一面放完 PLAY 弹起（halt）。三位机械计数器、带盘随进度一边变小一边变大。数据 tapes.js 纯函数（runtime/locate/counter，已测）。曲目有 audio（Fred 自己的整首文件）就放整首，否则放苹果官方 30 秒试听（CORS *，可接 Web Audio）。录入工具：`node scripts/music-picker.mjs` 录音台（iTunes 搜索、A/B 面、排序、拖入音频文件、保存写 data.js；scripts/lib/music-list.mjs 已测）。sound.js 新增 play / clack / wind / halt。占位歌单 3 盒 19 首（标（占位））。资源 v40。说明 docs/磁带-填写.md。
- v0.37.1 磁带搁置（Fred：效果太差，原因是没有先讨论设计）。从注册表、首页、菜单撤下，源码与录音台保留。今后新模块：先和 Fred 讨论设计（内容、物件、交互、视觉稿）并确认，再写代码。
- v0.38 扭蛋机 · 第 1 步（设计全程与 Fred 讨论，定稿见 docs/design/gashapon.md 与 gashapon-v1…v8.html）：新模块 dist/modules/gacha/。首页物件：B1 正面（暖白顶盖 + 底座夹住灰绿亚克力仓，扭蛋分三层，越往后越被亚克力染色；小星座旋钮、缎面扭把 + 砖红握柄帽、出蛋口、右边缘滑块 + 两个小图标；无任何提示文字）。仓里的扭蛋每次打开随机（machine.js pile：约 1/8 是 8 种彩蛋之一；约 1/4 的仓里能看到一颗磨砂灯蛋，最多一颗）。首页手势：按住机器绕扭把画圈（顺时针，最多一圈，每 30° 棘轮一响），满一圈 → 一颗蛋掉进出蛋口翻板后面（sound roll）→ 仓长成房间；不满一圈松手就弹回；轻点 / 回车 = 自动转一圈（machine-home.js，与面板 / 打字机同一控制器形状；experience.js 的 hold 现在多传一个 pointer 事件）。房间目前只有布局（机器 + 空桌面，手机上下排）——第 2 步做扭、拧开、签纸 / 题卡。检查 scripts/check-gacha.mjs。资源 v41。**第 1 步只提交、未推送**（房间还是空的，不上线）。
- v0.39 扭蛋机 · 第 2 步：房间可以玩了（dist/modules/gacha/index.js）。机器上：扭把（绕扭把画圈，每满一圈出一颗蛋；轻点 / 回车 = 自动转一圈；不满松手弹回）、星座旋钮（拖着转，12 格吸附；轻点 = 下一个；←/→）、滑块（点上半 = 签，下半 = 游戏；记在 localStorage fred-gacha-mode / fred-gacha-sign）。蛋从出蛋口翻板后滚出、划一道弧落到桌上（桌上最多 4 颗未开的）。按住蛋画圈拧（任一方向 200°）：蛋跟着转、中缝下沉，到位「pop」一声打开；不到位松手合回；轻点只晃一下；回车直接开。打开后两半蛋壳落到桌面右下角（最多 12 对），内容从蛋的位置展开落到桌面中间，新的盖在最上、旧的退后（最多 6 张）：签档 = 竖排签纸（电脑直接摊开，按桌面大小缩放；手机是一张折着的小签，点开全屏阅读，点任意处 / Esc 关闭），游戏档 = 真心话 / 大冒险题卡（同一场不重复），彩蛋 = 占位内容（磨砂灯蛋一张带暖光的卡）。fortune.js：真实公历 / 农历（Intl 中国历）/ 日干支，同日同星座同一签（slipIndex 哈希）；签诗与宜忌仍是示意（第 3 步：观音灵签 100 首核对 + 建除十二神宜忌）。games.js：题库文本（「真：」/「冒：」一行一题，示意 24 道）、createDeck 不重复抽题、彩蛋占位文案。sound.js 新增 pop。检查 check-gacha 扩充。资源 v42。
- v0.39.1 扭蛋机（Fred 反馈）：① 签纸正面去掉「第 X 签」，只留签等。② 签纸两面：点一下翻到背面（电脑在桌上原地翻；手机在阅读页里翻，点背景关闭），背面 = 解签 · 今日宜忌 · 星座五项运势（综合 / 感情 / 财运 / 事业 / 健康，星级 + 讲具体事情的解析，参考陶白白那样的口吻，**不写行星理论**）；目前是示意，fortune.js reading() 的结构就是真数据的结构。③ 普通扭蛋改为十种样式混装（STYLES，暖白约 40%），彩蛋只有珠光蛋（约 1/30）和磨砂灯蛋（约 1/40）（pickKind，首页与房间共用）。④ 桌角「清空」小图标：纸、蛋壳、未开的蛋一起滑出桌边。⑤ 修正：放蛋的图层铺满桌面挡住了签纸的点击（pointer-events）。资源 v43。
- 下一步（数据）：星座运势用真实行星位置（天文算法）按传统规则打分，解析文案原创；黄历按建除十二神等规则计算宜忌、冲煞；观音灵签 100 首 + 解签，从公开来源整理并逐首核对。
- v0.40 扭蛋机 · 真实数据：① astro.js 行星位置（Paul Schlyter 算法），与 NASA JPL Horizons 对比 5 个日期 × 7 个天体，最大误差 0.034°（fixtures/horizons.json，check 里自动比对）。② almanac.js 黄历：月建由太阳黄经定（立春 315° 起寅月），建除十二神 → 宜忌；冲煞按日支；已与已出版黄历核对（2024-02-10 甲辰满日冲狗煞南、2026-01-01 乙亥闭日冲蛇煞西）。注意：只取建除这一层，与商业黄历的完整神煞表会有出入。③ horoscope.js 星座五项运势：真实行星位置 → 以星座为第一宫的整宫制 → 按传统规则打分（感情看金星 / 月亮与五、七宫，财运看木星与二、八、十一宫，事业看十宫与土星压力，健康看一、六宫）；解析文案原创、讲具体生活场景、不提行星（陶白白式口吻）；同日同星座固定。④ lingqian.js 观音灵签 100 签：底本 suanming.io（只收传统原文：签等、典故、签诗、诗意、解曰、仙机六项；不收其现代白话），校本新浪博客全文，18 处校改 + 3 个繁转简，全部记录在 docs/design/lingqian-sources.md；观音灵签有不同传本（周易网第一百签不同），本站固定此版。⑤ 签纸正面：日期 · 上/中/下签 · 签诗 · 解曰 · 星座印；背面：解签（典故、诗意、解曰、仙机）· 今日（建除日、宜、忌、冲煞）· 星座五项（星级 + 解析）。资源 v44。
- v0.41 旅行：Fred 用录入工具录入真实行程（25 趟去过的、6 个想去的，20 多张照片），占位行程全部替换。按 Fred 的决定：① 出发地一律印 **FRED**（trips.js ORIGIN；某趟自己写了「出发」机场时仍用它的），首页机票、登机牌、手记里的航班标签同步；翻牌屏底部改为「FRED AIR」。② 不写同行的人：登机牌没有 WITH 栏，翻牌屏没有 PAX 列（有任何一趟填了同行才出现）。③ 拼写与机场：Las Vegas、SAN FRAN（12 格放不下 San Francisco）；搜国家 / 地区名时工具选了地理中心附近的小机场，改为 MSN / XNN / LIM / KEF / FCO / URC / SYD / AKL。资源 v45。
- v0.42 扭蛋机：① 公开题库 100 道（真心话 50 / 大冒险 50，games.js BANK）。② 隐藏通道（给 Fred 和对象）：在房间里按一串暗号操作（滑块上/下 + 星座旋钮左/右，共 8 步）再转一圈扭把 → 扭蛋仓由灰绿绽成暖粉、仓里的蛋一起跳一下、滑块旁亮起第三个小图标（心形）、四声上行的小铃（sound chime）；之后抽题 = 公开题库 + 情侣题库（题卡标 ♡）；同一设备记住（localStorage fred-gacha-key），再按一次暗号退出。情侣题目原文在 `notes/couple-bank.txt`（不部署，暗号也只写在那里），`node scripts/seal-couple.mjs` 用暗号把题库 AES-GCM 加密成 dist/modules/gacha/couple.js；网站上只有密文，代码里不写暗号（每次满圈拿最近 8 次操作去试解密）。为此滑块改成真开关：点已在的那一半只会「顶一下」不翻面；旋钮点左半 / 右半 = 左 / 右一格。check-gacha 断言 dist/ 里搜不到暗号和题目原文。局限：8 步、每步 4 种，有心人可离线穷举（约 6.5 万种），定位是彩蛋不是保险箱。资源 v47。
- v0.42.1 扭蛋机隐藏通道不再记住（Fred）：离开房间或刷新就恢复普通机器，每次都要重新按暗号；旧版本存下的 localStorage fred-gacha-key 进门时清掉。资源 v49。
- v0.42.2 扭蛋机：珠光蛋和灯蛋只存在于隐藏通道里（普通机器的仓里和出蛋都不再有；`pickKind(rnd, easter)` 第二个参数为 true 才会出，`pile()` 不再放）。进门后仓里有两颗蛋变成珠光 / 灯蛋，第 8 颗必出珠光蛋、第 9 颗必出灯蛋（index.js PEARL_TURN / LAMP_TURN），之后才按概率出。珠光蛋 = 桌上一只盒子（`.gcr-box`，点一下掀盖；盒身和盒盖是一层层薄片叠出来的圆角实体，俯视约 44°，盖子绕后沿 rotateX，珍珠和钻是立起来朝向镜头的 SVG）；灯蛋 = 一封信（`.gcr-letter`），片刻后自动跳到手记阅读页显示。密封内容改成对象 `{ questions, letter }`（seal-couple.mjs 同时读 `notes/couple-bank.txt` 和 `notes/couple-letter.txt`）。手记新增「客人稿」`stories/guest.js`（setGuest / getGuest，只在内存里）：别的模块可以递一篇不在 data.js 里的稿子给阅读页，路由 `#/collection/stories/<guest.id>`，返回箭头和 Esc 回 `guest.back`，有 `sign` 时用落款代替 FIN，类型 `letter`。从信回来时门还开着（模块级 resume，只活在这次页面里）。`notes/couple-*.txt` 已加入 .gitignore 并从 git 里取消跟踪（仓库是公开的；此前提交过的版本仍在历史里，暗号需要 Fred 决定是否更换）。games.js 的 SPECIAL / PEARL 占位删除。从信回来时整张桌面原样保留（没拧开的蛋、纸、盒子、蛋壳；去别处则关门）。桌上最多等 6 颗蛋，满了再转会晃一下提示。开珠光蛋时桌上的纸和蛋壳全部滑走；盒子合着时项链不显示（否则会穿过盒盖）；开盒：盖子慢慢掀起、盒内暖光、金色光点上升、四周压暗、盒子略放大、小铃。资源 v55。

## v0.43（分支 claude/room-3d，未合入 main）3D 小屋 · 第 1 阶段（Claude Code）
- Fred 想试一个 3D 等距微缩场景作为导航：花园里的温暖小木屋，傍晚黄金时刻，注重光影。方案与决定见 docs/design/room.md。**首页 `#/` 不变**，小屋在 `#/room`。
- 新增：dist/room/（config 物件↔模块映射、scene 地块与小屋、garden 花园、decor 摆设、objects/ 八件物件、lights 灯光与时刻预设、effects 光束与微尘、view 镜头限制、index 入口、style.css）；dist/vendor/three-0.170.0/（自托管，768KB）；scripts/vendor-three.mjs；scripts/check-room.mjs。
- 共享改动：router.js 新增 `{ type: 'room' }`；main.js 新增 showRoom()（动态 import，离开时停渲染循环）、showRoute 的 room 分支、Esc 在小屋里不回首页（第 2 阶段用来关闭面板）；index.html 新增 `<main id="room-view">` 和 room/style.css；资源 v56。dist/modules/** 没有改动。
- **新库**：Three.js 0.170.0（Fred 指定）。仍然无构建、无 npm：文件直接放在 dist/vendor/。
- 验证：全部 check 通过（新增 check-room）；浏览器 1440×900 与 375×812 截图；镜头限制用脚本验证（方位角 11°–79°、俯仰 40°–73°、距离 0.45–1.12 倍）；一帧约 550 次绘制调用、1.9 万三角形；首页与手记页回归正常。注意：应用内浏览器面板在后台时 document.hidden 为真，渲染循环按设计暂停，拖动 / 滚轮只能在前台或 Fred 自己的浏览器里看。
- 下一步：第 2 阶段（悬停 / 点击 / 镜头推近 / 模块整页淡入 / 键盘），等 Fred 看过第 1 阶段的画面再做。
- **第 2 阶段 + 可转到屋后**（同一分支，Claude Code）：新增 dist/room/interact.js（悬停 / 标签 / 点击 / 键盘）、cutaway.js（挡视线的墙自动隐去）；view.js 加 closeUp / back 缓动并取消方位角限制；scene.js 改为四面墙各自成组；地块向后扩、栅栏围一圈、屋后加花草；kit.js 加 own / fade / rod。共享改动（main.js）：mountRoom 传入 open / tint / sound；`roomReturn` + `goBack()`（从小屋进来的模块页，返回箭头 / Esc / 模块的 navigate() 回 `#/room`）；detail 上的返回箭头点击拦截（手记自己把箭头指回 `#/`）；进小屋时不再用 openRoom 幕布（小屋有自己的）。模块目录没有改动。验证：脚本驱动真实指针事件——悬停冰箱出标签「旅行」、未建模块显示淡色标签且光标不变手型、点击后 0.95s 推近并打开 travel、返回后机位复原且控制器恢复、转到屋后西 / 北墙与挂件隐去且不可拾取、键盘聚焦出标签；真实页面走通 旅行 / 手记 / 扭蛋机 的进入与返回（箭头、Esc），直接打开模块网址时返回仍是首页。全部 check 通过。下一步：第 3 阶段（Bloom、性能档位、WebGL 降级截图）。
- **第 3 阶段**（同一分支，Claude Code）：effects.js 加 Bloom（EffectComposer + UnrealBloomPass + OutputPass，半浮点离屏、4× 抗锯齿，用到才创建）；新增 quality.js（档位 4…0 + 帧率自动降档 + 记住）、flat.js（静态截图 + 2D 链接）、enter.js（先判断设备再决定加载 3D，main.js 改为导入它）、fallback.jpg（227KB，从场景渲染）。验证（无头 Chrome）：无显卡加速时自动走静态版且不下载 three；WebGL 创建失败时回退到静态版；带显卡时 0–4 各档截图正确、均 60 帧（M5 Pro）；静态版链接可进模块。全部 check 通过。说明见 docs/design/room.md「性能档位」。
