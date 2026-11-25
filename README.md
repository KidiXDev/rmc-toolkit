# RPG Maker MV/MZ Cheat Toolkit

A small cheat window for RPG Maker MV and MZ games, with a GUI installer.

## Install

1. Download `rmc-toolkit.exe` from the releases page and open it.
2. Drop your game folder (or its exe) on the window, or click **Browse**.
3. Click **Install**.
4. Start the game and press **Ctrl+C**, or click the **RMC** button in the corner.

**Uninstall** in the same window puts the game's original files back. Games that are packed into a single file are not supported.

The installer needs WebView2, which is part of Windows 11 and of updated Windows 10.

### Manual install

1. Create a `cheat` folder next to the game's `index.html` (inside `www` for most MV games) and put `cheat.js` in it.
2. Add this to the end of `js/main.js`:

   ```js
   /* === RMC-CHEAT-TOOLKIT:START (do not edit) === */
   ;(function () {
     var s = document.createElement('script')
     s.src = 'cheat/cheat.js'
     document.head.appendChild(s)
   })()
   /* === RMC-CHEAT-TOOLKIT:END === */
   ```

## Cheats

| Tab       | What it does                                                       |
| :-------- | :----------------------------------------------------------------- |
| General   | Gold, move speed, no-clip, encounters, game speed, scene shortcuts |
| Party     | God mode, level, EXP, HP, MP, TP, stats, party members             |
| Battle    | EXP and damage multipliers, recover, win, lose, escape, enemy HP   |
| Inventory | Item, weapon and armor amounts                                     |
| Switches  | Search and toggle                                                  |
| Variables | Search and edit                                                    |
| Shortcuts | Change or clear every key                                          |
| Settings  | Theme, effects, window size, quick save slot, extras               |

Extras are off until you turn them on in **Settings**: teleport, saved places, minimap, event markers, map events and HUD.

| Key           | Action                  |
| :------------ | :---------------------- |
| Ctrl+C        | Show or hide the window |
| Ctrl+S        | Quick save (map only)   |
| Ctrl+L        | Quick load              |
| Ctrl+N        | No-clip                 |
| Backquote (`) | Fast-forward while held |

Shortcuts are ignored while you type in the cheat window. Settings are stored in `cheat-settings` next to the game's `index.html`.

Requires NW.js 0.29 or newer, which ships with MV 1.6 and every MZ version.

## Development

Needs [Bun](https://bun.sh). The installer also needs [Rust](https://rustup.rs).

```sh
bun install
bun dev                  # Cheat window with a mock game
bun run check            # Format, lint, types and unit tests
bun run build:overlay    # dist/cheat.js
bun run dev:installer    # Installer with hot reload
bun run build:installer  # src-tauri/target/release/rmc-toolkit.exe
```

Rust tests: `cargo test` in `src-tauri`, after `bun run build:overlay`.

## Credits

The Sakuga theme and its effects are based on [Sakuga VFX](https://github.com/finktheartist/sakuga-vfx). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
