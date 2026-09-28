最新变更和验证见 [开发进度-v0.17.md](开发进度-v0.17.md)。

# 当前交接 · v0.17 · 2026-09-28

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
| travel / cinema / stories 内容 | 未分配 | 当前为空状态占位 |
| bucketlist | 未分配 | 手稿人生清单：添加、勾选、移除/撤销、本地保存 |
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
