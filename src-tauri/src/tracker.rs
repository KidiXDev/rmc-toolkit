use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::processes::Presence;

const EXIT_GRACE_MS: u64 = 4_000;
const ELEVATED_START_GRACE_MS: u64 = 45_000;
const MAX_STEP_MS: u64 = 10_000;
const START_TIME_SLACK_MS: u64 = 3_000;
const EARLY_EXIT_MS: u64 = 4_000;

pub trait RunningProcess: Send {
    fn is_running(&mut self) -> bool;
    fn stop(&mut self);
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Origin {
    Launcher,
    Outside,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub game: String,
    pub started_at: u64,
    pub ended_at: u64,
    pub played_ms: u64,
    pub origin: Origin,
}

#[derive(Debug, PartialEq, Eq)]
pub enum Event {
    Started(String),
    Ended { session: Session, is_early: bool },
}

struct Active {
    session: Session,
    process: Option<Box<dyn RunningProcess>>,
    grace_ms: u64,
    resumed: bool,
}

#[derive(Default)]
pub struct Tracker {
    active: HashMap<String, Active>,
    last_end: HashMap<String, u64>,
    last_tick: Option<u64>,
}

impl Tracker {
    pub fn resume(sessions: Vec<Session>, past: &[Session]) -> Self {
        let last_end = past
            .iter()
            .map(|session| (session.game.clone(), session.ended_at))
            .collect();
        let active = sessions
            .into_iter()
            .map(|session| {
                let active = Active {
                    session,
                    process: None,
                    grace_ms: 0,
                    resumed: true,
                };
                (active.session.game.clone(), active)
            })
            .collect();
        Self {
            active,
            last_end,
            last_tick: None,
        }
    }

    pub fn begin(&mut self, game: &str, now: u64, process: Option<Box<dyn RunningProcess>>) {
        let grace_ms = if process.is_some() {
            EXIT_GRACE_MS
        } else {
            ELEVATED_START_GRACE_MS
        };
        self.active.insert(
            game.to_owned(),
            Active {
                session: new_session(game, now, Origin::Launcher),
                process,
                grace_ms,
                resumed: false,
            },
        );
    }

    pub fn tick(&mut self, now: u64, present: &HashMap<String, Presence>) -> Vec<Event> {
        let step = now
            .saturating_sub(self.last_tick.unwrap_or(now))
            .min(MAX_STEP_MS);
        self.last_tick = Some(now);

        for (game, active) in &mut self.active {
            let presence = present.get(game);
            let owns_process = active
                .process
                .as_mut()
                .is_some_and(|process| process.is_running());
            if presence.is_some() || owns_process {
                active.advance(now, step, presence);
            }
        }
        let mut events = self.adopt_new(now, present);
        events.extend(self.finish_ended(now));
        events
    }

    fn adopt_new(&mut self, now: u64, present: &HashMap<String, Presence>) -> Vec<Event> {
        let mut events = Vec::new();
        for (game, presence) in present {
            if self.active.contains_key(game) {
                continue;
            }
            let already_counted = self.last_end.get(game).copied().unwrap_or(0);
            let started_at = presence.started_at.max(already_counted).min(now);
            let mut session = new_session(game, started_at, Origin::Outside);
            session.played_ms = now - started_at;
            session.ended_at = now;
            self.active.insert(
                game.clone(),
                Active {
                    session,
                    process: None,
                    grace_ms: EXIT_GRACE_MS,
                    resumed: false,
                },
            );
            events.push(Event::Started(game.clone()));
        }
        events
    }

    fn finish_ended(&mut self, now: u64) -> Vec<Event> {
        let ended: Vec<String> = self
            .active
            .iter()
            .filter(|(_, active)| now.saturating_sub(active.session.ended_at) > active.grace_ms)
            .map(|(game, _)| game.clone())
            .collect();

        ended
            .into_iter()
            .filter_map(|game| self.active.remove(&game))
            .map(|active| {
                let session = active.session;
                self.last_end.insert(session.game.clone(), session.ended_at);
                Event::Ended {
                    is_early: session.origin == Origin::Launcher
                        && session.played_ms < EARLY_EXIT_MS,
                    session,
                }
            })
            .collect()
    }

    pub fn is_active(&self, game: &str) -> bool {
        self.active.contains_key(game)
    }

    pub fn is_idle(&self) -> bool {
        self.active.is_empty()
    }

    pub fn session(&self, game: &str) -> Option<&Session> {
        self.active.get(game).map(|active| &active.session)
    }

    pub fn sessions(&self) -> Vec<Session> {
        self.active
            .values()
            .map(|active| active.session.clone())
            .collect()
    }

    pub fn stop(&mut self, game: &str) {
        if let Some(process) = self
            .active
            .get_mut(game)
            .and_then(|active| active.process.as_mut())
        {
            process.stop();
        }
    }
}

impl Active {
    fn advance(&mut self, now: u64, step: u64, presence: Option<&Presence>) {
        let is_same_run = presence.is_some_and(|presence| {
            presence.started_at <= self.session.ended_at + START_TIME_SLACK_MS
        });
        self.session.played_ms += if self.resumed && is_same_run {
            now.saturating_sub(self.session.ended_at)
        } else {
            step
        };
        self.session.ended_at = now;
        self.grace_ms = EXIT_GRACE_MS;
        self.resumed = false;
    }
}

fn new_session(game: &str, now: u64, origin: Origin) -> Session {
    Session {
        game: game.to_owned(),
        started_at: now,
        ended_at: now,
        played_ms: 0,
        origin,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;
    use std::sync::atomic::{AtomicBool, Ordering};

    const T0: u64 = 1_000_000;

    struct FakeProcess(Arc<AtomicBool>);

    impl RunningProcess for FakeProcess {
        fn is_running(&mut self) -> bool {
            self.0.load(Ordering::Relaxed)
        }

        fn stop(&mut self) {
            self.0.store(false, Ordering::Relaxed);
        }
    }

    fn fake() -> (Arc<AtomicBool>, Option<Box<dyn RunningProcess>>) {
        let alive = Arc::new(AtomicBool::new(true));
        (Arc::clone(&alive), Some(Box::new(FakeProcess(alive))))
    }

    fn nothing() -> HashMap<String, Presence> {
        HashMap::new()
    }

    fn present(started_at: u64) -> HashMap<String, Presence> {
        HashMap::from([("moon".to_owned(), Presence { started_at })])
    }

    fn run(
        tracker: &mut Tracker,
        from: u64,
        seconds: u64,
        present: &HashMap<String, Presence>,
    ) -> Vec<Event> {
        (0..=seconds)
            .flat_map(|second| tracker.tick(from + second * 1000, present))
            .collect()
    }

    fn ended(events: Vec<Event>) -> (Session, bool) {
        match events.into_iter().next_back() {
            Some(Event::Ended { session, is_early }) => (session, is_early),
            other => panic!("expected an ended session, got {other:?}"),
        }
    }

    #[test]
    fn counts_time_until_the_tree_exits_and_not_the_grace_period() {
        let mut tracker = Tracker::default();
        let (alive, process) = fake();
        tracker.begin("moon", T0, process);
        assert!(run(&mut tracker, T0, 60, &nothing()).is_empty());

        alive.store(false, Ordering::Relaxed);
        let (session, is_early) = ended(run(&mut tracker, T0 + 61_000, 10, &nothing()));
        assert_eq!(session.played_ms, 60_000);
        assert_eq!(session.ended_at, T0 + 60_000);
        assert!(!is_early);
        assert!(tracker.is_idle());
    }

    #[test]
    fn a_handover_to_another_process_is_one_session() {
        let mut tracker = Tracker::default();
        let (alive, process) = fake();
        tracker.begin("moon", T0, process);
        run(&mut tracker, T0, 5, &nothing());
        alive.store(false, Ordering::Relaxed);
        assert!(run(&mut tracker, T0 + 6_000, 2, &nothing()).is_empty());

        let handed_over = present(T0 + 8_000);
        assert!(run(&mut tracker, T0 + 9_000, 20, &handed_over).is_empty());
        let (session, _) = ended(run(&mut tracker, T0 + 30_000, 10, &nothing()));
        assert_eq!(session.started_at, T0);
        assert_eq!(session.ended_at, T0 + 29_000);
        assert!(session.played_ms >= 25_000 && session.played_ms <= 29_000);
    }

    #[test]
    fn adopts_a_game_started_outside_once() {
        let mut tracker = Tracker::default();
        let events = run(&mut tracker, T0, 10, &present(T0 - 2_000));
        assert_eq!(events, [Event::Started("moon".to_owned())]);

        let (session, is_early) = ended(run(&mut tracker, T0 + 11_000, 10, &nothing()));
        assert_eq!(session.origin, Origin::Outside);
        assert_eq!(session.played_ms, 12_000);
        assert!(!is_early);

        let again = run(&mut tracker, T0 + 30_000, 1, &present(T0 - 2_000));
        assert_eq!(again, [Event::Started("moon".to_owned())]);
        assert!(tracker.session("moon").unwrap().played_ms <= 21_000);
    }

    #[test]
    fn sleep_is_not_playtime() {
        let mut tracker = Tracker::default();
        let (_alive, process) = fake();
        tracker.begin("moon", T0, process);
        run(&mut tracker, T0, 10, &nothing());
        let eight_hours = 8 * 60 * 60 * 1000;
        tracker.tick(T0 + eight_hours, &nothing());

        assert_eq!(
            tracker.session("moon").unwrap().played_ms,
            10_000 + MAX_STEP_MS
        );
    }

    #[test]
    fn flags_a_game_that_closes_right_away() {
        let mut tracker = Tracker::default();
        let (alive, process) = fake();
        tracker.begin("moon", T0, process);
        tracker.tick(T0 + 1_000, &nothing());
        alive.store(false, Ordering::Relaxed);

        let (_, is_early) = ended(run(&mut tracker, T0 + 2_000, 8, &nothing()));
        assert!(is_early);
    }

    #[test]
    fn waits_for_an_elevated_start() {
        let mut tracker = Tracker::default();
        tracker.begin("moon", T0, None);
        assert!(run(&mut tracker, T0, 20, &nothing()).is_empty());
        assert!(run(&mut tracker, T0 + 21_000, 5, &present(T0 + 20_000)).is_empty());
        assert!(tracker.session("moon").unwrap().played_ms >= 5_000);

        let mut cancelled = Tracker::default();
        cancelled.begin("moon", T0, None);
        let (_, is_early) = ended(run(&mut cancelled, T0, 60, &nothing()));
        assert!(is_early);
    }

    #[test]
    fn continues_the_same_run_after_the_launcher_restarts() {
        let mut saved = new_session("moon", T0, Origin::Launcher);
        saved.played_ms = 30_000;
        saved.ended_at = T0 + 30_000;

        let mut tracker = Tracker::resume(vec![saved.clone()], &[]);
        let hour = 60 * 60 * 1000;
        assert!(tracker.tick(T0 + hour, &present(T0)).is_empty());
        assert_eq!(tracker.session("moon").unwrap().played_ms, hour);

        let mut other_run = Tracker::resume(vec![saved.clone()], &[]);
        other_run.tick(T0 + hour, &present(T0 + hour - 5_000));
        assert_eq!(other_run.session("moon").unwrap().played_ms, 30_000);

        let mut closed = Tracker::resume(vec![saved.clone()], &[]);
        let (session, _) = ended(closed.tick(T0 + hour, &nothing()));
        assert_eq!(session, saved);
    }

    #[test]
    fn stopping_reaches_the_process() {
        let mut tracker = Tracker::default();
        let (alive, process) = fake();
        tracker.begin("moon", T0, process);
        tracker.stop("moon");
        assert!(!alive.load(Ordering::Relaxed));
    }
}
