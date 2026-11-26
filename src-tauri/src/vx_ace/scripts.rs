use std::io::{self, Read, Write};
use std::ops::Range;

use flate2::{Compression, read::ZlibDecoder, write::ZlibEncoder};

use super::{MAX_SCRIPTS, VERSION, invalid};

const MARKER: &str = "# RMC VX Ace ";
const END_MARKER: &[u8] = b"# End RMC VX Ace payload\n";
const HOOK: &[u8] = b"    RMVC.update";
const PAYLOAD: &str = concat!(
    include_str!("01_cheat_windows.rb"),
    "\n",
    include_str!("02_rmvc.rb"),
    "\n",
    include_str!("03_cheat_hooks.rb"),
    "\n",
);

pub(super) enum Status {
    Clean,
    Managed(String),
    Standalone,
}

pub(super) fn status(data: &[u8]) -> io::Result<Status> {
    let (_, source) = scene_base(data)?;
    Ok(source_status(&source))
}

fn source_status(source: &[u8]) -> Status {
    for line in source.split(|byte| *byte == b'\n') {
        let line = line.trim_ascii();
        if let Some(version) = line.strip_prefix(MARKER.as_bytes()) {
            return Status::Managed(String::from_utf8_lossy(version).into_owned());
        }
        if line == b"module RMVC" {
            return Status::Standalone;
        }
    }
    Status::Clean
}

pub(super) fn patch(data: &[u8]) -> io::Result<Vec<u8>> {
    let (code, source) = scene_base(data)?;
    if !matches!(source_status(&source), Status::Clean) {
        return Err(invalid(
            "The original VX Ace scripts already contain cheats",
        ));
    }
    let mut start = if source.starts_with(b"\xef\xbb\xbf") {
        3
    } else {
        0
    };
    for line in source[start..].split_inclusive(|byte| *byte == b'\n') {
        if !line.trim_ascii_start().starts_with(b"#") {
            break;
        }
        start += line.len();
    }

    let end = after_update(&source)?;
    let newline: &[u8] = if source[..end].ends_with(b"\r\n") {
        b"\r\n"
    } else {
        b"\n"
    };
    let banner = format!("{MARKER}{VERSION}\n");
    let patched = [
        &source[..start],
        banner.as_bytes(),
        PAYLOAD.as_bytes(),
        END_MARKER,
        &source[start..end],
        HOOK,
        newline,
        &source[end..],
    ]
    .concat();
    let mut encoder = ZlibEncoder::new(Vec::new(), Compression::default());
    encoder.write_all(&patched)?;
    let compressed = encoder.finish()?;
    let length = encode_length(compressed.len());
    Ok([&data[..code.start], &length, &compressed, &data[code.end..]].concat())
}

pub(super) fn is_patch_of(installed: &[u8], original: &[u8]) -> io::Result<bool> {
    let (patched_code, patched) = scene_base(installed)?;
    let (original_code, source) = scene_base(original)?;
    if installed[..patched_code.start] != original[..original_code.start]
        || installed[patched_code.end..] != original[original_code.end..]
    {
        return Ok(false);
    }
    let Some(start) = find(&patched, MARKER.as_bytes()) else {
        return Ok(false);
    };
    let Some(end) = find(&patched[start..], END_MARKER) else {
        return Ok(false);
    };
    let end = start + end + END_MARKER.len();
    let hook = end + after_update(&patched[end..])?;
    let Some(rest) = patched[hook..].strip_prefix(HOOK) else {
        return Ok(false);
    };
    let Some(rest) = rest
        .strip_prefix(b"\r\n")
        .or_else(|| rest.strip_prefix(b"\n"))
    else {
        return Ok(false);
    };
    Ok([&patched[..start], &patched[end..hook], rest]
        .into_iter()
        .flatten()
        .eq(&source))
}

fn find(bytes: &[u8], marker: &[u8]) -> Option<usize> {
    bytes
        .windows(marker.len())
        .position(|window| window == marker)
}

fn after_update(source: &[u8]) -> io::Result<usize> {
    let mut end = 0;
    for line in source.split_inclusive(|byte| *byte == b'\n') {
        end += line.len();
        if line.trim_ascii() == b"def update" && line.ends_with(b"\n") {
            return Ok(end);
        }
    }
    Err(invalid("The Scene_Base script has no def update hook"))
}

fn scene_base(data: &[u8]) -> io::Result<(Range<usize>, Vec<u8>)> {
    let mut reader = Marshal { data, pos: 0 };
    if reader.take(2)? != [4, 8] {
        return Err(invalid("Expected a Ruby Marshal 4.8 script file"));
    }
    let count = reader.array()?;
    for _ in 0..count {
        let fields = reader.array()?;
        if fields < 3 {
            return Err(invalid("Invalid VX Ace script record"));
        }
        reader.skip(0)?;
        let name = reader.string()?;
        let code = reader.string()?;
        if name.is_some_and(|(name, _)| name == b"Scene_Base") {
            let (compressed, span) =
                code.ok_or_else(|| invalid("Scene_Base uses a shared script string"))?;
            let mut source = Vec::new();
            ZlibDecoder::new(compressed)
                .take(MAX_SCRIPTS as u64 + 1)
                .read_to_end(&mut source)?;
            if source.len() > MAX_SCRIPTS {
                return Err(invalid("Scene_Base is too large"));
            }
            return Ok((span, source));
        }
        for _ in 3..fields {
            reader.skip(0)?;
        }
    }
    Err(invalid("Scene_Base was not found in the VX Ace scripts"))
}

struct Marshal<'a> {
    data: &'a [u8],
    pos: usize,
}

impl<'a> Marshal<'a> {
    fn take(&mut self, size: usize) -> io::Result<&'a [u8]> {
        let tail = &self.data[self.pos..];
        let bytes = tail
            .get(..size)
            .ok_or_else(|| invalid("Truncated VX Ace script record"))?;
        self.pos += size;
        Ok(bytes)
    }

    fn byte(&mut self) -> io::Result<u8> {
        Ok(self.take(1)?[0])
    }

    fn integer(&mut self) -> io::Result<i64> {
        let lead = self.byte()? as i8;
        match lead {
            0 => Ok(0),
            -4..=4 => {
                let mut bytes = [if lead < 0 { 255 } else { 0 }; 8];
                let size = lead.unsigned_abs() as usize;
                bytes[..size].copy_from_slice(self.take(size)?);
                Ok(i64::from_le_bytes(bytes))
            }
            5.. => Ok(i64::from(lead) - 5),
            _ => Ok(i64::from(lead) + 5),
        }
    }

    fn length(&mut self) -> io::Result<usize> {
        usize::try_from(self.integer()?).map_err(|_| invalid("Invalid VX Ace script record length"))
    }

    fn array(&mut self) -> io::Result<usize> {
        if self.byte()? != b'[' {
            return Err(invalid("Expected a VX Ace script array"));
        }
        self.length()
    }

    fn string(&mut self) -> io::Result<Option<ScriptString<'a>>> {
        let wrapped = self.data.get(self.pos) == Some(&b'I');
        if wrapped {
            self.byte()?;
        }
        let string = match self.byte()? {
            b'"' => {
                let start = self.pos;
                let size = self.length()?;
                let value = self.take(size)?;
                Some((value, start..self.pos))
            }
            b'@' => {
                self.length()?;
                None
            }
            b'0' => None,
            _ => return Err(invalid("Expected a VX Ace script string")),
        };
        if wrapped {
            self.variables(0)?;
        }
        Ok(string)
    }

    fn variables(&mut self, depth: u8) -> io::Result<()> {
        for _ in 0..self.length()? {
            self.skip(depth)?;
            self.skip(depth)?;
        }
        Ok(())
    }

    fn skip(&mut self, depth: u8) -> io::Result<()> {
        if depth == 8 {
            return Err(invalid("VX Ace script metadata is nested too deeply"));
        }
        match self.byte()? {
            b'0' | b'T' | b'F' => {}
            b'i' | b';' | b'@' => {
                self.integer()?;
            }
            b'"' | b':' => {
                let length = self.length()?;
                self.take(length)?;
            }
            b'I' => {
                self.skip(depth + 1)?;
                self.variables(depth + 1)?;
            }
            _ => return Err(invalid("Unsupported VX Ace script metadata")),
        }
        Ok(())
    }
}

type ScriptString<'a> = (&'a [u8], Range<usize>);

fn encode_length(length: usize) -> Vec<u8> {
    if length == 0 {
        return vec![0];
    }
    if length <= 122 {
        return vec![length as u8 + 5];
    }
    let bytes = length.to_le_bytes();
    let size = ((usize::BITS - length.leading_zeros()).div_ceil(8)) as usize;
    [&[size as u8], &bytes[..size]].concat()
}

#[cfg(test)]
pub(super) fn fixture(source: &[u8]) -> Vec<u8> {
    let mut encoder = ZlibEncoder::new(Vec::new(), Compression::default());
    encoder.write_all(source).unwrap();
    let code = encoder.finish().unwrap();
    [
        &b"\x04\x08[\x07[\x08i\x06I\"\x00\x06:\x06ET\"\x00[\x08i\x07I\"\x0fScene_Base\x06;\x00TI\""
            [..],
        &encode_length(code.len()),
        &code,
        b"\x06;\x00F",
    ]
    .concat()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn inserts_one_hook_and_preserves_the_marshal_wrappers_and_source_encoding() {
        let original = fixture(b"\xef\xbb\xbf# coding: UTF-8\r\nclass Scene_Base\r\n  def update\r\n    run\r\n  end\r\nend");
        let patched = patch(&original).unwrap();
        let (old_span, _) = scene_base(&original).unwrap();
        let (new_span, new_source) = scene_base(&patched).unwrap();
        assert_eq!(original[..old_span.start], patched[..new_span.start]);
        assert_eq!(original[old_span.end..], patched[new_span.end..]);
        assert!(new_source.starts_with(b"\xef\xbb\xbf# coding: UTF-8\r\n# RMC VX Ace "));
        assert!(
            new_source.ends_with(b"  def update\r\n    RMVC.update\r\n    run\r\n  end\r\nend")
        );
        assert!(patch(&patched).is_err());
    }
}
