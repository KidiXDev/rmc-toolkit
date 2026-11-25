use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::ipc::Response;
use tauri::{AppHandle, State};

use crate::covers;
use crate::desktop;
use crate::error::{AtPath, Error, Result};
use crate::files::now_millis;
use crate::game::{Engine, Game};
use crate::launcher::Launcher;
use crate::library::{Entry, PlayStatus};
use crate::live;
use crate::logs;
use crate::patcher::{self, InstallState};
use crate::saves::{Backup, BackupKind};
use crate::scan;
use crate::tracker::Session;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub enum CheatStatus {
    NotInstalled,
    Current,
    Outdated,
    Missing,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameInfo {
    id: String,
    path: PathBuf,
    title: String,
    default_title: String,
    engine: Option<Engine>,
    maker_version: Option<String>,
    is_supported: bool,
    status: CheatStatus,
    cheat_version: Option<String>,
    executable: Option<PathBuf>,
    favorite: bool,
    arguments: String,
    play_status: PlayStatus,
    notes: String,
    play_ms: u64,
    session: Option<Session>,
    last_played: Option<u64>,
    added_at: u64,
    cover_key: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FoundGame {
    path: PathBuf,
    title: String,
    engine: Engine,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AddResult {
    added: Vec<String>,
    failed: Vec<String>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Folder {
    Game,
    Saves,
    Backups,
}

fn describe(launcher: &Launcher, entry: Entry) -> GameInfo {
    let game = Game::detect(&entry.content).ok();
    let state = game.as_ref().and_then(|game| patcher::state(game).ok());
    let (status, cheat_version) = match state {
        Some(InstallState::NotInstalled) => (CheatStatus::NotInstalled, None),
        Some(InstallState::Current(version)) => (CheatStatus::Current, Some(version)),
        Some(InstallState::Outdated(version)) => (CheatStatus::Outdated, Some(version)),
        None => (CheatStatus::Missing, None),
    };
    let maker_version = game.as_ref().and_then(Game::maker_version);
    let default_title = game
        .as_ref()
        .map(Game::title)
        .unwrap_or_else(|| entry.known_name());

    let session = launcher.running_session(&entry.id);

    GameInfo {
        path: game
            .as_ref()
            .map_or_else(|| entry.content.clone(), |game| game.root().to_owned()),
        title: entry
            .custom_title
            .clone()
            .unwrap_or_else(|| default_title.clone()),
        default_title,
        engine: game.as_ref().map(|game| game.engine),
        is_supported: game
            .as_ref()
            .is_none_or(|game| game.is_supported(maker_version.as_deref())),
        maker_version,
        status,
        cheat_version,
        executable: game
            .as_ref()
            .and_then(|game| launcher.executable(&entry, game)),
        favorite: entry.favorite,
        arguments: entry.arguments,
        play_status: entry.play_status,
        notes: entry.notes,
        play_ms: entry.play_ms + session.as_ref().map_or(0, |session| session.played_ms),
        session,
        last_played: entry.last_played,
        added_at: entry.added_at,
        cover_key: format!("{}-{}", entry.id, entry.cover_changed_at.unwrap_or(0)),
        id: entry.id,
    }
}

#[tauri::command]
pub fn toolkit_version() -> String {
    patcher::bundled_version()
}

#[tauri::command]
pub async fn list_games(launcher: State<'_, Launcher>) -> Result<Vec<GameInfo>> {
    let entries = launcher.library().entries().to_vec();
    Ok(entries
        .into_iter()
        .map(|entry| describe(&launcher, entry))
        .collect())
}

#[tauri::command]
pub async fn add_games(launcher: State<'_, Launcher>, paths: Vec<PathBuf>) -> Result<AddResult> {
    let mut result = AddResult {
        added: Vec::new(),
        failed: Vec::new(),
    };
    for path in paths {
        match Game::detect(&path) {
            Ok(game) => {
                let title = game.title();
                result
                    .added
                    .push(launcher.library().add(&game.content, title)?);
            }
            Err(error) => result.failed.push(error.to_string()),
        }
    }
    Ok(result)
}

#[tauri::command]
pub async fn find_games(launcher: State<'_, Launcher>, path: PathBuf) -> Result<Vec<FoundGame>> {
    let mut found: Vec<FoundGame> = scan::find_games(&path)
        .into_iter()
        .filter(|game| launcher.library().find_path(&game.content).is_none())
        .map(|game| FoundGame {
            path: game.root().to_owned(),
            title: game.title(),
            engine: game.engine,
        })
        .collect();
    found.sort_by_key(|game| game.title.to_lowercase());
    Ok(found)
}

#[tauri::command]
pub async fn remove_game(launcher: State<'_, Launcher>, id: String) -> Result<()> {
    if launcher.is_running(&id) {
        return Err(Error::GameIsRunning);
    }
    launcher.library().remove(&id)?;
    covers::set_custom(&launcher.cover_path(&id), None)
}

#[tauri::command]
pub async fn locate_game(launcher: State<'_, Launcher>, id: String, path: PathBuf) -> Result<()> {
    let game = Game::detect(&path)?;
    let title = game.title();
    launcher.library().update(&id, |entry| {
        entry.known_title = Some(title);
        entry.content = game.content;
        entry.executable = None;
    })
}

#[tauri::command]
pub async fn rename_game(launcher: State<'_, Launcher>, id: String, title: String) -> Result<()> {
    let title = title.trim().to_owned();
    launcher.library().update(&id, |entry| {
        entry.custom_title = (!title.is_empty()).then_some(title);
    })
}

#[tauri::command]
pub async fn set_favorite(launcher: State<'_, Launcher>, id: String, favorite: bool) -> Result<()> {
    launcher
        .library()
        .update(&id, |entry| entry.favorite = favorite)
}

#[tauri::command]
pub async fn set_executable(
    launcher: State<'_, Launcher>,
    id: String,
    path: Option<PathBuf>,
) -> Result<()> {
    launcher
        .library()
        .update(&id, |entry| entry.executable = path)
}

#[tauri::command]
pub async fn set_cover(
    launcher: State<'_, Launcher>,
    id: String,
    path: Option<PathBuf>,
) -> Result<()> {
    launcher.entry(&id)?;
    covers::set_custom(&launcher.cover_path(&id), path)?;
    launcher
        .library()
        .update(&id, |entry| entry.cover_changed_at = Some(now_millis()))
}

#[tauri::command]
pub async fn game_cover(launcher: State<'_, Launcher>, id: String) -> Result<Response> {
    let entry = launcher.entry(&id)?;
    let game = Game::detect(&entry.content).ok();
    let image = covers::read(&launcher.cover_path(&id), game.as_ref());
    Ok(Response::new(image.unwrap_or_default()))
}

#[tauri::command]
pub async fn install_cheats(launcher: State<'_, Launcher>, id: String) -> Result<()> {
    patcher::install(&launcher.idle_game(&id)?)
}

#[tauri::command]
pub async fn uninstall_cheats(
    launcher: State<'_, Launcher>,
    id: String,
    remove_settings: bool,
) -> Result<()> {
    patcher::uninstall(&launcher.idle_game(&id)?, remove_settings)
}

#[tauri::command]
pub async fn game_log(launcher: State<'_, Launcher>, id: String) -> Result<String> {
    let game = launcher.game(&id)?;
    let program = launcher.executable(&launcher.entry(&id)?, &game);
    Ok(logs::report(
        &game,
        program.as_deref(),
        launcher.is_developer_mode(),
    ))
}

#[tauri::command]
pub async fn live_game(
    launcher: State<'_, Launcher>,
    id: String,
    session: Option<String>,
    action: Option<Value>,
    query: Option<Value>,
) -> Result<Option<Value>> {
    if !launcher.is_running(&id) {
        return Ok(None);
    }
    let folder = launcher.game(&id)?.settings_folder();
    Ok(tauri::async_runtime::spawn_blocking(move || {
        live::request(&folder, session.as_deref(), action.as_ref(), query.as_ref())
    })
    .await
    .ok()
    .flatten())
}

#[tauri::command]
pub async fn clear_log(launcher: State<'_, Launcher>, id: String) -> Result<()> {
    logs::clear(&launcher.game(&id)?)
}
#[tauri::command]
pub async fn list_sessions(launcher: State<'_, Launcher>) -> Result<Vec<Session>> {
    Ok(launcher.past_sessions())
}

#[tauri::command]
pub async fn set_arguments(
    launcher: State<'_, Launcher>,
    id: String,
    arguments: String,
) -> Result<()> {
    launcher
        .library()
        .update(&id, |entry| entry.arguments = arguments)
}

#[tauri::command]
pub async fn set_play_status(
    launcher: State<'_, Launcher>,
    id: String,
    status: PlayStatus,
) -> Result<()> {
    launcher
        .library()
        .update(&id, |entry| entry.play_status = status)
}

#[tauri::command]
pub async fn set_notes(launcher: State<'_, Launcher>, id: String, notes: String) -> Result<()> {
    launcher.library().update(&id, |entry| entry.notes = notes)
}

#[tauri::command]
pub async fn set_stays_in_tray(launcher: State<'_, Launcher>, stays: bool) -> Result<()> {
    launcher.set_stays_in_tray(stays);
    Ok(())
}

#[tauri::command]
pub async fn set_developer_mode(launcher: State<'_, Launcher>, enabled: bool) -> Result<()> {
    launcher.set_developer_mode(enabled);
    Ok(())
}

#[tauri::command]
pub async fn play_game(
    app: AppHandle,
    launcher: State<'_, Launcher>,
    id: String,
    backup_first: bool,
) -> Result<()> {
    if backup_first {
        let game = launcher.idle_game(&id)?;
        launcher
            .vault(&game, &id)
            .create_if_changed(BackupKind::BeforePlay)?;
    }
    launcher.start(&id)?;
    desktop::refresh_tray(&app);
    Ok(())
}

#[tauri::command]
pub async fn stop_game(launcher: State<'_, Launcher>, id: String) -> Result<()> {
    launcher.entry(&id)?;
    launcher.stop(&id);
    Ok(())
}

#[tauri::command]
pub async fn open_folder(launcher: State<'_, Launcher>, id: String, folder: Folder) -> Result<()> {
    let path = match folder {
        Folder::Game => launcher.game(&id)?.root().to_owned(),
        Folder::Saves => launcher.game(&id)?.save_folder(),
        Folder::Backups => launcher.backup_folder(&id),
    };
    fs::create_dir_all(&path).at(&path)?;
    tauri_plugin_opener::open_path(&path, None::<&str>)
        .map_err(|error| std::io::Error::other(error.to_string()))
        .at(&path)
}

#[tauri::command]
pub async fn list_backups(launcher: State<'_, Launcher>, id: String) -> Result<Vec<Backup>> {
    launcher.vault(&launcher.game(&id)?, &id).list()
}

#[tauri::command]
pub async fn create_backup(launcher: State<'_, Launcher>, id: String) -> Result<Backup> {
    launcher.vault(&launcher.game(&id)?, &id).create()
}

#[tauri::command]
pub async fn restore_backup(
    launcher: State<'_, Launcher>,
    id: String,
    backup: String,
) -> Result<()> {
    launcher
        .vault(&launcher.idle_game(&id)?, &id)
        .restore(&backup)
}

#[tauri::command]
pub async fn delete_backup(
    launcher: State<'_, Launcher>,
    id: String,
    backup: String,
) -> Result<()> {
    launcher.vault(&launcher.game(&id)?, &id).delete(&backup)
}
