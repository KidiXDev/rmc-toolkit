use std::fs;
use std::path::{Path, PathBuf};

use crate::error::{AtPath, Error, Result};
use crate::files::{copy_into, remove_file};
use crate::game::Game;

const MAX_BYTES: u64 = 10 * 1024 * 1024;

pub fn read(custom: &Path, game: Option<&Game>) -> Option<Vec<u8>> {
    let mut candidates = vec![custom.to_owned()];
    if let Some(game) = game {
        candidates.extend(game.title_image());
        candidates.push(game.icon_image());
    }
    candidates.into_iter().find_map(|path| read_image(&path))
}

pub fn set_custom(custom: &Path, source: Option<PathBuf>) -> Result<()> {
    let Some(source) = source else {
        return remove_file(custom);
    };
    if read_image(&source).is_none() {
        return Err(Error::UnsupportedCover);
    }
    copy_into(&source, custom)
}

fn read_image(path: &Path) -> Option<Vec<u8>> {
    let size = fs::metadata(path).ok()?.len();
    if size > MAX_BYTES {
        return None;
    }
    let bytes = fs::read(path).at(path).ok()?;
    is_image(&bytes).then_some(bytes)
}

fn is_image(bytes: &[u8]) -> bool {
    let is_png = bytes.starts_with(b"\x89PNG\r\n\x1a\n");
    let is_jpeg = bytes.starts_with(b"\xff\xd8\xff");
    let is_webp = bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP");
    is_png || is_jpeg || is_webp
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testing::TempFolder;

    const PNG: &[u8] = b"\x89PNG\r\n\x1a\nrest";

    #[test]
    fn prefers_custom_then_title_then_icon() {
        let temp = TempFolder::with_mv_game();
        let game = Game::detect(temp.path()).unwrap();
        let custom = temp.path().join("covers/one");
        assert_eq!(read(&custom, Some(&game)), None);

        temp.write("www/icon/icon.png", &[PNG, b"icon"].concat());
        assert!(read(&custom, Some(&game)).unwrap().ends_with(b"icon"));

        temp.write("www/data/System.json", br#"{"title1Name":"Castle"}"#);
        temp.write("www/img/titles1/Castle.png", &[PNG, b"title"].concat());
        assert!(read(&custom, Some(&game)).unwrap().ends_with(b"title"));

        temp.write("mine.png", &[PNG, b"mine"].concat());
        set_custom(&custom, Some(temp.path().join("mine.png"))).unwrap();
        assert!(read(&custom, Some(&game)).unwrap().ends_with(b"mine"));

        set_custom(&custom, None).unwrap();
        assert!(read(&custom, Some(&game)).unwrap().ends_with(b"title"));
    }

    #[test]
    fn refuses_files_that_are_not_images() {
        let temp = TempFolder::new();
        temp.write("notes.png", b"not an image");
        let result = set_custom(
            &temp.path().join("cover"),
            Some(temp.path().join("notes.png")),
        );
        assert!(matches!(result, Err(Error::UnsupportedCover)));
    }
}
