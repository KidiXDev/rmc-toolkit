use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Manager};

use crate::error::{Error, Result};
use crate::game::{Engine, Game};
use crate::patcher::{self, InstallState};
use crate::registry::Registry;

static REGISTRY_LOCK: Mutex<()> = Mutex::new(());

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub enum Status {
    NotInstalled,
    Current,
    Outdated,
    Missing,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameInfo {
    path: PathBuf,
    title: String,
    engine: Option<Engine>,
    status: Status,
    version: Option<String>,
}

impl GameInfo {
    fn of(game: &Game) -> Result<Self> {
        let (status, version) = match patcher::state(game)? {
            InstallState::NotInstalled => (Status::NotInstalled, None),
            InstallState::Current(version) => (Status::Current, Some(version)),
            InstallState::Outdated(version) => (Status::Outdated, Some(version)),
        };
        Ok(Self {
            path: game.content.clone(),
            title: game.title(),
            engine: Some(game.engine),
            status,
            version,
        })
    }

    fn missing(path: &Path) -> Self {
        Self {
            path: path.to_owned(),
            title: path
                .file_name()
                .unwrap_or(path.as_os_str())
                .to_string_lossy()
                .into_owned(),
            engine: None,
            status: Status::Missing,
            version: None,
        }
    }
}

fn with_registry<T>(app: &AppHandle, run: impl FnOnce(&mut Registry) -> Result<T>) -> Result<T> {
    let _guard = REGISTRY_LOCK
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    let folder = app
        .path()
        .app_config_dir()
        .map_err(|error| Error::Registry(error.to_string()))?;
    run(&mut Registry::load(&folder)?)
}

#[tauri::command]
pub fn toolkit_version() -> String {
    patcher::bundled_version()
}

#[tauri::command]
pub async fn inspect_game(path: PathBuf) -> Result<GameInfo> {
    GameInfo::of(&Game::detect(&path)?)
}

#[tauri::command]
pub async fn list_games(app: AppHandle) -> Result<Vec<GameInfo>> {
    with_registry(&app, |registry| {
        Ok(registry
            .games()
            .iter()
            .map(|path| {
                Game::detect(path)
                    .and_then(|game| GameInfo::of(&game))
                    .unwrap_or_else(|_| GameInfo::missing(path))
            })
            .collect())
    })
}

#[tauri::command]
pub async fn install_game(app: AppHandle, path: PathBuf) -> Result<GameInfo> {
    let game = Game::detect(&path)?;
    patcher::install(&game)?;
    with_registry(&app, |registry| registry.add(&game.content))?;
    GameInfo::of(&game)
}

#[tauri::command]
pub async fn uninstall_game(
    app: AppHandle,
    path: PathBuf,
    remove_settings: bool,
) -> Result<GameInfo> {
    let game = Game::detect(&path)?;
    patcher::uninstall(&game, remove_settings)?;
    with_registry(&app, |registry| registry.remove(&game.content))?;
    GameInfo::of(&game)
}

#[tauri::command]
pub async fn forget_game(app: AppHandle, path: PathBuf) -> Result<()> {
    with_registry(&app, |registry| registry.remove(&path))
}
