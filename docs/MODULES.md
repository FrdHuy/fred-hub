# Module interface v1

项目可拆分开发，但目前尚无后台、账号或共享数据服务。四个模块已有独立入口；不要把暂未实现的数据功能当成已完成。

## Directory and API

- `dist/catalog.js`: display metadata / IDs / homepage covers. Thumbnail menu uses this registry automatically.
- `dist/modules/index.js`: maps IDs to renderers; shared integrator edits it.
- `dist/modules/travel/index.js`: 旅行页面。
- `dist/modules/cinema/`: 影院片单。`data.js` 静态数据（只有作者编辑），`films.js` 校验规则，`posters/` 海报；添加脚本 `scripts/add-movie.mjs`，检查 `scripts/check-cinema.mjs`。
- `dist/modules/stories/index.js`: 日记与故事页面。
- `dist/modules/bucketlist/`: 人生清单，含手稿样式、条目 UI 和 localStorage 数据边界。
- `dist/modules/wheel/index.js`: 罗盘已暂停，源码保留，未注册。
- `dist/modules/empty.js`: current common placeholder; do not change it for one module’s new feature.
- `main.js`: shared header, menu, navigation, mounting/cleanup.
- `experience.js`: homepage physical actions; `gallery.js`: horizontal browsing.

```js
export function mount({ container, item, navigate, createCover }) {
  // container is empty and dedicated to this module. Render within it.
  const controller = new AbortController();
  // Render content, register handlers with { signal: controller.signal }.
  // navigate() returns home. navigate('travel') opens a module directly.
  // Load async data inside mount, not by making mount itself async.
  return () => {
    controller.abort();
    // Also cancel timers/RAF, observers, animation and object URLs you created.
  };
}
```

`item` comes from catalog: id, title, category, label, cover, description, emptyTitle, emptyText, section.
`createCover(item)` returns a new decorative DOM node. It does not initiate the homepage interaction.
Cleanup runs before leaving/replacing a module. Do not bind unmanaged global listeners.

## Styles and assets

Add module-specific `style.css` inside its directory; ask the integrator to add its stylesheet to index.html. All selectors begin with `[data-module="travel"]` (replace ID). Store module assets in its own directory; reference them through `new URL('./assets/file', import.meta.url)` where needed. Avoid root-relative paths.
The home page keeps warm off-white, restrained typography and generous spacing; do not restore decorative labels and verbose help text there.
**Design language:** read `docs/DESIGN.md` (Soft Retro Industrial) before any visual or interaction work; the home page must read as one product family.
**User decision (v0.18):** once opened, a module may have its own visual language (e.g. cinema is a dark screening room). Confirm a new module style with the user first. A dark module sets `theme: 'dark'` in catalog.js; main.js mirrors it to `html[data-theme]` so the shared header/back link turn light (rules at the end of hub.css).
Motion: honor prefers-reduced-motion. Pointer actions need keyboard equivalents. Content pages remain ordinary pages, never nested dialogs for the main experience.

## Adding a module

Integrator adds metadata in catalog.js, a mount entry in modules/index.js, and a cover / optional physical action. Content agent supplies only its scoped folder. Menu thumbnails update from catalog automatically. Run `node scripts/check.mjs` to confirm registry and route parity.

## Collaboration

Prefer assigning complete modules: e.g. Claude owns `dist/modules/travel/**`, Codex owns homepage/shared files. Both read the same contract. If simultaneous, use separate branches/worktrees and integrate module commits; if sequential, update HANDOFF and relinquish ownership. Documentation does not automatically synchronize the agents or prevent file conflicts.
Before any whole-folder copy, compare the source/destination and confirm no unrelated changes would be lost.

Suggested request to Claude:

> 在桌面 Project/Fred-Personal-Site 开发。先读 AGENTS.md、docs/HANDOFF.md、docs/MODULES.md。仅负责 dist/modules/travel/**，遵守 mount/cleanup 接口与统一视觉规范。暂不修改首页和公共文件，需要公共改动请写入交接记录。每个阶段保存进度，结束前记录验证结果与未完成项。
