use std::fs;
use std::path::{Path, PathBuf};

use crate::game::Game;

const MAX_DEPTH: usize = 4;
const MAX_FOLDERS: usize = 20_000;

pub fn find_games(root: &Path) -> Vec<Game> {
    let mut found = Vec::new();
    let mut pending: Vec<(PathBuf, usize)> = vec![(root.to_owned(), 0)];
    let mut visited = 0;

    while let Some((folder, depth)) = pending.pop() {
        visited += 1;
        if visited > MAX_FOLDERS {
            break;
        }
        if let Some(game) = Game::in_folder(&folder) {
            found.push(game);
        } else if depth < MAX_DEPTH {
            pending.extend(subfolders(&folder).map(|path| (path, depth + 1)));
        }
    }
    found
}

fn subfolders(folder: &Path) -> impl Iterator<Item = PathBuf> {
    fs::read_dir(folder)
        .into_iter()
        .flatten()
        .flatten()
        .filter(|entry| entry.file_type().is_ok_and(|kind| kind.is_dir()))
        .map(|entry| entry.path())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testing::TempFolder;

    #[test]
    fn finds_nested_games_once() {
        let temp = TempFolder::new();
        for game in ["a/www", "deep/er/b", "deep/er/c/www"] {
            temp.write(&format!("{game}/js/main.js"), b"");
            temp.write(&format!("{game}/js/rpg_core.js"), b"");
        }
        temp.write("1/2/3/4/5/js/main.js", b"");
        temp.write("1/2/3/4/5/js/rpg_core.js", b"");

        let mut contents: Vec<_> = find_games(temp.path())
            .into_iter()
            .map(|game| game.content)
            .collect();
        contents.sort();
        let expected = ["a/www", "deep/er/b", "deep/er/c/www"];
        assert_eq!(contents, expected.map(|path| temp.path().join(path)));
    }
}
