use std::fs;
use std::path::{Path, PathBuf};
use std::thread;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::ipc::Response;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::covers;
use crate::error::{AtPath, Result};
use crate::files::now_millis;
use crate::game::{Engine, Game};
use crate::launcher::Launcher;
use crate::library::Entry;
use crate::patcher::{self, InstallState};
use crate::process;
use crate::saves::{Backup, BackupKind};
use crate::scan;

const LIBRARY_CHANGED: &str = "library-changed";
const ERROR_LOG: &str = "rmc-errors.json";

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
    is_running: bool,
    favorite: bool,
    play_seconds: u64,
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
        .or_else(|| entry.known_title.clone())
        .unwrap_or_else(|| folder_name(&entry.content));

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
        is_running: launcher.is_running(&entry.id),
        favorite: entry.favorite,
        play_seconds: entry.play_seconds,
        last_played: entry.last_played,
        added_at: entry.added_at,
        cover_key: format!("{}-{}", entry.id, entry.cover_changed_at.unwrap_or(0)),
        id: entry.id,
    }
}

fn folder_name(path: &Path) -> String {
    let is_www = path
        .file_name()
        .is_some_and(|name| name.eq_ignore_ascii_case("www"));
    let folder = path.parent().filter(|_| is_www).unwrap_or(path);
    folder
        .file_name()
        .unwrap_or(folder.as_os_str())
        .to_string_lossy()
        .into_owned()
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
pub async fn cheat_errors(launcher: State<'_, Launcher>, id: String) -> Result<Vec<Value>> {
    let log = launcher.game(&id)?.settings_folder().join(ERROR_LOG);
    let text = fs::read_to_string(log).unwrap_or_default();
    Ok(serde_json::from_str(&text).unwrap_or_default())
}

#[tauri::command]
pub async fn play_game(
    app: AppHandle,
    launcher: State<'_, Launcher>,
    id: String,
    backup_first: bool,
) -> Result<()> {
    let game = launcher.idle_game(&id)?;
    let entry = launcher.entry(&id)?;
    let executable = launcher
        .executable(&entry, &game)
        .ok_or(crate::error::Error::NoExecutable)?;
    if backup_first {
        launcher
            .vault(&game, &id)
            .create_if_changed(BackupKind::BeforePlay)?;
    }

    let mut child = process::start(&executable)?;
    launcher.start_session(&id)?;
    thread::spawn(move || {
        let _ = child.wait();
        let _ = app.state::<Launcher>().end_session(&id);
        let _ = app.emit(LIBRARY_CHANGED, ());
    });
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
