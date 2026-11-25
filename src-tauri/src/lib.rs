mod activity;
mod commands;
mod covers;
mod desktop;
mod error;
mod files;
mod game;
mod launcher;
mod library;
mod patcher;
mod process;
mod processes;
mod saves;
mod scan;
mod tracker;

#[cfg(test)]
mod testing;

use tauri::{Manager, RunEvent};
use tauri_plugin_window_state::StateFlags;

use launcher::Launcher;

pub fn run() -> tauri::Result<()> {
    let remembered = StateFlags::all() - StateFlags::VISIBLE - StateFlags::DECORATIONS;

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            desktop::show_main_window(app);
        }))
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(remembered)
                .build(),
        )
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let launcher = Launcher::open(
                app.path().app_config_dir()?,
                app.path().app_local_data_dir()?,
            )?;
            app.manage(launcher);
            desktop::create_tray(app)?;
            desktop::watch_games(app.handle().clone());
            Ok(())
        })
        .on_window_event(desktop::hide_instead_of_closing)
        .invoke_handler(tauri::generate_handler![
            commands::toolkit_version,
            commands::list_games,
            commands::list_sessions,
            commands::add_games,
            commands::find_games,
            commands::remove_game,
            commands::locate_game,
            commands::rename_game,
            commands::set_favorite,
            commands::set_executable,
            commands::set_arguments,
            commands::set_play_status,
            commands::set_notes,
            commands::set_cover,
            commands::game_cover,
            commands::install_cheats,
            commands::uninstall_cheats,
            commands::cheat_errors,
            commands::play_game,
            commands::stop_game,
            commands::set_stays_in_tray,
            commands::open_folder,
            commands::list_backups,
            commands::create_backup,
            commands::restore_backup,
            commands::delete_backup,
        ])
        .build(tauri::generate_context!())?;

    app.run(|app, event| {
        if matches!(event, RunEvent::Exit) {
            let _ = app.state::<Launcher>().save_checkpoint();
        }
    });
    Ok(())
}
