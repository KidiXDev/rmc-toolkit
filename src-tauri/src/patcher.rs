use std::fs;
use std::io;
use std::path::Path;

use crate::error::{AtPath, Result};
use crate::game::Game;

const BUNDLE: &[u8] = include_bytes!("../../dist/cheat.js");
const BUNDLE_NAME: &str = "cheat.js";
const BANNER_START: &str = "/*! rmc-cheat-toolkit ";
const BANNER_END: &str = " */";
const VERSION_WITHOUT_BANNER: &str = "1.x";

const MARKER_START: &[u8] = b"/* === RMC-CHEAT-TOOLKIT:START (do not edit) === */";
const MARKER_END: &[u8] = b"/* === RMC-CHEAT-TOOLKIT:END === */";
const LOADER: &[u8] = b"\n;(function(){var s=document.createElement('script');s.src='cheat/cheat.js';document.head.appendChild(s);})();\n";

const OWNED_FILES: [&str; 4] = [
    BUNDLE_NAME,
    "cheat.css",
    "rmc-diagnostic.js",
    "rmc-diagnostic.log",
];

#[derive(Debug, PartialEq, Eq)]
pub enum InstallState {
    NotInstalled,
    Current(String),
    Outdated(String),
}

pub fn bundled_version() -> String {
    version_of(BUNDLE)
}

pub fn state(game: &Game) -> Result<InstallState> {
    let main_script = game.main_script();
    let script = fs::read(&main_script).at(&main_script)?;
    let has_loader = find(&script, MARKER_START).is_some();
    let bundle = fs::read(game.cheat_folder().join(BUNDLE_NAME)).ok();

    Ok(match (has_loader, bundle) {
        (false, None) => InstallState::NotInstalled,
        (true, Some(bundle)) if bundle == BUNDLE => InstallState::Current(version_of(&bundle)),
        (_, bundle) => InstallState::Outdated(bundle.map_or_else(String::new, |b| version_of(&b))),
    })
}

pub fn install(game: &Game) -> Result<()> {
    let main_script = game.main_script();
    let original = strip_loader(&fs::read(&main_script).at(&main_script)?);

    let folder = game.cheat_folder();
    fs::create_dir_all(&folder).at(&folder)?;
    write_atomically(&folder.join(BUNDLE_NAME), BUNDLE)?;
    write_atomically(&backup_path(&main_script), &original)?;
    write_atomically(&main_script, &add_loader(&original))
}

pub fn uninstall(game: &Game, remove_settings: bool) -> Result<()> {
    let main_script = game.main_script();
    let current = fs::read(&main_script).at(&main_script)?;
    let original = strip_loader(&current);
    if original != current {
        write_atomically(&main_script, &original)?;
    }

    remove_file(&backup_path(&main_script))?;
    remove_owned_files(&game.cheat_folder())?;
    if remove_settings {
        let settings = game.settings_folder();
        ignore_missing(fs::remove_dir_all(&settings)).at(&settings)?;
    }
    Ok(())
}

fn remove_owned_files(folder: &Path) -> Result<()> {
    for name in OWNED_FILES {
        remove_file(&folder.join(name))?;
    }
    let is_empty = fs::read_dir(folder).is_ok_and(|mut entries| entries.next().is_none());
    if is_empty {
        fs::remove_dir(folder).at(folder)?;
    }
    Ok(())
}

fn remove_file(path: &Path) -> Result<()> {
    ignore_missing(fs::remove_file(path)).at(path)
}

fn ignore_missing(result: io::Result<()>) -> io::Result<()> {
    match result {
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(()),
        other => other,
    }
}

fn backup_path(main_script: &Path) -> std::path::PathBuf {
    main_script.with_extension("js.rmc-backup")
}

fn write_atomically(path: &Path, content: &[u8]) -> Result<()> {
    let pending = path.with_extension("rmc-tmp");
    fs::write(&pending, content).at(&pending)?;
    fs::rename(&pending, path).at(path).inspect_err(|_| {
        let _ = fs::remove_file(&pending);
    })
}

fn add_loader(original: &[u8]) -> Vec<u8> {
    [original, b"\n", MARKER_START, LOADER, MARKER_END].concat()
}

fn strip_loader(script: &[u8]) -> Vec<u8> {
    let Some(start) = find(script, MARKER_START) else {
        return script.to_owned();
    };
    let Some(length) = find(&script[start..], MARKER_END) else {
        return script.to_owned();
    };

    let mut before = &script[..start];
    let mut after = &script[start + length + MARKER_END.len()..];
    if after.is_empty() {
        before = before.strip_suffix(b"\n").unwrap_or(before);
    } else {
        after = after
            .strip_prefix(b"\r\n")
            .or_else(|| after.strip_prefix(b"\n"))
            .unwrap_or(after);
    }
    strip_loader(&[before, after].concat())
}

fn find(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack
        .windows(needle.len())
        .position(|window| window == needle)
}

fn version_of(bundle: &[u8]) -> String {
    let head = String::from_utf8_lossy(&bundle[..bundle.len().min(120)]);
    head.split_once(BANNER_START)
        .and_then(|(_, rest)| rest.split_once(BANNER_END))
        .map_or_else(
            || VERSION_WITHOUT_BANNER.to_owned(),
            |(version, _)| version.to_owned(),
        )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testing::TempFolder;

    const V1_LOADER: &[u8] = b"/* === RMC-CHEAT-TOOLKIT:START (do not edit) === */\n(function(){var s=document.createElement('script');s.src='cheat/cheat.js';\ns.async=false;document.head.appendChild(s);})();\n/* === RMC-CHEAT-TOOLKIT:END === */\n";

    fn game_with(main: &[u8]) -> (TempFolder, Game) {
        let temp = TempFolder::new();
        temp.write("www/js/main.js", main);
        temp.write("www/js/rpg_core.js", b"");
        let game = Game::detect(temp.path()).unwrap();
        (temp, game)
    }

    #[test]
    fn bundle_has_a_version() {
        assert_eq!(bundled_version(), env!("CARGO_PKG_VERSION"));
    }

    #[test]
    fn round_trip_is_byte_exact() {
        let scripts: [&[u8]; 6] = [
            b"",
            b"window.onload = run",
            b"window.onload = run\n",
            b"window.onload = run\r\n\r\n",
            b"'use strict'\n/*\nunfinished thoughts\n*/ run() // end",
            b"// \x83Q\x81[\x83\x80\r\nrun();\r\n",
        ];
        for script in scripts {
            assert_eq!(strip_loader(&add_loader(script)), script);
        }
    }

    #[test]
    fn loader_survives_a_missing_semicolon_and_line_comment() {
        let patched = String::from_utf8(add_loader(b"run() // end")).unwrap();
        assert!(patched.starts_with("run() // end\n/* ==="));
        assert!(patched.contains("*/\n;(function"));
    }

    #[test]
    fn install_is_repeatable_and_reversible() {
        let original = b"// \x83Q\r\nrun();\r\n";
        let (temp, game) = game_with(original);
        assert_eq!(state(&game).unwrap(), InstallState::NotInstalled);

        install(&game).unwrap();
        let first = temp.read("www/js/main.js");
        install(&game).unwrap();
        assert_eq!(temp.read("www/js/main.js"), first);
        assert_eq!(temp.read("www/js/main.js.rmc-backup"), original);
        assert_eq!(
            state(&game).unwrap(),
            InstallState::Current(bundled_version())
        );

        uninstall(&game, false).unwrap();
        assert_eq!(temp.read("www/js/main.js"), original);
        assert!(!temp.path().join("www/cheat").exists());
        assert!(!temp.path().join("www/js/main.js.rmc-backup").exists());
        assert_eq!(state(&game).unwrap(), InstallState::NotInstalled);
    }

    #[test]
    fn upgrades_version_one_in_place() {
        let original = b"//=====\n// main.js\n//=====\n\nPluginManager.setup($plugins);\n";
        let v1 = [&original[..27], V1_LOADER, &original[27..]].concat();
        let (temp, game) = game_with(&v1);
        temp.write("www/cheat/cheat.js", b"var old;");
        assert_eq!(
            state(&game).unwrap(),
            InstallState::Outdated("1.x".to_owned())
        );

        install(&game).unwrap();
        assert_eq!(
            state(&game).unwrap(),
            InstallState::Current(bundled_version())
        );
        uninstall(&game, false).unwrap();
        assert_eq!(temp.read("www/js/main.js"), original);
    }

    #[test]
    fn a_game_update_is_kept_and_reported() {
        let (temp, game) = game_with(b"run();\n");
        install(&game).unwrap();
        temp.write("www/js/main.js", b"runUpdated();\n");
        assert_eq!(
            state(&game).unwrap(),
            InstallState::Outdated(bundled_version())
        );

        install(&game).unwrap();
        uninstall(&game, false).unwrap();
        assert_eq!(temp.read("www/js/main.js"), b"runUpdated();\n");
    }

    #[test]
    fn uninstall_keeps_foreign_files_and_settings() {
        let (temp, game) = game_with(b"run();\n");
        install(&game).unwrap();
        temp.write("www/cheat/someone-else.js", b"");
        temp.write("www/cheat-settings/rmc-settings.json", b"{}");

        uninstall(&game, false).unwrap();
        assert!(temp.path().join("www/cheat/someone-else.js").exists());
        assert!(temp.path().join("www/cheat-settings").exists());

        uninstall(&game, true).unwrap();
        assert!(!temp.path().join("www/cheat-settings").exists());
    }

    #[test]
    fn an_unfinished_marker_is_left_alone() {
        let script = [MARKER_START, b"\nrun();"].concat();
        assert_eq!(strip_loader(&script), script);
    }
}
