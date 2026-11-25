#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    if let Err(error) = rmc_toolkit_lib::run() {
        eprintln!("RMC Toolkit could not start: {error}");
        std::process::exit(1);
    }
}
