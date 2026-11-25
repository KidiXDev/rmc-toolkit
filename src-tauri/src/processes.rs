use std::collections::HashMap;
use std::path::{Path, PathBuf};

use sysinfo::{Pid, ProcessRefreshKind, ProcessesToUpdate, System, UpdateKind};

use crate::game::is_helper_program;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Presence {
    pub started_at: u64,
}

pub struct ProcessTable {
    system: Option<System>,
    own_pid: Pid,
}

impl ProcessTable {
    pub fn new() -> Self {
        Self {
            system: System::new().ok(),
            own_pid: Pid::from_u32(std::process::id()),
        }
    }

    pub fn refresh(&mut self) {
        if let Some(system) = &mut self.system {
            let kind = ProcessRefreshKind::nothing().with_exe(UpdateKind::OnlyIfNotSet);
            system.refresh_processes_specifics(ProcessesToUpdate::All, true, kind);
        }
    }

    pub fn presence(&self, folders: &[(String, PathBuf)]) -> HashMap<String, Presence> {
        let mut present: HashMap<String, Presence> = HashMap::new();
        for (pid, process) in self.system.iter().flat_map(System::processes) {
            let Some(owner) = self.owner_of(*pid, process.exe(), folders) else {
                continue;
            };
            let started_at = process.start_time() * 1000;
            present
                .entry(owner.to_owned())
                .and_modify(|presence| presence.started_at = presence.started_at.min(started_at))
                .or_insert(Presence { started_at });
        }
        present
    }

    pub fn stop_all_in(&mut self, id: &str, folders: &[(String, PathBuf)]) {
        self.refresh();
        for (pid, process) in self.system.iter().flat_map(System::processes) {
            if self.owner_of(*pid, process.exe(), folders) == Some(id) {
                process.kill();
            }
        }
    }

    fn owner_of<'a>(
        &self,
        pid: Pid,
        program: Option<&Path>,
        folders: &'a [(String, PathBuf)],
    ) -> Option<&'a str> {
        let program = program?;
        if pid == self.own_pid || is_helper_program(program) {
            return None;
        }
        owning_folder(program, folders)
    }
}

fn owning_folder<'a>(program: &Path, folders: &'a [(String, PathBuf)]) -> Option<&'a str> {
    let program = comparable(program);
    folders
        .iter()
        .filter(|(_, folder)| folder.parent().is_some() && program.starts_with(comparable(folder)))
        .max_by_key(|(_, folder)| folder.components().count())
        .map(|(id, _)| id.as_str())
}

fn comparable(path: &Path) -> PathBuf {
    if cfg!(windows) {
        path.to_string_lossy().to_lowercase().into()
    } else {
        path.to_owned()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn folders(paths: &[(&str, &str)]) -> Vec<(String, PathBuf)> {
        paths
            .iter()
            .map(|(id, path)| ((*id).to_owned(), PathBuf::from(path)))
            .collect()
    }

    #[cfg(windows)]
    #[test]
    fn the_deepest_game_folder_owns_a_program() {
        let games = folders(&[
            ("outer", r"D:\Games\Pack"),
            ("inner", r"D:\Games\Pack\Moon"),
            ("drive", r"D:\"),
        ]);
        let owner = |path: &str| owning_folder(Path::new(path), &games).map(str::to_owned);

        assert_eq!(
            owner(r"d:\games\pack\moon\Game.exe").as_deref(),
            Some("inner")
        );
        assert_eq!(owner(r"D:\Games\Pack\Other.exe").as_deref(), Some("outer"));
        assert_eq!(owner(r"D:\Games\Packed\Game.exe"), None);
        assert_eq!(owner(r"D:\Tools\editor.exe"), None);
    }

    #[test]
    fn finds_a_real_process_by_its_folder() {
        let program = std::env::current_exe().unwrap();
        let folder = program.parent().unwrap().to_owned();
        let mut table = ProcessTable::new();
        table.refresh();

        let games = vec![("test".to_owned(), folder)];
        assert!(
            table.presence(&games).is_empty(),
            "the launcher itself never counts"
        );
        table.own_pid = Pid::from_u32(0);
        assert!(table.presence(&games)["test"].started_at > 0);
    }
}
