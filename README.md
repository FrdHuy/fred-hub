# Fred’s Hub

原生 HTML / CSS / JavaScript 个人收藏网站。当前 v0.11：极简横向收藏、缩略图菜单、机票读卡、俯视光驱、日记翻开与选择罗盘。

## 启动（Mac）

在 `桌面 → Project → Fred-Personal-Site` 中双击 **启动预览.command**。
它会自动打开 http://127.0.0.1:57123/ 。保留弹出的终端窗口；关闭它或按 Control+C 就停止服务。重复双击会打开已运行的页面。
如果 macOS 第一次阻止打开，右键文件 → 打开。

也可在终端运行：

```sh
cd ~/Desktop/Project/Fred-Personal-Site
python3 scripts/preview.py
```

需安装 Python 3（当前这台电脑已有）。编辑 `dist/` 的文件后刷新浏览器，无须构建。

## 开发协作

先读 [AGENTS.md](AGENTS.md)、[当前交接](docs/HANDOFF.md)、[模块接口](docs/MODULES.md)。Claude 同时通过 CLAUDE.md 使用同一套规范。模块内容位于 `dist/modules/<id>/`，共享接口 `mount(context) → cleanup()`。

轻量检查：项目根目录运行 `node scripts/check.mjs`（需 Node.js，仅检查时使用）。

片单（cinema）已完成，旅行、日记仍是内容占位页。部署：GitHub + Vercel（Root Directory 为 `dist`），域名 fredhu.top，步骤见 [docs/部署.md](docs/部署.md)。
