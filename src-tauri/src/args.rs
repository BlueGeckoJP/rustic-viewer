use clap::Parser;
use tauri::{AppHandle, Manager};
use tauri_plugin_log::log;

use crate::startup_state::StartupState;

#[derive(Parser, Debug, Default)]
pub struct Args {
    #[arg(short, long)]
    pub open: Option<String>,
}

pub fn handle_args(app: &AppHandle, parsed: Args, source: &str) {
    log::debug!("Handling args from {}: {:?}", source, parsed);
    if let Some(path) = parsed.open {
        let state: tauri::State<StartupState> = app.state();
        state.enqueue_or_emit(app, &path);
    }
}
