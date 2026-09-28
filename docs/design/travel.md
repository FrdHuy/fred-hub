# 旅行足迹 · 翻牌屏设计（2026-09-29 Fred 确认）

设计图：`travel-board-v7.png`（源文件 `travel-board-v7.html`），字体对比：`travel-flap-fonts.png`。

## 故事
首页登机牌刷过闸机（保持不变）→ 进入深色候机大厅，Solari 翻牌屏字牌翻落 → 点一行，屏下出纸口“打印”出这一趟的登机牌。台钟（v4）方案已放弃。

## 视觉（现代复古）
- 翻牌：纯平哑光 `#1c1d1b`，无渐变/高光/圆角，仅中线 1px 缝，格间 2px。复古感靠动作，不靠拟物渲染。
- 只有标题（ARRIVALS/DEPARTURES）、目的地、时钟用翻牌；日期、航班号、三字码、天数、状态都是等宽小字。
- 翻牌字体：Barlow Semi Condensed 500，自托管 woff2 子集（A–Z 0–9 与少量标点），不依赖 Google Fonts（国内可访问）。其余小字用站内等宽体。
- 目的地栏固定 12 格，空格极暗 `#141514`。
- 背景纯平 `#0e0f0e`，行间发丝线；状态只有“当前”一条用黄 `#f2c318`。
- 砖红只在登机牌上的 ✈（全页唯一一处）。
- 翻牌上只用英文；中文只出现在登机牌上（同行、一句话，宋体）。

## 内容
- 列：DATE / FLIGHT（`OCT 2024`、`FH 010 · KEF`）｜ DESTINATION ｜ DAYS ｜ REMARKS。
- ARRIVALS = 去过的（ARRIVED，最近一趟黄色）；DEPARTURES = 想去的（最近定了日期的 BOARDING 黄色，其余 SCHEDULED，没日期 SOMEDAY）。
- 顶部统计：FLIGHTS · COUNTRIES · SINCE 年；右上时钟为 Fred 所在城市本地时间，每分钟翻一次。
- 航班号 FH 按时间顺序编号。

## 交互
- 标题旁 ARR / DEP 两盏小灯拨档；切换时整屏翻牌（错峰停下）。
- 点一行：其余行压暗到约 30%，出纸口吐出暖白登机牌（照片 · 航线 MSN ✈ KEF · DATE/DAYS/WITH/SEAT · 一句话 · 票根条码）。再点或 Esc 收回。
- 进入：全部空白格从左上到右下依次翻落，每格滚过几个字母，约 1.2s。
- `prefers-reduced-motion`：直接显示终态。键盘可操作（行可聚焦，Enter 展开）。
- 声音（轻哒哒）等全站声音开关做好后再加，默认关。

## 数据
Fred 填 `docs/旅行行程-填写.md` → 转成 `dist/modules/travel/data.js`；照片放 `dist/modules/travel/photos/`。
