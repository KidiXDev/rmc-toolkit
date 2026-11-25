use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::error::{AtPath, Result};

pub fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |elapsed| elapsed.as_millis() as u64)
}

pub fn write_atomically(path: &Path, content: &[u8]) -> Result<()> {
    let pending = path.with_extension("rmc-tmp");
    fs::write(&pending, content).at(&pending)?;
    fs::rename(&pending, path).at(path).inspect_err(|_| {
        let _ = fs::remove_file(&pending);
    })
}

pub fn ignore_missing(result: io::Result<()>) -> io::Result<()> {
    match result {
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(()),
        other => other,
    }
}

pub fn remove_file(path: &Path) -> Result<()> {
    ignore_missing(fs::remove_file(path)).at(path)
}

pub fn remove_folder(path: &Path) -> Result<()> {
    ignore_missing(fs::remove_dir_all(path)).at(path)
}

pub fn relative_files(root: &Path) -> Result<Vec<PathBuf>> {
    let mut files = Vec::new();
    collect_files(root, Path::new(""), &mut files)?;
    files.sort();
    Ok(files)
}

fn collect_files(root: &Path, relative: &Path, files: &mut Vec<PathBuf>) -> Result<()> {
    let folder = root.join(relative);
    if !folder.is_dir() {
        return Ok(());
    }
    for entry in fs::read_dir(&folder).at(&folder)? {
        let entry = entry.at(&folder)?;
        let kind = entry.file_type().at(&folder)?;
        let path = relative.join(entry.file_name());
        if kind.is_dir() {
            collect_files(root, &path, files)?;
        } else if kind.is_file() {
            files.push(path);
        }
    }
    Ok(())
}

pub fn copy_into(source: &Path, target: &Path) -> Result<()> {
    if let Some(folder) = target.parent() {
        fs::create_dir_all(folder).at(folder)?;
    }
    write_atomically(target, &fs::read(source).at(source)?)
}
