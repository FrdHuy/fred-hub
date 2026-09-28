# Fred’s Hub — shared agent contract

Read `docs/HANDOFF.md` and `docs/MODULES.md` before editing. These rules apply to Codex, Claude and other coding agents.

- Canonical project: `/Users/fred/Desktop/Project/Fred-Personal-Site`. Edit this project, or an explicitly assigned working copy. Never overwrite the full canonical project from an old copy when another agent is working.
- User’s current design: horizontal collection only; minimal Fred. header and thumbnail menu; one module title. No categories, search, instructions, generic open dropzone or object dialog. Keep physical actions distinct: top-view optical drive, boarding-pass reader, unfolding diary, handwritten life checklist. Compass is paused; keep its source available.
- Keep plain HTML/CSS/ES modules. `dist/` is the editable source, not generated output. No package manager/build framework is currently required.
- Module work belongs in `dist/modules/<id>/`. Entry contract: synchronous `mount({container,item,navigate,createCover})`, return cleanup function. Async work must be started inside mount and cancelled by cleanup.
- Scope module styles under `[data-module="<id>"]`; reuse colors from `hub.css`. Do not change global selectors or homepage interactions as part of module content work.
- Before starting, record owner and file scope in `docs/HANDOFF.md`. Never have two agents edit the same files simultaneously. The table is a coordination record, not an automatic lock.
- Shared files (`main.js`, `gallery.js`, `experience.js`, `catalog.js`, `hub.css`, module registry) have one integrator at a time. Request changes through handoff notes instead of editing them concurrently.
- Work assigned to another agent must be retained. Inspect file changes before integrating; use separate Git branches/worktrees if simultaneous work is needed. Do not reset, clean or force-overwrite another agent’s work.
- Before finishing: run `node scripts/check.mjs` from project root, exercise the changed module, record changed files, verification, limitations and next action in HANDOFF. No full suite required.
- Save progress after a meaningful milestone and before ending. No assumption that one agent can see another agent’s conversation or remaining token quota.

开始工作前先读 PROGRESS.md
