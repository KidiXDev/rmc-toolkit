use std::fs;
use std::io;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

use crate::error::{Error, Result};
use crate::files::now_millis;
use crate::game::{name_of, root_of};

const FNV_OFFSET: u64 = 0xcbf2_9ce4_8422_2325;
const FNV_PRIME: u64 = 0x0100_0000_01b3;

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PlayStatus {
    #[default]
    Unsorted,
    Planned,
    Playing,
    Finished,
    Dropped,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub id: String,
    pub content: PathBuf,
    #[serde(default)]
    pub known_title: Option<String>,
    #[serde(default)]
    pub custom_title: Option<String>,
    #[serde(default)]
    pub executable: Option<PathBuf>,
    #[serde(default)]
    pub arguments: String,
    #[serde(default)]
    pub play_status: PlayStatus,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub favorite: bool,
    #[serde(default, rename = "playSeconds", with = "whole_seconds")]
    pub play_ms: u64,
    #[serde(default)]
    pub last_played: Option<u64>,
    #[serde(default)]
    pub added_at: u64,
    #[serde(default)]
    pub cover_changed_at: Option<u64>,
}

impl Entry {
    fn new(content: &Path, known_title: Option<String>) -> Self {
        Self {
            id: id_for(content),
            content: content.to_owned(),
            known_title,
            custom_title: None,
            executable: None,
            arguments: String::new(),
            play_status: PlayStatus::default(),
            notes: String::new(),
            favorite: false,
            play_ms: 0,
            last_played: None,
            added_at: now_millis(),
            cover_changed_at: None,
        }
    }

    pub fn root(&self) -> &Path {
        root_of(&self.content)
    }

    pub fn known_name(&self) -> String {
        self.custom_title
            .clone()
            .or_else(|| self.known_title.clone())
            .unwrap_or_else(|| name_of(self.root()))
    }
}

mod whole_seconds {
    use serde::{Deserialize, Deserializer, Serializer};

    pub fn serialize<S: Serializer>(millis: &u64, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_f64(*millis as f64 / 1000.0)
    }

    pub fn deserialize<'de, D: Deserializer<'de>>(deserializer: D) -> Result<u64, D::Error> {
        Ok((f64::deserialize(deserializer)? * 1000.0) as u64)
    }
}

#[derive(Deserialize)]
#[serde(untagged)]
enum StoredEntry {
    Entry(Box<Entry>),
    Path(PathBuf),
}

impl From<StoredEntry> for Entry {
    fn from(stored: StoredEntry) -> Self {
        match stored {
            StoredEntry::Entry(entry) => *entry,
            StoredEntry::Path(path) => Self::new(&path, None),
        }
    }
}

pub struct Library {
    file: PathBuf,
    entries: Vec<Entry>,
}

impl Library {
    pub fn load(file: PathBuf) -> Result<Self> {
        let entries = match fs::read_to_string(&file) {
            Ok(text) => parse_or_set_aside(&file, &text)?,
            Err(error) if error.kind() == io::ErrorKind::NotFound => Vec::new(),
            Err(error) => return Err(Error::Library(error.to_string())),
        };
        Ok(Self { file, entries })
    }

    pub fn entries(&self) -> &[Entry] {
        &self.entries
    }

    pub fn get(&self, id: &str) -> Result<&Entry> {
        self.entries
            .iter()
            .find(|entry| entry.id == id)
            .ok_or(Error::UnknownGame)
    }

    pub fn find_path(&self, content: &Path) -> Option<&Entry> {
        self.entries
            .iter()
            .find(|entry| is_same_path(&entry.content, content))
    }

    pub fn add(&mut self, content: &Path, title: String) -> Result<String> {
        if let Some(entry) = self.find_path(content) {
            return Ok(entry.id.clone());
        }
        let mut entry = Entry::new(content, Some(title));
        while self.get(&entry.id).is_ok() {
            entry.id.push('x');
        }
        let id = entry.id.clone();
        self.entries.push(entry);
        self.save()?;
        Ok(id)
    }

    pub fn remove(&mut self, id: &str) -> Result<()> {
        self.entries.retain(|entry| entry.id != id);
        self.save()
    }

    pub fn update(&mut self, id: &str, change: impl FnOnce(&mut Entry)) -> Result<()> {
        let entry = self
            .entries
            .iter_mut()
            .find(|entry| entry.id == id)
            .ok_or(Error::UnknownGame)?;
        change(entry);
        self.save()
    }

    fn save(&self) -> Result<()> {
        let write = || -> io::Result<()> {
            if let Some(folder) = self.file.parent() {
                fs::create_dir_all(folder)?;
            }
            let pending = self.file.with_extension("tmp");
            fs::write(&pending, serde_json::to_string_pretty(&self.entries)?)?;
            fs::rename(&pending, &self.file)
        };
        write().map_err(|error| Error::Library(error.to_string()))
    }
}

fn parse_or_set_aside(file: &Path, text: &str) -> Result<Vec<Entry>> {
    if let Ok(stored) = serde_json::from_str::<Vec<StoredEntry>>(text) {
        return Ok(stored.into_iter().map(Entry::from).collect());
    }
    fs::rename(file, file.with_extension("damaged.json"))
        .map_err(|error| Error::Library(error.to_string()))?;
    Ok(Vec::new())
}

fn id_for(path: &Path) -> String {
    let text = path.to_string_lossy().to_lowercase();
    let hash = text.bytes().fold(FNV_OFFSET, |hash, byte| {
        (hash ^ u64::from(byte)).wrapping_mul(FNV_PRIME)
    });
    format!("{hash:016x}")
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

    fn library_in(temp: &TempFolder) -> Library {
        Library::load(temp.path().join("games.json")).unwrap()
    }

    #[test]
    fn remembers_games_even_when_their_folder_is_gone() {
        let temp = TempFolder::new();
        let missing = Path::new("Z:/unplugged/game");
        let mut library = library_in(&temp);
        let id = library.add(missing, "Moon".to_owned()).unwrap();
        assert_eq!(library.add(missing, "Moon".to_owned()).unwrap(), id);

        library.update(&id, |entry| entry.favorite = true).unwrap();
        let reloaded = library_in(&temp);
        assert_eq!(reloaded.entries().len(), 1);
        assert!(reloaded.get(&id).unwrap().favorite);

        library.remove(&id).unwrap();
        assert!(library_in(&temp).entries().is_empty());
    }

    #[test]
    fn reads_the_first_v2_format() {
        let temp = TempFolder::new();
        temp.write("games.json", br#"["D:/Games/Moon/www"]"#);
        let library = library_in(&temp);

        assert_eq!(library.entries().len(), 1);
        assert_eq!(library.entries()[0].play_ms, 0);
    }

    #[test]
    fn keeps_playtime_saved_by_older_versions() {
        let temp = TempFolder::new();
        temp.write(
            "games.json",
            br#"[{"id":"a","content":"D:/Moon/www","playSeconds":90}]"#,
        );
        let mut library = library_in(&temp);
        assert_eq!(library.get("a").unwrap().play_ms, 90_000);
        assert_eq!(library.get("a").unwrap().known_name(), "Moon");

        library.update("a", |entry| entry.play_ms += 1_500).unwrap();
        assert_eq!(library_in(&temp).get("a").unwrap().play_ms, 91_500);
    }

    #[test]
    fn sets_a_damaged_list_aside() {
        let temp = TempFolder::new();
        temp.write("games.json", b"{oops");

        assert!(library_in(&temp).entries().is_empty());
        assert_eq!(temp.read("games.damaged.json"), b"{oops");
    }

    #[test]
    fn a_moved_game_can_be_added_twice_without_sharing_an_id() {
        let temp = TempFolder::new();
        let path = Path::new("D:/a");
        let mut library = library_in(&temp);
        let first = library.add(path, "Moon".to_owned()).unwrap();
        library
            .update(&first, |entry| entry.content = "D:/b".into())
            .unwrap();

        assert_ne!(library.add(path, "Moon".to_owned()).unwrap(), first);
    }
}
