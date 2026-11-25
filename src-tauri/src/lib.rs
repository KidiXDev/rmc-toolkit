mod commands;
mod covers;
mod error;
mod files;
mod game;
mod launcher;
mod library;
mod patcher;
mod process;
mod saves;
mod scan;

#[cfg(test)]
mod testing;

use tauri::{AppHandle, Manager, RunEvent};

use launcher::Launcher;

fn focus_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

pub fn run() -> tauri::Result<()> {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            focus_main_window(app);
        }))
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let launcher = Launcher::open(
                app.path().app_config_dir()?,
                app.path().app_local_data_dir()?,
            )?;
            app.manage(launcher);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::toolkit_version,
            commands::list_games,
            commands::add_games,
            commands::find_games,
            commands::remove_game,
            commands::locate_game,
            commands::rename_game,
            commands::set_favorite,
            commands::set_executable,
            commands::set_cover,
            commands::game_cover,
            commands::install_cheats,
            commands::uninstall_cheats,
            commands::cheat_errors,
            commands::play_game,
            commands::open_folder,
            commands::list_backups,
            commands::create_backup,
            commands::restore_backup,
            commands::delete_backup,
        ])
        .build(tauri::generate_context!())?;

    app.run(|app, event| {
        if matches!(event, RunEvent::Exit) {
            app.state::<Launcher>().record_open_sessions();
        }
    });
    Ok(())
}
