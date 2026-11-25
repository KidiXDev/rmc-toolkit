use std::io;
use std::path::Path;

use process_wrap::std::{ChildWrapper, CommandWrap};

use crate::error::{Error, Result};
use crate::tracker::RunningProcess;

const ELEVATION_REQUIRED: i32 = 740;

pub struct ProcessTree(Box<dyn ChildWrapper>);

impl ProcessTree {
    pub fn start(program: &Path, arguments: &[String]) -> Result<Self> {
        let folder = program.parent().ok_or(Error::NoExecutable)?;
        let mut command = CommandWrap::with_new(program, |command| {
            command.args(arguments).current_dir(folder);
        });
        #[cfg(windows)]
        command.wrap(process_wrap::std::JobObject);
        #[cfg(unix)]
        command.wrap(process_wrap::std::ProcessGroup::leader());

        command.spawn().map(Self).map_err(|source| {
            if needs_elevation(&source) {
                Error::NeedsElevation
            } else {
                Error::Launch(source)
            }
        })
    }
}

impl RunningProcess for ProcessTree {
    fn is_running(&mut self) -> bool {
        matches!(self.0.try_wait(), Ok(None))
    }

    fn stop(&mut self) {
        let _ = self.0.start_kill();
    }
}

fn needs_elevation(error: &io::Error) -> bool {
    cfg!(windows) && error.raw_os_error() == Some(ELEVATION_REQUIRED)
}

pub fn split_arguments(text: &str) -> Vec<String> {
    let mut arguments = Vec::new();
    let mut current = String::new();
    let mut is_quoted = false;
    let mut has_content = false;

    for character in text.chars() {
        match character {
            '"' => {
                is_quoted = !is_quoted;
                has_content = true;
            }
            character if character.is_whitespace() && !is_quoted => {
                if has_content {
                    arguments.push(std::mem::take(&mut current));
                }
                has_content = false;
            }
            character => {
                current.push(character);
                has_content = true;
            }
        }
    }
    if has_content {
        arguments.push(current);
    }
    arguments
}

#[cfg(test)]
mod tests {
    use super::*;
    #[cfg(windows)]
    use std::time::{Duration, Instant};

    #[test]
    fn splits_quoted_arguments() {
        assert_eq!(
            split_arguments(r#"  --test "two words" a"b c"d "" "#),
            ["--test", "two words", "ab cd", ""]
        );
        assert!(split_arguments("   ").is_empty());
    }

    #[cfg(windows)]
    fn shell(script: &str) -> ProcessTree {
        let program = Path::new(r"C:\Windows\System32\cmd.exe");
        ProcessTree::start(program, &["/c".to_owned(), script.to_owned()]).unwrap()
    }

    #[cfg(windows)]
    fn wait_until_stopped(tree: &mut ProcessTree, limit: Duration) -> Duration {
        let started = Instant::now();
        while tree.is_running() && started.elapsed() < limit {
            std::thread::sleep(Duration::from_millis(50));
        }
        started.elapsed()
    }

    #[cfg(windows)]
    #[test]
    fn keeps_running_until_the_last_child_exits() {
        let mut tree = shell("start /b ping -n 4 127.0.0.1 >nul");
        std::thread::sleep(Duration::from_millis(900));
        assert!(tree.is_running(), "the child outlives its parent");

        let waited = wait_until_stopped(&mut tree, Duration::from_secs(10));
        assert!(waited > Duration::from_millis(800) && waited < Duration::from_secs(8));
    }

    #[cfg(windows)]
    #[test]
    fn stopping_ends_children_whose_parent_is_gone() {
        let mut tree = shell("start /b ping -n 30 127.0.0.1 >nul");
        std::thread::sleep(Duration::from_millis(700));
        tree.stop();
        assert!(wait_until_stopped(&mut tree, Duration::from_secs(5)) < Duration::from_secs(4));
    }
}
