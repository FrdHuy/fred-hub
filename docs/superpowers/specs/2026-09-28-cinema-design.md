# 影院片单（cinema）设计 · v0.18 · 2026-09-28

状态：用户已确认，由 Claude Code 实现。

## 目标

把 cinema 模块从空占位变成一间深色“放映厅”：上方银幕放映选中的影片，下方是只露书脊的 CD 架。内容来自只有 Fred 能改的静态数据文件；可选用本机脚本从 TMDB 自动补全信息和海报。

## 用户决定

- 每个模块进入后可有独立风格，不必呼应首页（覆盖 MODULES.md 旧的“沿用暖白配色”要求）。
- 数据存成文件（方案 A），不在网页里编辑。访客没有写入途径。
- 字段：片名（必填）、原名、类型（电影/剧集）、年份、导演、评分（5 星可半星）、海报。不记录观看日期和短评。
- 接入 TMDB，但只在本机脚本里使用；网站运行时不请求任何 API。
- 布局：放映厅 + CD 书脊架。

## 数据

`dist/modules/cinema/data.js`，`export default [ … ]`，数组顺序即展示顺序（最新在前）。

| 字段 | 类型 | 必填 | 规则 |
| --- | --- | --- | --- |
| title | string | ✓ | 非空 |
| original | string | | |
| type | string | | `电影` 或 `剧集` |
| year | number | | 整数 1880–2100 |
| director | string | | 剧集填主创 |
| rating | number | | 0–5，步长 0.5 |
| poster | string | | `posters/` 下的文件名，jpg/jpeg/png/webp，不含路径 |
| tmdb | string | | 如 `movie/843`，脚本写入，用于去重 |

未知字段视为拼写错误。有错误的条目整条跳过，并在页面和检查脚本中报告“第 N 条：原因”。

## 页面

- 深色背景（暖黑）、暖金色点缀；标题衬线体，信息等宽小字。
- 进入：放映光从上方亮起 → 银幕闪烁 → 自动放映第一条。
- 银幕：海报 + 片名逐字浮现（片头字幕感）→ 原名/年份/类型/导演 → 星星逐颗点亮。当前海报大面积模糊作整页氛围色。全页淡胶片颗粒。
- 书脊架：竖排片名 + 年份；颜色取海报主色（canvas 取平均色），无海报为银灰。悬停上抬 + 反光划过；鼠标附近有跟随光。点击：书脊抽出 → 光盘滑出旋转 → 银幕切换。
- 无海报：银幕与封面显示银色光盘；海报加载失败同样处理。
- 空数据：显示 catalog 的 emptyTitle / emptyText。
- 键盘：书脊架为 listbox，←/→/Home/End 移动并放映，Tab 进入。手机：银幕在上，书脊架横滑。
- `prefers-reduced-motion`：无闪烁、颗粒、旋转，直接切换。
- 底部 TMDB 数据来源声明。
- 不做：详情页、排序筛选、URL 记录选中项。

## 共享改动（最小）

- `catalog.js`：cinema 增加 `theme: 'dark'`。
- `main.js`：进入模块时 `document.documentElement.dataset.theme = item.theme || ''`，回首页/404 清除。
- `hub.css`：`[data-theme=dark]` 下的页面背景、Fred. 字标、菜单按钮、返回链接变浅；`.detail-view[data-module=cinema]` 取消内边距以全幅铺满。首页不受影响。
- `index.html`：加入 cinema 样式表；资源版本 v17 → v18。

## 加片脚本 `scripts/add-movie.mjs`

`node scripts/add-movie.mjs <片名> [评分]`

1. 读 `.env` 的 `TMDB_TOKEN`；若 `.env` 或环境里有 `HTTPS_PROXY`，自动以 `NODE_USE_ENV_PROXY=1` 重启自身走代理。
2. `search/multi`（zh-CN）列出前 5 个电影/剧集，输入编号选择。
3. 取详情：电影 `credits` 中的 Director；剧集 `created_by`。
4. 下载 w500 海报到 `posters/<type>-<id>.jpg`。
5. 已有相同 `tmdb` 的条目则中止提示；否则插入 `data.js` 数组最前面。未给评分时询问，可留空。

纯函数（条目生成、插入源码、导演提取）放在 `scripts/lib/cinema-add.mjs`，可离线测试。

## 检查 `scripts/check-cinema.mjs`

- 解析 `data.js` 并报告错误；每个 poster 文件存在。
- 纯函数单测：校验规则、星级计算、插入源码、TMDB 响应 → 条目（模拟数据）。

## 文档

HANDOFF 所有权与 v0.18 记录；MODULES.md 独立风格规则与主题钩子；PROGRESS.md；`dist/modules/cinema/README.md` 使用说明。
