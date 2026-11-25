use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use crate::error::{Error, Result};

const FILE_NAME: &str = "games.json";

pub struct Registry {
    file: PathBuf,
    games: Vec<PathBuf>,
}

impl Registry {
    pub fn load(folder: &Path) -> Result<Self> {
        let file = folder.join(FILE_NAME);
        let games = match fs::read_to_string(&file) {
            Ok(text) => parse_or_set_aside(&file, &text)?,
            Err(error) if error.kind() == io::ErrorKind::NotFound => Vec::new(),
            Err(error) => return Err(Error::Registry(error.to_string())),
        };
        Ok(Self { file, games })
    }

    pub fn games(&self) -> &[PathBuf] {
        &self.games
    }

    pub fn add(&mut self, content: &Path) -> Result<()> {
        if self.games.iter().any(|game| is_same_path(game, content)) {
            return Ok(());
        }
        self.games.push(content.to_owned());
        self.save()
    }

    pub fn remove(&mut self, content: &Path) -> Result<()> {
        self.games.retain(|game| !is_same_path(game, content));
        self.save()
    }

    fn save(&self) -> Result<()> {
        let write = || -> io::Result<()> {
            if let Some(folder) = self.file.parent() {
                fs::create_dir_all(folder)?;
            }
            let pending = self.file.with_extension("tmp");
            fs::write(&pending, serde_json::to_string_pretty(&self.games)?)?;
            fs::rename(&pending, &self.file)
        };
        write().map_err(|error| Error::Registry(error.to_string()))
    }
}

fn parse_or_set_aside(file: &Path, text: &str) -> Result<Vec<PathBuf>> {
    if let Ok(games) = serde_json::from_str(text) {
        return Ok(games);
    }
    fs::rename(file, file.with_extension("damaged.json"))
        .map_err(|error| Error::Registry(error.to_string()))?;
    Ok(Vec::new())
}

fn is_same_path(left: &Path, right: &Path) -> bool {
    if cfg!(windows) {
        left.as_os_str().eq_ignore_ascii_case(right.as_os_str())
    } else {
        left == right
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testing::TempFolder;

    #[test]
    fn remembers_games_even_when_their_folder_is_gone() {
        let temp = TempFolder::new();
        let missing = Path::new("Z:/unplugged/game");
        let mut registry = Registry::load(temp.path()).unwrap();
        registry.add(missing).unwrap();
        registry.add(missing).unwrap();

        assert_eq!(Registry::load(temp.path()).unwrap().games(), [missing]);
        Registry::load(temp.path())
            .unwrap()
            .remove(missing)
            .unwrap();
        assert!(Registry::load(temp.path()).unwrap().games().is_empty());
    }

    #[test]
    fn sets_a_damaged_list_aside() {
        let temp = TempFolder::new();
        temp.write(FILE_NAME, b"{oops");

        assert!(Registry::load(temp.path()).unwrap().games().is_empty());
        assert_eq!(temp.read("games.damaged.json"), b"{oops");
    }
}
