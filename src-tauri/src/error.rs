use std::fmt;
use std::io;
use std::path::{Path, PathBuf};

use serde::{Serialize, Serializer};

#[derive(Debug)]
pub enum Error {
    NotFound(PathBuf),
    NotAGame,
    PackedGame,
    File { path: PathBuf, source: io::Error },
    Registry(String),
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
            Self::File { path, source } => write!(formatter, "{}", explain(path, source)),
            Self::Registry(reason) => {
                write!(formatter, "The list of games could not be saved: {reason}")
            }
        }
    }
}

impl Serialize for Error {
    fn serialize<S: Serializer>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error> {
        serializer.collect_str(self)
    }
}

fn explain(path: &Path, source: &io::Error) -> String {
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
