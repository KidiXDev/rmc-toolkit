use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};
use std::time::Instant;

use crate::error::{Error, Result};
use crate::files::now_millis;
use crate::game::Game;
use crate::library::{Entry, Library};
use crate::saves::SaveVault;

pub struct Launcher {
    data: PathBuf,
    library: Mutex<Library>,
    sessions: Mutex<HashMap<String, Instant>>,
}

impl Launcher {
    pub fn open(config: PathBuf, data: PathBuf) -> Result<Self> {
        Ok(Self {
            data,
            library: Mutex::new(Library::load(config.join("games.json"))?),
            sessions: Mutex::default(),
        })
    }

    pub fn library(&self) -> MutexGuard<'_, Library> {
        lock(&self.library)
    }

    pub fn entry(&self, id: &str) -> Result<Entry> {
        self.library().get(id).cloned()
    }

    pub fn game(&self, id: &str) -> Result<Game> {
        Game::detect(&self.entry(id)?.content)
    }

    pub fn idle_game(&self, id: &str) -> Result<Game> {
        if self.is_running(id) {
            return Err(Error::GameIsRunning);
        }
        self.game(id)
    }

    pub fn cover_path(&self, id: &str) -> PathBuf {
        self.data.join("covers").join(id)
    }

    pub fn backup_folder(&self, id: &str) -> PathBuf {
        self.data.join("backups").join(id)
    }

    pub fn vault(&self, game: &Game, id: &str) -> SaveVault {
        SaveVault::new(game.save_folder(), self.backup_folder(id))
    }

    pub fn executable(&self, entry: &Entry, game: &Game) -> Option<PathBuf> {
        entry
            .executable
            .as_deref()
            .filter(|path| path.is_file())
            .map(Path::to_path_buf)
            .or_else(|| game.executable())
    }

    pub fn is_running(&self, id: &str) -> bool {
        lock(&self.sessions).contains_key(id)
    }

    pub fn start_session(&self, id: &str) -> Result<()> {
        lock(&self.sessions).insert(id.to_owned(), Instant::now());
        self.library()
            .update(id, |entry| entry.last_played = Some(now_millis()))
    }

    pub fn end_session(&self, id: &str) -> Result<()> {
        let Some(started) = lock(&self.sessions).remove(id) else {
            return Ok(());
        };
        let seconds = started.elapsed().as_secs();
        self.library().update(id, |entry| {
            entry.play_seconds += seconds;
            entry.last_played = Some(now_millis());
        })
    }

    pub fn record_open_sessions(&self) {
        let running: Vec<String> = lock(&self.sessions).keys().cloned().collect();
        for id in running {
            let _ = self.end_session(&id);
        }
    }
}

fn lock<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    mutex
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testing::TempFolder;

    #[test]
    fn a_running_game_is_protected_and_its_time_is_recorded() {
        let temp = TempFolder::with_mv_game();
        let launcher = Launcher::open(temp.path().into(), temp.path().into()).unwrap();
        let id = launcher
            .library()
            .add(&temp.path().join("www"), "Moon".to_owned())
            .unwrap();
        assert!(launcher.idle_game(&id).is_ok());

        launcher.start_session(&id).unwrap();
        assert!(matches!(launcher.idle_game(&id), Err(Error::GameIsRunning)));
        launcher.record_open_sessions();
        assert!(!launcher.is_running(&id));
        assert!(launcher.entry(&id).unwrap().last_played.is_some());
    }
}
