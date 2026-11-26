use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;

use crate::error::{AtPath, Error, Result};
use crate::files::{copy_into, now_millis, relative_files, remove_file, remove_folder};

const KEPT_AUTOMATIC_BACKUPS: usize = 20;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum BackupKind {
    Manual,
    BeforePlay,
    BeforeRestore,
}

impl BackupKind {
    const ALL: [Self; 3] = [Self::Manual, Self::BeforePlay, Self::BeforeRestore];

    fn slug(self) -> &'static str {
        match self {
            Self::Manual => "manual",
            Self::BeforePlay => "play",
            Self::BeforeRestore => "restore",
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Backup {
    pub id: String,
    pub kind: BackupKind,
    pub created_at: u64,
    pub files: usize,
    pub bytes: u64,
}

pub struct SaveVault {
    saves: PathBuf,
    backups: PathBuf,
    root_saves: bool,
}

impl SaveVault {
    pub fn new(saves: PathBuf, backups: PathBuf) -> Self {
        Self {
            saves,
            backups,
            root_saves: false,
        }
    }

    pub fn vx_ace(mut self) -> Self {
        self.root_saves = true;
        self
    }

    fn files_in(&self, folder: &Path) -> Result<Vec<PathBuf>> {
        if !self.root_saves {
            return relative_files(folder);
        }
        if !folder.is_dir() {
            return Ok(Vec::new());
        }
        let mut files = Vec::new();
        for entry in fs::read_dir(folder).at(folder)? {
            let entry = entry.at(folder)?;
            let file = PathBuf::from(entry.file_name());
            let is_save = file
                .extension()
                .is_some_and(|ext| ext.eq_ignore_ascii_case("rvdata2"))
                && file
                    .file_stem()
                    .and_then(|stem| stem.to_str())
                    .is_some_and(|stem| {
                        stem.get(..4)
                            .is_some_and(|prefix| prefix.eq_ignore_ascii_case("save"))
                            && stem.get(4..).is_some_and(|slot| {
                                !slot.is_empty() && slot.bytes().all(|byte| byte.is_ascii_digit())
                            })
                    });
            if is_save && entry.file_type().at(&entry.path())?.is_file() {
                files.push(file);
            }
        }
        files.sort();
        Ok(files)
    }

    pub fn list(&self) -> Result<Vec<Backup>> {
        if !self.backups.is_dir() {
            return Ok(Vec::new());
        }
        let mut backups = Vec::new();
        for entry in fs::read_dir(&self.backups).at(&self.backups)? {
            let name = entry.at(&self.backups)?.file_name();
            if let Some(backup) = self.read_backup(&name.to_string_lossy())? {
                backups.push(backup);
            }
        }
        backups.sort_by_key(|backup| std::cmp::Reverse(backup.created_at));
        Ok(backups)
    }

    pub fn create(&self) -> Result<Backup> {
        self.store(BackupKind::Manual)?.ok_or(Error::NoSaves)
    }

    pub fn create_if_changed(&self, kind: BackupKind) -> Result<()> {
        if !self.matches_newest_backup()? {
            self.store(kind)?;
            self.prune()?;
        }
        Ok(())
    }

    pub fn restore(&self, id: &str) -> Result<()> {
        self.require(id)?;
        self.create_if_changed(BackupKind::BeforeRestore)?;

        let source = self.backups.join(id);
        let restored = self.files_in(&source)?;
        for file in &restored {
            copy_into(&source.join(file), &self.saves.join(file))?;
        }
        for file in self.files_in(&self.saves)? {
            if !restored.contains(&file) {
                remove_file(&self.saves.join(file))?;
            }
        }
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<()> {
        self.require(id)?;
        remove_folder(&self.backups.join(id))
    }

    fn require(&self, id: &str) -> Result<Backup> {
        self.read_backup(id)?.ok_or(Error::UnknownBackup)
    }

    fn read_backup(&self, id: &str) -> Result<Option<Backup>> {
        let Some((created_at, kind)) = parse_id(id) else {
            return Ok(None);
        };
        let folder = self.backups.join(id);
        if !folder.is_dir() {
            return Ok(None);
        }
        let files = self.files_in(&folder)?;
        let bytes = files
            .iter()
            .filter_map(|file| fs::metadata(folder.join(file)).ok())
            .map(|metadata| metadata.len())
            .sum();
        Ok(Some(Backup {
            id: id.to_owned(),
            kind,
            created_at,
            files: files.len(),
            bytes,
        }))
    }

    fn store(&self, kind: BackupKind) -> Result<Option<Backup>> {
        let files = self.files_in(&self.saves)?;
        if files.is_empty() {
            return Ok(None);
        }
        let id = self.free_id(kind);
        let pending = self.backups.join(format!("{id}.partial"));
        remove_folder(&pending)?;
        for file in &files {
            copy_into(&self.saves.join(file), &pending.join(file))?;
        }
        let target = self.backups.join(&id);
        fs::rename(&pending, &target).at(&target)?;
        self.read_backup(&id)
    }

    fn free_id(&self, kind: BackupKind) -> String {
        let mut created_at = now_millis();
        loop {
            let is_taken = BackupKind::ALL
                .iter()
                .any(|kind| self.backups.join(format_id(created_at, *kind)).exists());
            if !is_taken {
                return format_id(created_at, kind);
            }
            created_at += 1;
        }
    }

    fn matches_newest_backup(&self) -> Result<bool> {
        let Some(newest) = self.list()?.into_iter().next() else {
            return Ok(false);
        };
        let folder = self.backups.join(newest.id);
        let files = self.files_in(&self.saves)?;
        if files != self.files_in(&folder)? {
            return Ok(false);
        }
        for file in files {
            let (current, stored) = (self.saves.join(&file), folder.join(&file));
            if fs::read(&current).at(&current)? != fs::read(&stored).at(&stored)? {
                return Ok(false);
            }
        }
        Ok(true)
    }

    fn prune(&self) -> Result<()> {
        let automatic = self
            .list()?
            .into_iter()
            .filter(|backup| backup.kind != BackupKind::Manual);
        for backup in automatic.skip(KEPT_AUTOMATIC_BACKUPS) {
            self.delete(&backup.id)?;
        }
        Ok(())
    }
}

fn format_id(created_at: u64, kind: BackupKind) -> String {
    format!("{created_at}-{}", kind.slug())
}

fn parse_id(id: &str) -> Option<(u64, BackupKind)> {
    let (created_at, slug) = id.split_once('-')?;
    let kind = BackupKind::ALL
        .into_iter()
        .find(|kind| kind.slug() == slug)?;
    let created_at = created_at.parse().ok()?;
    (format_id(created_at, kind) == id).then_some((created_at, kind))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testing::TempFolder;

    fn vault(temp: &TempFolder) -> SaveVault {
        SaveVault::new(temp.path().join("save"), temp.path().join("backups"))
    }

    #[test]
    fn restores_exactly_and_keeps_what_it_replaced() {
        let temp = TempFolder::new();
        let vault = vault(&temp);
        assert!(matches!(vault.create(), Err(Error::NoSaves)));

        temp.write("save/file1.rpgsave", b"old");
        temp.write("save/extra/data.bin", b"deep");
        let first = vault.create().unwrap();
        assert_eq!((first.files, first.bytes), (2, 7));

        temp.write("save/file1.rpgsave", b"new");
        temp.write("save/file2.rpgsave", b"added");
        vault.restore(&first.id).unwrap();
        assert_eq!(temp.read("save/file1.rpgsave"), b"old");
        assert_eq!(temp.read("save/extra/data.bin"), b"deep");
        assert!(!temp.path().join("save/file2.rpgsave").exists());

        let safety = vault.list().unwrap().remove(0);
        assert_eq!(safety.kind, BackupKind::BeforeRestore);
        vault.restore(&safety.id).unwrap();
        assert_eq!(temp.read("save/file1.rpgsave"), b"new");
        assert_eq!(temp.read("save/file2.rpgsave"), b"added");
    }

    #[test]
    fn vx_ace_restores_save_slots_without_touching_game_files() {
        let temp = TempFolder::new();
        let vault = SaveVault::new(temp.path().to_owned(), temp.path().join("backups")).vx_ace();
        temp.write("Save01.rvdata2", b"old");
        temp.write("Game.rgss3a", b"archive");
        temp.write("Other.rvdata2", b"game data");
        temp.write("Data/Save99.rvdata2", b"mod data");
        let backup = vault.create().unwrap();
        assert_eq!(backup.files, 1);

        temp.write("Save01.rvdata2", b"new");
        temp.write("SAVE02.RVDATA2", b"extra");
        vault.restore(&backup.id).unwrap();
        assert_eq!(temp.read("Save01.rvdata2"), b"old");
        assert!(!temp.path().join("SAVE02.RVDATA2").exists());
        assert_eq!(temp.read("Game.rgss3a"), b"archive");
        assert_eq!(temp.read("Other.rvdata2"), b"game data");
        assert_eq!(temp.read("Data/Save99.rvdata2"), b"mod data");
    }

    #[test]
    fn skips_unchanged_saves_and_prunes_only_automatic_backups() {
        let temp = TempFolder::new();
        let vault = vault(&temp);
        temp.write("save/file1.rpgsave", b"0");
        vault.create().unwrap();
        vault.create_if_changed(BackupKind::BeforePlay).unwrap();
        assert_eq!(vault.list().unwrap().len(), 1);

        for index in 0..KEPT_AUTOMATIC_BACKUPS + 5 {
            temp.write("save/file1.rpgsave", format!("run {index}").as_bytes());
            vault.create_if_changed(BackupKind::BeforePlay).unwrap();
        }
        let backups = vault.list().unwrap();
        assert_eq!(backups.len(), KEPT_AUTOMATIC_BACKUPS + 1);
        assert_eq!(backups.last().unwrap().kind, BackupKind::Manual);
    }

    #[test]
    fn refuses_names_that_are_not_backups() {
        let temp = TempFolder::new();
        temp.write("save/file1.rpgsave", b"0");
        let vault = vault(&temp);
        for id in [
            "..",
            "../save",
            "1-manual/../..",
            "+1-manual",
            "",
            "1-other",
        ] {
            assert!(matches!(vault.delete(id), Err(Error::UnknownBackup)));
            assert!(matches!(vault.restore(id), Err(Error::UnknownBackup)));
        }
        assert!(temp.path().join("save/file1.rpgsave").exists());
    }
}
