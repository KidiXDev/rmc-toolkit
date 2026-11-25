use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Mutex, MutexGuard};

use crate::activity::ActivityLog;
use crate::error::{Error, Result};
use crate::files::now_millis;
use crate::game::Game;
use crate::library::{Entry, Library};
use crate::process::{ProcessTree, split_arguments};
use crate::processes::ProcessTable;
use crate::saves::SaveVault;
use crate::tracker::{Event, RunningProcess, Session, Tracker};

const CHECKPOINT_INTERVAL_MS: u64 = 15_000;

pub struct Launcher {
    data: PathBuf,
    library: Mutex<Library>,
    tracker: Mutex<Tracker>,
    activity: Mutex<ActivityLog>,
    processes: Mutex<ProcessTable>,
    last_checkpoint: Mutex<u64>,
    stays_in_tray: AtomicBool,
}

impl Launcher {
    pub fn open(config: PathBuf, data: PathBuf) -> Result<Self> {
        let activity = ActivityLog::load(&data);
        Ok(Self {
            library: Mutex::new(Library::load(config.join("games.json"))?),
            tracker: Mutex::new(Tracker::resume(
                activity.take_checkpoint(),
                activity.sessions(),
            )),
            activity: Mutex::new(activity),
            processes: Mutex::new(ProcessTable::new()),
            last_checkpoint: Mutex::default(),
            stays_in_tray: AtomicBool::new(false),
            data,
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
        lock(&self.tracker).is_active(id)
    }

    pub fn running_session(&self, id: &str) -> Option<Session> {
        lock(&self.tracker).session(id).cloned()
    }

    pub fn past_sessions(&self) -> Vec<Session> {
        lock(&self.activity).sessions().to_vec()
    }

    pub fn set_stays_in_tray(&self, stays: bool) {
        self.stays_in_tray.store(stays, Ordering::Relaxed);
    }

    pub fn should_hide_on_close(&self) -> bool {
        self.stays_in_tray.load(Ordering::Relaxed) || !lock(&self.tracker).is_idle()
    }

    pub fn start(&self, id: &str) -> Result<()> {
        let game = self.idle_game(id)?;
        let entry = self.entry(id)?;
        let program = self.executable(&entry, &game).ok_or(Error::NoExecutable)?;

        let process: Option<Box<dyn RunningProcess>> =
            match ProcessTree::start(&program, &split_arguments(&entry.arguments)) {
                Ok(tree) => Some(Box::new(tree)),
                Err(Error::NeedsElevation) => {
                    tauri_plugin_opener::open_path(&program, None::<&str>)
                        .map_err(|error| Error::Launch(std::io::Error::other(error.to_string())))?;
                    None
                }
                Err(error) => return Err(error),
            };
        lock(&self.tracker).begin(id, now_millis(), process);
        self.mark_played(id)?;
        self.save_checkpoint()
    }

    pub fn stop(&self, id: &str) {
        lock(&self.tracker).stop(id);
        lock(&self.processes).stop_all_in(id, &self.folders());
    }

    pub fn watch(&self) -> Result<Vec<Event>> {
        let folders = self.folders();
        let present = {
            let mut processes = lock(&self.processes);
            processes.refresh();
            processes.presence(&folders)
        };
        let now = now_millis();
        let events = lock(&self.tracker).tick(now, &present);
        for event in &events {
            self.apply(event)?;
        }
        if !events.is_empty() || self.is_checkpoint_due(now) {
            self.save_checkpoint()?;
        }
        Ok(events)
    }

    pub fn save_checkpoint(&self) -> Result<()> {
        let running = lock(&self.tracker).sessions();
        *lock(&self.last_checkpoint) = now_millis();
        lock(&self.activity).checkpoint(&running)
    }

    fn is_checkpoint_due(&self, now: u64) -> bool {
        let is_old = now.saturating_sub(*lock(&self.last_checkpoint)) > CHECKPOINT_INTERVAL_MS;
        is_old && !lock(&self.tracker).is_idle()
    }

    fn apply(&self, event: &Event) -> Result<()> {
        match event {
            Event::Started(game) => self.mark_played(game),
            Event::Ended { session, is_early } => {
                self.credit(session)?;
                if *is_early {
                    return Ok(());
                }
                lock(&self.activity).record(session.clone())
            }
        }
    }

    fn credit(&self, session: &Session) -> Result<()> {
        let update = self.library().update(&session.game, |entry| {
            entry.play_ms += session.played_ms;
            entry.last_played = Some(session.ended_at);
        });
        match update {
            Err(Error::UnknownGame) => Ok(()),
            other => other,
        }
    }

    fn mark_played(&self, id: &str) -> Result<()> {
        self.library()
            .update(id, |entry| entry.last_played = Some(now_millis()))
    }

    fn folders(&self) -> Vec<(String, PathBuf)> {
        self.library()
            .entries()
            .iter()
            .map(|entry| (entry.id.clone(), entry.root().to_owned()))
            .collect()
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

    fn open(temp: &TempFolder) -> Launcher {
        Launcher::open(temp.path().into(), temp.path().into()).unwrap()
    }

    #[cfg(windows)]
    #[test]
    fn tracks_a_started_game_and_protects_it() {
        let temp = TempFolder::with_mv_game();
        let shell = Path::new(r"C:\Windows\System32\cmd.exe");
        std::fs::copy(shell, temp.path().join("Game.exe")).unwrap();
        let launcher = open(&temp);
        let id = launcher
            .library()
            .add(&temp.path().join("www"), "Moon".to_owned())
            .unwrap();
        launcher
            .library()
            .update(&id, |entry| {
                entry.arguments = "/c \"ping -n 30 127.0.0.1 >nul\"".to_owned();
            })
            .unwrap();

        launcher.start(&id).unwrap();
        assert!(matches!(launcher.start(&id), Err(Error::GameIsRunning)));
        std::thread::sleep(std::time::Duration::from_millis(600));
        assert!(launcher.watch().unwrap().is_empty());
        assert!(launcher.should_hide_on_close());

        let reopened = open(&temp);
        assert!(reopened.watch().unwrap().is_empty());
        assert!(reopened.is_running(&id), "the run survives a restart");

        launcher.stop(&id);
        let started = std::time::Instant::now();
        while launcher.is_running(&id) && started.elapsed().as_secs() < 12 {
            std::thread::sleep(std::time::Duration::from_millis(250));
            launcher.watch().unwrap();
        }
        assert!(!launcher.is_running(&id));
        assert!(launcher.entry(&id).unwrap().last_played.is_some());
    }
}
