use std::fs::File;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{Ipv4Addr, SocketAddr, TcpStream};
use std::path::Path;
use std::time::Duration;

use serde::Deserialize;
use serde_json::{Value, json};

pub const ENDPOINT_FILE: &str = "rmc-live-v1.json";
const TIMEOUT: Duration = Duration::from_millis(500);
const MAX_REQUEST_BYTES: usize = 2048;
const MAX_REPLY_BYTES: u64 = 128 * 1024;

#[derive(Deserialize)]
struct Endpoint {
    port: u16,
    token: String,
}

pub fn request(
    folder: &Path,
    session: Option<&str>,
    action: Option<&Value>,
    query: Option<&Value>,
) -> Option<Value> {
    let endpoint = File::open(folder.join(ENDPOINT_FILE)).ok()?;
    let Endpoint { port, token } = serde_json::from_reader(endpoint.take(512)).ok()?;
    if token.len() != 64 || !token.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return None;
    }

    let address = SocketAddr::from((Ipv4Addr::LOCALHOST, port));
    let mut stream = TcpStream::connect_timeout(&address, TIMEOUT).ok()?;
    stream.set_read_timeout(Some(TIMEOUT)).ok()?;
    stream.set_write_timeout(Some(TIMEOUT)).ok()?;

    let mut request = serde_json::to_vec(
        &json!({ "token": token, "session": session, "action": action, "query": query }),
    )
    .ok()?;
    request.push(b'\n');
    if request.len() > MAX_REQUEST_BYTES {
        return None;
    }
    stream.write_all(&request).ok()?;

    let mut reply = Vec::new();
    BufReader::new(stream)
        .take(MAX_REPLY_BYTES)
        .read_until(b'\n', &mut reply)
        .ok()?;
    if reply.last() != Some(&b'\n') {
        return None;
    }
    serde_json::from_slice(&reply).ok()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::testing::TempFolder;
    use std::net::TcpListener;

    #[test]
    fn sends_the_discovered_token_and_returns_the_games_acknowledgement() {
        let temp = TempFolder::new();
        assert!(request(temp.path(), None, None, None).is_none());

        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
        let port = listener.local_addr().unwrap().port();
        let token = "a".repeat(64);
        temp.write(
            ENDPOINT_FILE,
            json!({ "port": port, "token": token })
                .to_string()
                .as_bytes(),
        );
        let server = std::thread::spawn(move || {
            let (mut stream, _) = listener.accept().unwrap();
            let mut line = String::new();
            BufReader::new(&stream).read_line(&mut line).unwrap();
            let request: Value = serde_json::from_str(&line).unwrap();
            assert_eq!(request["token"], token);
            assert_eq!(request["session"], "game");
            assert_eq!(request["action"], json!({ "kind": "gold", "value": 500 }));
            assert_eq!(request["query"], json!({ "view": "items", "page": 1 }));
            stream.write_all(b"{\"status\":\"live\"}\n").unwrap();
        });

        let action = json!({ "kind": "gold", "value": 500 });
        let query = json!({ "view": "items", "page": 1 });
        let reply = request(temp.path(), Some("game"), Some(&action), Some(&query));
        assert_eq!(reply, Some(json!({ "status": "live" })));
        server.join().unwrap();
    }
}
