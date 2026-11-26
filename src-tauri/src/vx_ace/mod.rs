mod archive;
mod scripts;

use std::fs::{self, File};
use std::io::{self, Read, Write};
use std::path::{Component, Path, PathBuf};

use tempfile::NamedTempFile;

use crate::error::{AtPath, Result};
use crate::files::remove_file;
use crate::patcher::InstallState;

const MAX_SCRIPTS: usize = 64 * 1024 * 1024;
const VERSION: &str = env!("CARGO_PKG_VERSION");

pub(super) fn ini_value(root: &Path, key: &str) -> Option<String> {
    let ini = fs::read(root.join("Game.ini")).ok()?;
    String::from_utf8_lossy(&ini).lines().find_map(|line| {
        let (name, value) = line.split_once('=')?;
        let value = value.trim();
        (name.trim().eq_ignore_ascii_case(key) && !value.is_empty()).then(|| value.to_owned())
    })
}

pub(super) struct Target {
    path: PathBuf,
    archive_entry: Option<String>,
}

pub(super) fn script_target(root: &Path) -> Option<Target> {
    let declared = ini_value(root, "Scripts");
    let name = declared
        .as_deref()
        .unwrap_or("Data/Scripts.rvdata2")
        .replace('\\', "/");
    let relative = Path::new(&name);
    if name.contains(':')
        || name
            .split('/')
            .any(|part| part.is_empty() || part == "." || part == "..")
        || relative
            .components()
            .any(|part| !matches!(part, Component::Normal(_)))
        || !relative
            .extension()
            .is_some_and(|ext| ext.eq_ignore_ascii_case("rvdata2"))
    {
        return None;
    }
    let archive = root.join("Game.rgss3a");
    let loose = root.join(relative);
    if archive.is_file() {
        Some(Target {
            path: archive,
            archive_entry: Some(name),
        })
    } else if loose.is_file() {
        Some(Target {
            path: loose,
            archive_entry: None,
        })
    } else {
        None
    }
}

impl Target {
    fn backup(&self) -> PathBuf {
        let mut name = self.path.as_os_str().to_owned();
        name.push(".rmc-backup");
        PathBuf::from(name)
    }

    fn read(&self, path: &Path) -> io::Result<Vec<u8>> {
        let mut file = File::open(path)?;
        if let Some(name) = &self.archive_entry {
            return archive::find(&mut file, name)?.read(&mut file);
        }
        let mut scripts = Vec::new();
        file.take(MAX_SCRIPTS as u64 + 1)
            .read_to_end(&mut scripts)?;
        if scripts.len() > MAX_SCRIPTS {
            return Err(invalid("VX Ace script file is too large"));
        }
        Ok(scripts)
    }

    fn verify_backup(&self, current: &[u8], original: &[u8], backup: &Path) -> Result<()> {
        let matches = scripts::is_patch_of(current, original).at(&self.path)?;
        let same_archive = if let Some(name) = &self.archive_entry {
            let mut installed = File::open(&self.path).at(&self.path)?;
            let mut saved = File::open(backup).at(backup)?;
            archive::is_patch_of(&mut installed, &mut saved, name).at(&self.path)?
        } else {
            true
        };
        if !matches || !same_archive {
            return Err(invalid(
                "The game files changed after cheats were installed. Both versions were kept.",
            ))
            .at(&self.path);
        }
        Ok(())
    }
}

pub(super) fn state(root: &Path) -> Result<InstallState> {
    let target = target_at(root)?;
    let Ok(data) = target.read(&target.path) else {
        return Ok(InstallState::NotInstalled);
    };
    Ok(match scripts::status(&data) {
        Ok(scripts::Status::Managed(version))
            if version == VERSION && target.backup().is_file() =>
        {
            InstallState::Current(version)
        }
        Ok(scripts::Status::Managed(version)) => InstallState::Outdated(version),
        Ok(scripts::Status::Standalone) => InstallState::Standalone,
        _ => InstallState::NotInstalled,
    })
}

pub(super) fn install(root: &Path) -> Result<()> {
    let target = target_at(root)?;
    let current = target.read(&target.path).at(&target.path)?;
    let backup = target.backup();
    let status = scripts::status(&current).at(&target.path)?;
    let (base_path, original) = match status {
        scripts::Status::Clean => (&target.path, current),
        scripts::Status::Managed(version) => {
            if version == VERSION && backup.is_file() {
                return Ok(());
            }
            let original = target.read(&backup).at(&backup)?;
            target.verify_backup(&current, &original, &backup)?;
            (&backup, original)
        }
        scripts::Status::Standalone => return Err(standalone_error()).at(&target.path),
    };
    let patched = scripts::patch(&original).at(base_path)?;
    let mut pending = pending_file(&target.path)?;
    if let Some(name) = &target.archive_entry {
        let mut base = File::open(base_path).at(base_path)?;
        archive::replace(&mut base, pending.as_file_mut(), name, &patched).at(&target.path)?;
    } else {
        pending.write_all(&patched).at(&target.path)?;
    }
    if base_path == &target.path {
        let mut original = File::open(&target.path).at(&target.path)?;
        let mut saved = pending_file(&backup)?;
        io::copy(&mut original, &mut saved).at(&backup)?;
        persist(saved, &backup)?;
    }
    persist(pending, &target.path)
}

pub(super) fn uninstall(root: &Path, remove_settings: bool) -> Result<()> {
    let target = target_at(root)?;
    let current = target.read(&target.path).at(&target.path)?;
    match scripts::status(&current).at(&target.path)? {
        scripts::Status::Clean => return Ok(()),
        scripts::Status::Managed(_) => {
            let backup = target.backup();
            let original = target.read(&backup).at(&backup)?;
            target.verify_backup(&current, &original, &backup)?;
            fs::rename(&backup, &target.path).at(&target.path)?;
        }
        scripts::Status::Standalone => return Err(standalone_error()).at(&target.path),
    }
    if remove_settings {
        remove_file(&root.join("rmvc.cfg"))?;
    }
    Ok(())
}

fn target_at(root: &Path) -> Result<Target> {
    let target = script_target(root).ok_or(crate::error::Error::NotAGame)?;
    if !target
        .path
        .canonicalize()
        .at(&target.path)?
        .starts_with(root.canonicalize().at(root)?)
    {
        return Err(invalid("The VX Ace file points outside the game folder")).at(&target.path);
    }
    Ok(target)
}

fn pending_file(path: &Path) -> Result<NamedTempFile> {
    let folder = path.parent().unwrap_or(Path::new("."));
    NamedTempFile::new_in(folder).at(folder)
}

fn persist(file: NamedTempFile, path: &Path) -> Result<()> {
    file.as_file().sync_all().at(path)?;
    file.persist(path)
        .map(|_| ())
        .map_err(|error| error.error)
        .at(path)
}

fn invalid(message: &str) -> io::Error {
    io::Error::new(io::ErrorKind::InvalidData, message)
}

fn standalone_error() -> io::Error {
    invalid(
        "These cheats were installed by the standalone VX Ace toolkit. Restore the original game files before installing launcher-managed cheats.",
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::game::{Engine, Game};
    use crate::testing::TempFolder;

    const CLEAN: &[u8] =
        b"# encoding: UTF-8\r\nclass Scene_Base\r\n  def update\r\n  end\r\nend\r\n";

    #[test]
    fn loose_game_is_detected_patched_and_restored() {
        let temp = TempFolder::new();
        temp.write(
            "Game.ini",
            b"[Game]\nTitle=Moon Quest\nScripts=Data\\Custom.rvdata2\n",
        );
        let original = scripts::fixture(CLEAN);
        temp.write("Data/Custom.rvdata2", &original);
        temp.write("rmvc.cfg", b"waypoints");
        temp.write("Game.exe", b"");

        let root = temp.path();
        let game = Game::detect(&root.join("Game.exe")).unwrap();
        assert_eq!(game.engine, Engine::VxAce);
        assert_eq!(game.title(), "Moon Quest");
        assert_eq!(crate::scan::find_games(root).len(), 1);
        assert_eq!(state(root).unwrap(), InstallState::NotInstalled);
        crate::patcher::install(&game).unwrap();
        assert_eq!(
            state(root).unwrap(),
            InstallState::Current(VERSION.to_owned())
        );
        let patched = temp.read("Data/Custom.rvdata2");
        install(root).unwrap();
        assert_eq!(temp.read("Data/Custom.rvdata2"), patched);
        crate::patcher::uninstall(&game, false).unwrap();
        assert_eq!(temp.read("Data/Custom.rvdata2"), original);
        assert_eq!(temp.read("rmvc.cfg"), b"waypoints");
        install(root).unwrap();
        uninstall(root, true).unwrap();
        assert!(!root.join("rmvc.cfg").exists());
    }

    #[test]
    fn respects_standalone_installs_and_replaced_game_files() {
        let temp = TempFolder::new();
        let root = temp.path();
        let location = "Data/Scripts.rvdata2";
        let standalone = scripts::fixture(b"module RMVC\nend\n");
        temp.write(location, &standalone);
        assert_eq!(state(root).unwrap(), InstallState::Standalone);
        assert!(install(root).is_err());
        assert!(uninstall(root, true).is_err());
        assert_eq!(temp.read(location), standalone);

        temp.write(location, &scripts::fixture(CLEAN));
        install(root).unwrap();
        let updated =
            scripts::fixture(b"class Scene_Base\n  def update\n    Graphics.update\n  end\nend\n");
        temp.write(location, &updated);
        assert_eq!(state(root).unwrap(), InstallState::NotInstalled);
        uninstall(root, false).unwrap();
        assert_eq!(temp.read(location), updated);
        install(root).unwrap();
        uninstall(root, false).unwrap();
        assert_eq!(temp.read(location), updated);
    }

    #[test]
    fn updates_an_older_managed_install_and_keeps_its_original() {
        let temp = TempFolder::new();
        let root = temp.path();
        let path = "Data/Scripts.rvdata2";
        let clean = scripts::fixture(CLEAN);
        let old = [
            &b"# RMC VX Ace 1.0.0\n# End RMC VX Ace payload\n"[..],
            &CLEAN[..CLEAN.len() - b"  end\r\nend\r\n".len()],
            b"    RMVC.update\r\n  end\r\nend\r\n",
        ]
        .concat();
        temp.write(path, &scripts::fixture(&old));
        temp.write("Data/Scripts.rvdata2.rmc-backup", &clean);

        assert_eq!(state(root).unwrap(), InstallState::Outdated("1.0.0".into()));
        install(root).unwrap();
        assert_eq!(
            state(root).unwrap(),
            InstallState::Current(VERSION.to_owned())
        );
        uninstall(root, false).unwrap();
        assert_eq!(temp.read(path), clean);
    }

    #[test]
    fn packed_game_keeps_assets_and_restores_the_exact_archive() {
        let temp = TempFolder::new();
        let root = temp.path();
        let original = archive::fixture(&scripts::fixture(CLEAN));
        temp.write("Game.rgss3a", &original);
        let game = Game::detect(root).unwrap();
        assert_eq!(game.engine, Engine::VxAce);
        assert_eq!(state(root).unwrap(), InstallState::NotInstalled);
        install(root).unwrap();
        assert_eq!(
            state(root).unwrap(),
            InstallState::Current(VERSION.to_owned())
        );
        assert!(!root.join("Data").exists());
        let mut installed = File::open(root.join("Game.rgss3a")).unwrap();
        let asset = archive::find(&mut installed, "Graphics/asset.bin").unwrap();
        assert_eq!(asset.read(&mut installed).unwrap(), b"unchanged asset");
        drop(installed);
        assert_eq!(temp.read("Game.rgss3a.rmc-backup"), original);
        uninstall(root, false).unwrap();
        assert_eq!(temp.read("Game.rgss3a"), original);
        assert!(!root.join("Game.rgss3a.rmc-backup").exists());
    }

    #[test]
    fn bad_archives_and_scripts_are_left_intact() {
        for (name, data) in [
            ("Game.rgss3a", [&b"RGSSAD\0\x03"[..], &[0; 20]].concat()),
            (
                "Data/Scripts.rvdata2",
                scripts::fixture(b"class Scene_Base; end"),
            ),
        ] {
            let temp = TempFolder::new();
            temp.write(name, &data);
            assert!(install(temp.path()).is_err());
            assert_eq!(temp.read(name), data);
            assert!(!temp.path().join(format!("{name}.rmc-backup")).exists());
        }
    }

    #[test]
    fn uninstall_refuses_to_replace_an_edited_archive() {
        let temp = TempFolder::new();
        let root = temp.path();
        let original = archive::fixture(&scripts::fixture(CLEAN));
        temp.write("Game.rgss3a", &original);
        install(root).unwrap();
        let mut patched = temp.read("Game.rgss3a");
        patched[original.len() - 1] ^= 1;
        temp.write("Game.rgss3a", &patched);
        assert!(uninstall(root, false).is_err());
        assert_eq!(temp.read("Game.rgss3a"), patched);
        assert_eq!(temp.read("Game.rgss3a.rmc-backup"), original);
    }
}
