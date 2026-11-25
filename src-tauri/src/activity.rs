use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;

use crate::error::{AtPath, Result};
use crate::files::write_atomically;
use crate::tracker::Session;

pub struct ActivityLog {
    log: PathBuf,
    checkpoint: PathBuf,
    sessions: Vec<Session>,
}

impl ActivityLog {
    pub fn load(folder: &std::path::Path) -> Self {
        let log = folder.join("activity.jsonl");
        let sessions = fs::read_to_string(&log)
            .unwrap_or_default()
            .lines()
            .filter_map(|line| serde_json::from_str(line).ok())
            .collect();
        Self {
            log,
            checkpoint: folder.join("running.json"),
            sessions,
        }
    }

    pub fn sessions(&self) -> &[Session] {
        &self.sessions
    }

    pub fn record(&mut self, session: Session) -> Result<()> {
        if let Some(folder) = self.log.parent() {
            fs::create_dir_all(folder).at(folder)?;
        }
        let line = serde_json::to_string(&session).unwrap_or_default();
        OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.log)
            .and_then(|mut file| writeln!(file, "{line}"))
            .at(&self.log)?;
        self.sessions.push(session);
        Ok(())
    }

    pub fn take_checkpoint(&self) -> Vec<Session> {
        let text = fs::read_to_string(&self.checkpoint).unwrap_or_default();
        serde_json::from_str(&text).unwrap_or_default()
    }

    pub fn checkpoint(&self, running: &[Session]) -> Result<()> {
        if let Some(folder) = self.checkpoint.parent() {
            fs::create_dir_all(folder).at(folder)?;
        }
        let text = serde_json::to_string(running).unwrap_or_default();
        write_atomically(&self.checkpoint, text.as_bytes())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testing::TempFolder;
    use crate::tracker::Origin;

    fn session(game: &str) -> Session {
        Session {
            game: game.to_owned(),
            started_at: 1,
            ended_at: 5_001,
            played_ms: 5_000,
            origin: Origin::Launcher,
        }
    }

    #[test]
    fn survives_restarts_and_a_torn_last_line() {
        let temp = TempFolder::new();
        let mut log = ActivityLog::load(temp.path());
        log.record(session("a")).unwrap();
        log.record(session("b")).unwrap();
        log.checkpoint(&[session("c")]).unwrap();

        let torn = [temp.read("activity.jsonl"), b"{\"game\":\"z".to_vec()].concat();
        temp.write("activity.jsonl", &torn);
        let reloaded = ActivityLog::load(temp.path());
        assert_eq!(reloaded.sessions(), [session("a"), session("b")]);
        assert_eq!(reloaded.take_checkpoint(), [session("c")]);
    }
}
