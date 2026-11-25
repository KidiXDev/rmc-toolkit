use std::fs;
use std::path::{Path, PathBuf};

use crate::error::Result;
use crate::files::remove_file;
use crate::game::Game;
use crate::patcher;

const LOG_NAME: &str = "rmc-log.log";

pub fn report(game: &Game, program: Option<&Path>, developer_mode: bool) -> String {
    let cheats = match patcher::state(game) {
        Ok(state) => format!("{state:?}"),
        Err(error) => error.to_string(),
    };
    let program = program.map_or_else(|| "not found".to_owned(), |path| path.display().to_string());

    let package = if developer_mode {
        format!(
            "package.json\n{}\n\n",
            read(&game.root().join("package.json"))
        )
    } else {
        String::new()
    };

    format!(
        "launcher {}\nengine {:?} {}\ncheats {cheats}\ncontent {}\nprogram {program}\n\n{package}log\n{}",
        patcher::bundled_version(),
        game.engine,
        game.maker_version().unwrap_or_default(),
        game.content.display(),
        read(&log_path(game)),
    )
}

pub fn clear(game: &Game) -> Result<()> {
    remove_file(&log_path(game))
}

fn log_path(game: &Game) -> PathBuf {
    game.settings_folder().join(LOG_NAME)
}

fn read(path: &Path) -> String {
    fs::read(path).map_or_else(
        |_| "nothing yet".to_owned(),
        |bytes| String::from_utf8_lossy(&bytes).trim().to_owned(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testing::TempFolder;

    #[test]
    fn report_shows_the_game_setup_and_its_log() {
        let temp = TempFolder::with_mv_game();
        let game = Game::detect(temp.path()).unwrap();
        assert!(report(&game, None, false).ends_with("log\nnothing yet"));

        temp.write("package.json", br#"{"main":"www/index.html"}"#);
        temp.write("www/cheat-settings/rmc-log.log", b"overlay mounted \xff\n");
        let text = report(&game, Some(Path::new("Game.exe")), true);
        assert!(text.contains("engine Mv"));
        assert!(text.contains("cheats NotInstalled"));
        assert!(text.contains("program Game.exe"));
        assert!(text.contains(r#"{"main":"www/index.html"}"#));
        assert!(text.ends_with("overlay mounted \u{fffd}"));
        assert!(!report(&game, None, false).contains("package.json"));
    }

    #[test]
    fn clearing_keeps_the_settings() {
        let temp = TempFolder::with_mv_game();
        let game = Game::detect(temp.path()).unwrap();
        temp.write("www/cheat-settings/rmc-log.log", b"old");
        temp.write("www/cheat-settings/rmc-settings.json", b"{}");

        clear(&game).unwrap();
        clear(&game).unwrap();
        assert!(report(&game, None, false).ends_with("nothing yet"));
        assert_eq!(temp.read("www/cheat-settings/rmc-settings.json"), b"{}");
    }
}
