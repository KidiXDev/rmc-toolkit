use std::thread;
use std::time::Duration;

use serde::Serialize;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{App, AppHandle, Emitter, Manager, Window, WindowEvent};

use crate::launcher::Launcher;
use crate::tracker::Event;

pub const LIBRARY_CHANGED: &str = "library-changed";
const GAME_ENDED: &str = "game-ended";
const PLAY_FAILED: &str = "play-failed";
const WATCH_INTERVAL: Duration = Duration::from_millis(1500);
const TRAY_ID: &str = "main";
const TRAY_GAMES: usize = 5;
const PLAY_PREFIX: &str = "play:";

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct GameEnded {
    id: String,
    played_ms: u64,
    is_early: bool,
}

pub fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

pub fn hide_instead_of_closing(window: &Window, event: &WindowEvent) {
    if let WindowEvent::CloseRequested { api, .. } = event
        && window.state::<Launcher>().should_hide_on_close()
    {
        api.prevent_close();
        let _ = window.hide();
    }
}

pub fn watch_games(app: AppHandle) {
    thread::spawn(move || {
        loop {
            let events = app.state::<Launcher>().watch().unwrap_or_default();
            if !events.is_empty() {
                let _ = app.emit(LIBRARY_CHANGED, ());
                refresh_tray(&app);
            }
            for event in events {
                announce(&app, event);
            }
            thread::sleep(WATCH_INTERVAL);
        }
    });
}

fn announce(app: &AppHandle, event: Event) {
    if let Event::Ended { session, is_early } = event {
        let _ = app.emit(
            GAME_ENDED,
            GameEnded {
                id: session.game,
                played_ms: session.played_ms,
                is_early,
            },
        );
    }
}

pub fn create_tray(app: &App) -> tauri::Result<()> {
    let mut tray = TrayIconBuilder::with_id(TRAY_ID)
        .tooltip("RMC Toolkit")
        .menu(&tray_menu(app.handle())?)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| handle_menu(app, event.id().as_ref()))
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

pub fn refresh_tray(app: &AppHandle) {
    if let (Some(tray), Ok(menu)) = (app.tray_by_id(TRAY_ID), tray_menu(app)) {
        let _ = tray.set_menu(Some(menu));
    }
}

fn tray_menu(app: &AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let menu = Menu::new(app)?;
    for (id, title, is_running) in recent_games(app) {
        let label = if is_running {
            format!("{title} (playing)")
        } else {
            title
        };
        menu.append(&MenuItem::with_id(
            app,
            format!("{PLAY_PREFIX}{id}"),
            label,
            !is_running,
            None::<&str>,
        )?)?;
    }
    menu.append(&PredefinedMenuItem::separator(app)?)?;
    menu.append(&MenuItem::with_id(app, "open", "Open", true, None::<&str>)?)?;
    menu.append(&MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?)?;
    Ok(menu)
}

fn recent_games(app: &AppHandle) -> Vec<(String, String, bool)> {
    let launcher = app.state::<Launcher>();
    let mut entries = launcher.library().entries().to_vec();
    entries.retain(|entry| entry.last_played.is_some());
    entries.sort_by_key(|entry| std::cmp::Reverse(entry.last_played));
    entries
        .into_iter()
        .take(TRAY_GAMES)
        .map(|entry| {
            let is_running = launcher.is_running(&entry.id);
            let title = entry.known_name();
            (entry.id, title, is_running)
        })
        .collect()
}

fn handle_menu(app: &AppHandle, item: &str) {
    match item {
        "open" => show_main_window(app),
        "quit" => app.exit(0),
        item => {
            if let Some(id) = item.strip_prefix(PLAY_PREFIX) {
                play_from_tray(app, id);
            }
        }
    }
}

fn play_from_tray(app: &AppHandle, id: &str) {
    if let Err(error) = app.state::<Launcher>().start(id) {
        show_main_window(app);
        let _ = app.emit(PLAY_FAILED, error.to_string());
    }
    let _ = app.emit(LIBRARY_CHANGED, ());
    refresh_tray(app);
}
