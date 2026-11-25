use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;
use serde_json::Value;

use crate::error::{Error, Result};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
pub enum Engine {
    #[serde(rename = "MV")]
    Mv,
    #[serde(rename = "MZ")]
    Mz,
}

#[derive(Debug)]
pub struct Game {
    pub engine: Engine,
    pub content: PathBuf,
}

impl Game {
    pub fn detect(path: &Path) -> Result<Self> {
        if !path.exists() {
            return Err(Error::NotFound(path.to_owned()));
        }
        let folder = if path.is_file() {
            path.parent().unwrap_or(path)
        } else {
            path
        };

        [folder.to_owned(), folder.join("www")]
            .into_iter()
            .find_map(Self::at_content)
            .ok_or_else(|| missing_game_error(folder))
    }

    fn at_content(content: PathBuf) -> Option<Self> {
        let scripts = content.join("js");
        if !scripts.join("main.js").is_file() {
            return None;
        }
        let engine = if scripts.join("rmmz_core.js").is_file() {
            Engine::Mz
        } else if scripts.join("rpg_core.js").is_file() {
            Engine::Mv
        } else {
            return None;
        };
        Some(Self { engine, content })
    }

    pub fn main_script(&self) -> PathBuf {
        self.content.join("js").join("main.js")
    }

    pub fn cheat_folder(&self) -> PathBuf {
        self.content.join("cheat")
    }

    pub fn settings_folder(&self) -> PathBuf {
        self.content.join("cheat-settings")
    }

    pub fn title(&self) -> String {
        let system = read_json(&self.content.join("data").join("System.json"));
        text_field(system.as_ref(), "gameTitle").unwrap_or_else(|| self.folder_name())
    }

    fn folder_name(&self) -> String {
        let is_www = self
            .content
            .file_name()
            .is_some_and(|name| name.eq_ignore_ascii_case("www"));
        let folder = if is_www {
            self.content.parent().unwrap_or(&self.content)
        } else {
            &self.content
        };
        folder
            .file_name()
            .unwrap_or(folder.as_os_str())
            .to_string_lossy()
            .into_owned()
    }
}

fn read_json(path: &Path) -> Option<Value> {
    let text = fs::read_to_string(path).ok()?;
    serde_json::from_str(text.trim_start_matches('\u{feff}')).ok()
}

fn text_field(json: Option<&Value>, key: &str) -> Option<String> {
    let text = json?.get(key)?.as_str()?.trim();
    (!text.is_empty()).then(|| text.to_owned())
}

fn missing_game_error(folder: &Path) -> Error {
    let has_packed_content = folder.join("package.nw").is_file();
    let has_runtime = folder.join("nw.dll").is_file() || folder.join("Game.exe").is_file();
    if has_packed_content || has_runtime {
        Error::PackedGame
    } else {
        Error::NotAGame
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testing::TempFolder;

    #[test]
    fn finds_mv_in_www_from_folder_or_exe() {
        let temp = TempFolder::new();
        temp.write("www/js/main.js", b"");
        temp.write("www/js/rpg_core.js", b"");
        temp.write("Game.exe", b"");

        for path in [temp.path().to_owned(), temp.path().join("Game.exe")] {
            let game = Game::detect(&path).unwrap();
            assert_eq!(game.engine, Engine::Mv);
            assert_eq!(game.content, temp.path().join("www"));
        }
    }

    #[test]
    fn finds_games_without_www() {
        for (core, engine) in [("rpg_core.js", Engine::Mv), ("rmmz_core.js", Engine::Mz)] {
            let temp = TempFolder::new();
            temp.write("js/main.js", b"");
            temp.write(&format!("js/{core}"), b"");

            assert_eq!(Game::detect(temp.path()).unwrap().engine, engine);
        }
    }

    #[test]
    fn explains_packed_and_unrelated_folders() {
        let packed = TempFolder::new();
        packed.write("Game.exe", b"");
        let unrelated = TempFolder::new();

        assert!(matches!(
            Game::detect(packed.path()),
            Err(Error::PackedGame)
        ));
        assert!(matches!(
            Game::detect(unrelated.path()),
            Err(Error::NotAGame)
        ));
        assert!(matches!(
            Game::detect(&unrelated.path().join("gone")),
            Err(Error::NotFound(_))
        ));
    }

    #[test]
    fn reads_title_with_bom_and_falls_back_to_folder() {
        let temp = TempFolder::new();
        temp.write("www/js/main.js", b"");
        temp.write("www/js/rpg_core.js", b"");
        let folder = temp.path().file_name().unwrap().to_string_lossy();
        let game = Game::detect(temp.path()).unwrap();
        assert_eq!(game.title(), folder);

        temp.write(
            "www/data/System.json",
            "\u{feff}{\"gameTitle\":\"Moon Quest\"}".as_bytes(),
        );
        assert_eq!(game.title(), "Moon Quest");
    }
}
