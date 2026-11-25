# CLAUDE.md

Vue 3, TypeScript and Tailwind 3.4 cheat overlay for RPG Maker MV/MZ, plus a Tauri 2 game launcher that installs it.

## Commands

```bash
bun dev                  # Dev harness with a mock game
bun run check            # Format, lint, types, unit tests
bun run build:overlay    # dist/cheat.js, then the Chromium 65 check
bun run dev:launcher     # Tauri launcher in dev mode
bun run build:launcher   # Portable launcher exe
cd src-tauri && cargo test && cargo clippy --all-targets -- -D warnings
```

`src-tauri` embeds `dist/cheat.js`, so build the overlay before running cargo.

## Layout

- `src/engine`: typed engine globals (`rpg`), `patchMethod`, `useLive`, storage, input isolation
- `src/cheats`: core cheats. `src/extras`: optional map features
- `src/features`: one list that defines every tab and overlay
- `src/shortcuts`: definitions, hotkey lookup, dispatcher
- `src/stores`: `settings` (persisted), `cheats` (session only), `overlay`
- `src/ui`: theme-neutral components. `src/themes`: themes and effects
- `src/overlay`: shadow DOM mount and window. `src/launcher`: launcher frontend
- `src-tauri`: library, game detection, patching, save backups, and playtime. `tracker.rs` is the pure session state machine, `process.rs` starts a process tree (Windows job object), `processes.rs` finds programs running from a game folder, `launcher.rs` joins them

## Rules

- **Chromium 65 is the target** (MV 1.6 ships NW.js 0.29). No flex `gap` (use grid), no `grid` on a `<button>` (wrap its content), no `inset`, no `:is()`/`:where()`/`:has()`, no newer runtime APIs such as `Path2D.addPath`, `toSorted` or `replaceChildren`. `scripts/check-bundle.ts` catches syntax and CSS only, not runtime APIs.
- **Cheats never write into save data.** Patch the prototype with `patchMethod` and read the `cheats` store inside the patch.
- **No `any`, no non-null assertions, no lint-disable comments.**
- **Colors and sizes come from theme variables** through Tailwind tokens (`ink`, `paper`, `accent`). Components never name a theme. `ink` flips in dark mode, so text on `primary` or `accent` uses `onfill`, and window chrome uses `chrome` and `onchrome`.
- **Every control has a hover state that does not override its active state.** Menus and tooltips go through `UiPopup`.
- **The launcher frontend never touches files.** Commands take a library id, not a path, except for paths the user just picked or dropped.
- **Motion lives in `ui/motion.css`** and uses the theme's `--rmc-time-*` and `--rmc-ease-*` values. It must work with `data-motion="off"` and reduced motion. Never animate `transform` on an element an effect already moves: wrap it.
- **Playtime only counts while a process is alive.** New ways to start a game go through `Tracker::begin`.
- Panels read the game through `useLive` and call `refreshLive` after a change.

## Adding things

- **Cheat:** module in `src/cheats`, state in `stores/cheats.ts`, patch registered in `cheats/install.ts`, control in a panel, test in `__tests__`.
- **Extra:** id in `stores/sanitize.ts`, label in `features/extras.ts`, panel or overlay in `features/index.ts`. Extras default to off.
- **Theme:** `src/themes/<id>/theme.css` under `[data-theme='<id>']` (dark values under `[data-mode='dark']`, with `hasDarkMode: true`), imported in `ui/styles.css`, and an entry in `themes/index.ts` with optional effects.
