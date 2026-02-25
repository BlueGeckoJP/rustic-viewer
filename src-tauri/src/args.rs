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
        let absolute_path = std::fs::canonicalize(&path)
            .unwrap_or_else(|_| {
                log::warn!(
                    "Failed to canonicalize path: {}, using original path instead",
                    path
                );
                std::path::PathBuf::from(path)
            })
            .to_string_lossy()
            .to_string();

        let state: tauri::State<StartupState> = app.state();
        state.enqueue_or_emit(app, &absolute_path);
    }
}
