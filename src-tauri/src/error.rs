use std::fmt;
use std::io;
use std::path::{Path, PathBuf};

use serde::{Serialize, Serializer};

#[derive(Debug)]
pub enum Error {
    NotFound(PathBuf),
    NotAGame,
    PackedGame,
    UnknownGame,
    UnknownBackup,
    NoSaves,
    NoExecutable,
    GameIsRunning,
    UnsupportedCover,
    Launch(io::Error),
    Library(String),
    File { path: PathBuf, source: io::Error },
}

pub type Result<T> = std::result::Result<T, Error>;

impl fmt::Display for Error {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NotFound(path) => write!(formatter, "{} no longer exists.", path.display()),
            Self::NotAGame => write!(
                formatter,
                "No RPG Maker MV or MZ game was found here. Choose the folder that contains the game's exe file."
            ),
            Self::PackedGame => write!(
                formatter,
                "This game is packed into a single file, so it cannot be changed. Only games with a visible js folder are supported."
            ),
            Self::UnknownGame => write!(formatter, "This game is no longer in the library."),
            Self::UnknownBackup => write!(formatter, "This backup no longer exists."),
            Self::NoSaves => write!(formatter, "This game has no save files yet."),
            Self::NoExecutable => write!(
                formatter,
                "The game's exe file was not found. Choose it under Details."
            ),
            Self::GameIsRunning => write!(formatter, "Close the game first."),
            Self::UnsupportedCover => write!(
                formatter,
                "Choose a PNG, JPG or WebP image smaller than 10 MB."
            ),
            Self::Launch(source) => write!(formatter, "{}", explain_launch(source)),
            Self::Library(reason) => {
                write!(formatter, "The library could not be saved: {reason}")
            }
            Self::File { path, source } => write!(formatter, "{}", explain_file(path, source)),
        }
    }
}

impl std::error::Error for Error {}

impl Serialize for Error {
    fn serialize<S: Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        serializer.collect_str(self)
    }
}

fn explain_launch(source: &io::Error) -> String {
    const ELEVATION_REQUIRED: i32 = 740;
    if cfg!(windows) && source.raw_os_error() == Some(ELEVATION_REQUIRED) {
        return "This game asks for administrator rights. Start it from its own folder.".to_owned();
    }
    format!("The game could not start: {source}")
}

fn explain_file(path: &Path, source: &io::Error) -> String {
    match source.kind() {
        io::ErrorKind::PermissionDenied => format!(
            "No permission to change {}. Close the game, then move it out of Program Files or run this app as administrator.",
            path.display()
        ),
        io::ErrorKind::StorageFull => "The disk is full.".to_owned(),
        _ => format!("Could not change {}: {source}", path.display()),
    }
}

pub trait AtPath<T> {
    fn at(self, path: &Path) -> Result<T>;
}

impl<T> AtPath<T> for io::Result<T> {
    fn at(self, path: &Path) -> Result<T> {
        self.map_err(|source| Error::File {
            path: path.to_owned(),
            source,
        })
    }
}
