use std::fs::File;
use std::io::{self, BufReader, Read, Seek, SeekFrom, Write};

use super::{MAX_SCRIPTS, invalid};

pub(super) struct Entry {
    table_position: u64,
    offset: u32,
    size: u32,
    key: u32,
    table_key: u32,
}

impl Entry {
    pub(super) fn read(&self, file: &mut File) -> io::Result<Vec<u8>> {
        let mut data = vec![0; self.size as usize];
        file.seek(SeekFrom::Start(self.offset.into()))?;
        file.read_exact(&mut data)?;
        crypt(&mut data, self.key);
        Ok(data)
    }
}

pub(super) fn find(file: &mut File, script: &str) -> io::Result<Entry> {
    let archive_size = file.metadata()?.len();
    let mut reader = BufReader::new(file);
    let mut magic = [0; 8];
    reader.read_exact(&mut magic)?;
    if &magic != b"RGSSAD\0\x03" {
        return Err(invalid("Expected a VX Ace RGSS3 archive"));
    }

    let table_key = word(&mut reader)?.wrapping_mul(9).wrapping_add(3);
    let mut table_position = 12;
    let mut data_start = archive_size;
    let mut scripts = None;
    loop {
        if table_position + 4 > data_start {
            return Err(invalid("Invalid VX Ace archive table"));
        }
        let offset = word(&mut reader)? ^ table_key;
        if offset == 0 {
            break;
        }
        let size = word(&mut reader)? ^ table_key;
        let key = word(&mut reader)? ^ table_key;
        let name_size = word(&mut reader)? ^ table_key;
        data_start = data_start.min(u64::from(offset));
        let next = table_position + 16 + u64::from(name_size);
        if name_size > 4096
            || next > data_start
            || u64::from(offset) + u64::from(size) > archive_size
        {
            return Err(invalid("Invalid VX Ace archive entry"));
        }
        let mut name = vec![0; name_size as usize];
        reader.read_exact(&mut name)?;
        for (byte, key_byte) in name
            .iter_mut()
            .zip(table_key.to_le_bytes().into_iter().cycle())
        {
            *byte ^= key_byte;
            if *byte == b'\\' {
                *byte = b'/';
            }
        }
        if name.eq_ignore_ascii_case(script.as_bytes()) {
            if scripts.is_some() || size as usize > MAX_SCRIPTS {
                return Err(invalid("Invalid VX Ace script entry"));
            }
            scripts = Some(Entry {
                table_position,
                offset,
                size,
                key,
                table_key,
            });
        }
        table_position = next;
    }
    scripts.ok_or_else(|| invalid("The VX Ace archive does not contain the scripts from Game.ini"))
}

pub(super) fn replace(
    original: &mut File,
    output: &mut File,
    script: &str,
    data: &[u8],
) -> io::Result<()> {
    let entry = find(original, script)?;
    let length = original.metadata()?.len();
    let offset =
        u32::try_from(length).map_err(|_| invalid("The VX Ace archive is too large to patch"))?;
    let size = u32::try_from(data.len())
        .map_err(|_| invalid("The VX Ace script is too large to patch"))?;
    if offset.checked_add(size).is_none() {
        return Err(invalid("The patched VX Ace archive would be too large"));
    }
    let mut encrypted = data.to_vec();
    crypt(&mut encrypted, entry.key);

    // Leave every existing asset in place and redirect only the scripts entry.
    original.rewind()?;
    io::copy(original, output)?;
    output.write_all(&encrypted)?;
    output.seek(SeekFrom::Start(entry.table_position))?;
    output.write_all(&(offset ^ entry.table_key).to_le_bytes())?;
    output.write_all(&(size ^ entry.table_key).to_le_bytes())?;
    Ok(())
}

pub(super) fn is_patch_of(
    installed: &mut File,
    original: &mut File,
    script: &str,
) -> io::Result<bool> {
    let patched = find(installed, script)?;
    let base = find(original, script)?;
    let length = original.metadata()?.len();
    let script_header = base.table_position;
    if patched.table_position != script_header
        || u64::from(patched.offset) != length
        || installed.metadata()?.len() != length + u64::from(patched.size)
    {
        return Ok(false);
    }
    for (start, end) in [(0, script_header), (script_header + 8, length)] {
        installed.seek(SeekFrom::Start(start))?;
        original.seek(SeekFrom::Start(start))?;
        let mut left = [0; 16 * 1024];
        let mut right = [0; 16 * 1024];
        let mut remaining = end - start;
        while remaining > 0 {
            let len = remaining.min(left.len() as u64) as usize;
            installed.read_exact(&mut left[..len])?;
            original.read_exact(&mut right[..len])?;
            if left[..len] != right[..len] {
                return Ok(false);
            }
            remaining -= len as u64;
        }
    }
    Ok(true)
}

fn word(reader: &mut impl Read) -> io::Result<u32> {
    let mut bytes = [0; 4];
    reader.read_exact(&mut bytes)?;
    Ok(u32::from_le_bytes(bytes))
}

fn crypt(data: &mut [u8], mut key: u32) {
    for chunk in data.chunks_mut(4) {
        for (byte, key_byte) in chunk.iter_mut().zip(key.to_le_bytes()) {
            *byte ^= key_byte;
        }
        key = key.wrapping_mul(7).wrapping_add(3);
    }
}

#[cfg(test)]
pub(super) fn fixture(scripts: &[u8]) -> Vec<u8> {
    let entries = [
        ("Data\\Scripts.rvdata2", scripts),
        ("Graphics\\asset.bin", &b"unchanged asset"[..]),
    ];
    let seed = 123u32;
    let table_key = seed * 9 + 3;
    let mut header = [b"RGSSAD\0\x03".as_slice(), &seed.to_le_bytes()].concat();
    let mut output = Vec::new();
    let data_start = header.len()
        + entries
            .iter()
            .map(|(name, _)| 16 + name.len())
            .sum::<usize>()
        + 16;
    for (name, data) in entries {
        let file_key = 0x12345678;
        let offset = (data_start + output.len()) as u32;
        for value in [offset, data.len() as u32, file_key, name.len() as u32] {
            header.extend_from_slice(&(value ^ table_key).to_le_bytes());
        }
        header.extend(
            name.bytes()
                .zip(table_key.to_le_bytes().into_iter().cycle())
                .map(|(left, right)| left ^ right),
        );
        let mut payload = data.to_vec();
        crypt(&mut payload, file_key);
        output.extend(payload);
    }
    header.extend_from_slice(&table_key.to_le_bytes().repeat(4));
    header.extend(output);
    header
}
