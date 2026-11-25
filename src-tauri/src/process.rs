use std::path::{Path, PathBuf};
use std::process::{Child, Command};

use crate::error::{Error, Result};

pub fn start(executable: &Path) -> Result<Child> {
    let folder: PathBuf = executable
        .parent()
        .ok_or(Error::NoExecutable)?
        .to_path_buf();
    Command::new(executable)
        .current_dir(folder)
        .spawn()
        .map_err(Error::Launch)
}
