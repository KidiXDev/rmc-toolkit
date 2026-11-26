use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;
use serde_json::Value;

use crate::error::{Error, Result};

const VERSION_KEY: &str = "RPGMAKER_VERSION";
const OLDEST_SUPPORTED_MV: (u32, u32) = (1, 6);

const HELPER_PROGRAMS: [&str; 6] = [
    "notification_helper",
    "nwjc",
    "chromedriver",
    "payload",
    "crashpad_handler",
    "unins000",
];

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
pub enum Engine {
    #[serde(rename = "MV")]
    Mv,
    #[serde(rename = "MZ")]
    Mz,
    #[serde(rename = "VX Ace")]
    VxAce,
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
        Self::in_folder(folder).ok_or_else(|| missing_game_error(folder))
    }

    pub fn in_folder(folder: &Path) -> Option<Self> {
        if crate::vx_ace::script_target(folder).is_some() {
            return Some(Self {
                engine: Engine::VxAce,
                content: folder.to_owned(),
            });
        }
        [folder.to_owned(), folder.join("www")]
            .into_iter()
            .find_map(Self::at_content)
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

    pub fn root(&self) -> &Path {
        root_of(&self.content)
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

    pub fn save_folder(&self) -> PathBuf {
        if self.engine == Engine::VxAce {
            return self.content.clone();
        }
        self.content.join("save")
    }

    pub fn title(&self) -> String {
        if self.engine == Engine::VxAce {
            return crate::vx_ace::ini_value(self.root(), "Title")
                .unwrap_or_else(|| name_of(self.root()));
        }
        self.system_text("gameTitle")
            .unwrap_or_else(|| name_of(self.root()))
    }

    pub fn title_image(&self) -> Option<PathBuf> {
        let name = self.system_text("title1Name")?;
        let is_plain_name = Path::new(&name).components().count() == 1;
        is_plain_name.then(|| {
            self.content
                .join("img")
                .join("titles1")
                .join(format!("{name}.png"))
        })
    }

    pub fn icon_image(&self) -> PathBuf {
        self.content.join("icon").join("icon.png")
    }

    pub fn maker_version(&self) -> Option<String> {
        let core = match self.engine {
            Engine::Mv => "rpg_core.js",
            Engine::Mz => "rmmz_core.js",
            Engine::VxAce => return None,
        };
        let script = fs::read(self.content.join("js").join(core)).ok()?;
        let script = String::from_utf8_lossy(&script);
        script.split(VERSION_KEY).skip(1).find_map(assigned_text)
    }

    pub fn is_supported(&self, maker_version: Option<&str>) -> bool {
        let Some(version) = maker_version.filter(|_| self.engine == Engine::Mv) else {
            return true;
        };
        let mut numbers = version.split('.').map(|part| part.parse().unwrap_or(0));
        let major = numbers.next().unwrap_or(0);
        let minor = numbers.next().unwrap_or(0);
        (major, minor) >= OLDEST_SUPPORTED_MV
    }

    pub fn executable(&self) -> Option<PathBuf> {
        let root = self.root();
        let usual = root.join(if cfg!(windows) { "Game.exe" } else { "Game" });
        if usual.is_file() {
            return Some(usual);
        }
        let mut programs: Vec<PathBuf> = fs::read_dir(root)
            .ok()?
            .filter_map(|entry| Some(entry.ok()?.path()))
            .filter(|path| is_game_program(path))
            .collect();
        programs.sort();
        programs.into_iter().next()
    }

    fn system_text(&self, key: &str) -> Option<String> {
        let path = self.content.join("data").join("System.json");
        let text = fs::read_to_string(path).ok()?;
        let system: Value = serde_json::from_str(text.trim_start_matches('\u{feff}')).ok()?;
        let value = system.get(key)?.as_str()?.trim();
        (!value.is_empty()).then(|| value.to_owned())
    }
}

fn assigned_text(rest: &str) -> Option<String> {
    let quoted = rest
        .trim_start()
        .strip_prefix('=')?
        .trim_start()
        .strip_prefix(['"', '\''])?;
    let (text, _) = quoted.split_once(['"', '\''])?;
    Some(text.to_owned())
}

pub fn root_of(content: &Path) -> &Path {
    let is_www = content
        .file_name()
        .is_some_and(|name| name.eq_ignore_ascii_case("www"))
        && crate::vx_ace::script_target(content).is_none();
    content.parent().filter(|_| is_www).unwrap_or(content)
}

pub fn name_of(folder: &Path) -> String {
    folder
        .file_name()
        .unwrap_or(folder.as_os_str())
        .to_string_lossy()
        .into_owned()
}

pub fn is_helper_program(path: &Path) -> bool {
    path.file_stem()
        .map(|stem| stem.to_string_lossy().to_lowercase())
        .is_some_and(|stem| HELPER_PROGRAMS.contains(&stem.as_str()))
}

fn is_game_program(path: &Path) -> bool {
    let stem = path
        .file_stem()
        .map(|stem| stem.to_string_lossy().to_lowercase())
        .unwrap_or_default();
    let is_program = if cfg!(windows) {
        path.extension()
            .is_some_and(|extension| extension.eq_ignore_ascii_case("exe"))
    } else {
        stem == "nw"
    };
    is_program && path.is_file() && !is_helper_program(path)
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
        let temp = TempFolder::with_mv_game();
        temp.write("Game.exe", b"");

        for path in [temp.path().to_owned(), temp.path().join("Game.exe")] {
            let game = Game::detect(&path).unwrap();
            assert_eq!(game.engine, Engine::Mv);
            assert_eq!(game.content, temp.path().join("www"));
            assert_eq!(game.root(), temp.path());
        }
    }

    #[test]
    fn finds_games_without_www() {
        for (core, engine) in [("rpg_core.js", Engine::Mv), ("rmmz_core.js", Engine::Mz)] {
            let temp = TempFolder::new();
            temp.write("js/main.js", b"");
            temp.write(&format!("js/{core}"), b"");
            let game = Game::detect(temp.path()).unwrap();

            assert_eq!(game.engine, engine);
            assert_eq!(game.root(), temp.path());
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
        let temp = TempFolder::with_mv_game();
        let folder = temp.path().file_name().unwrap().to_string_lossy();
        let game = Game::detect(temp.path()).unwrap();
        assert_eq!(game.title(), folder);

        temp.write(
            "www/data/System.json",
            "\u{feff}{\"gameTitle\":\"Moon Quest\"}".as_bytes(),
        );
        assert_eq!(game.title(), "Moon Quest");
    }

    #[test]
    fn title_image_never_leaves_the_game_folder() {
        let temp = TempFolder::with_mv_game();
        let game = Game::detect(temp.path()).unwrap();
        temp.write("www/data/System.json", br#"{"title1Name":"../../secret"}"#);
        assert_eq!(game.title_image(), None);

        temp.write("www/data/System.json", br#"{"title1Name":"Castle"}"#);
        assert!(game.title_image().unwrap().ends_with("titles1/Castle.png"));
    }

    #[test]
    fn reads_the_maker_version_and_flags_old_ones() {
        let temp = TempFolder::with_mv_game();
        let game = Game::detect(temp.path()).unwrap();
        assert!(game.is_supported(None));

        for (script, version, supported) in [
            ("Utils.RPGMAKER_VERSION = '1.6.2';", "1.6.2", true),
            ("Utils.RPGMAKER_VERSION = \"1.5.1\";", "1.5.1", false),
            (
                "/** @property RPGMAKER_VERSION\n */\nUtils.RPGMAKER_VERSION = \"1.6.1\";",
                "1.6.1",
                true,
            ),
        ] {
            temp.write("www/js/rpg_core.js", script.as_bytes());
            let found = game.maker_version();
            assert_eq!(found.as_deref(), Some(version));
            assert_eq!(game.is_supported(found.as_deref()), supported);
        }
    }

    #[cfg(windows)]
    #[test]
    fn picks_the_game_program_over_helpers() {
        let temp = TempFolder::with_mv_game();
        let game = Game::detect(temp.path()).unwrap();
        assert_eq!(game.executable(), None);

        temp.write("notification_helper.exe", b"");
        temp.write("MoonQuest.exe", b"");
        assert_eq!(game.executable(), Some(temp.path().join("MoonQuest.exe")));

        temp.write("Game.exe", b"");
        assert_eq!(game.executable(), Some(temp.path().join("Game.exe")));
    }
}
