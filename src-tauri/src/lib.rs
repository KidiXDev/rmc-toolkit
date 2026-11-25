mod commands;
mod error;
mod game;
mod patcher;
mod registry;

#[cfg(test)]
mod testing;

pub fn run() -> tauri::Result<()> {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::toolkit_version,
            commands::inspect_game,
            commands::list_games,
            commands::install_game,
            commands::uninstall_game,
            commands::forget_game,
        ])
        .run(tauri::generate_context!())
}
