use std::sync::{
    atomic::{AtomicBool, Ordering},
    Mutex,
};

use tauri::{AppHandle, Emitter};
use tauri_plugin_log::log;

#[derive(Default)]
pub struct StartupState {
    pub ready: AtomicBool,
    pub pending: Mutex<Vec<String>>,
}

impl StartupState {
    pub fn enqueue_or_emit(&self, app: &AppHandle, path: &str) {
        if self.ready.load(Ordering::SeqCst) {
            if let Err(e) = app.emit("open-image", path) {
                log::error!("Failed to emit open-image event: {}", e);
            }
        } else {
            self.pending.lock().unwrap().push(path.to_string());
        }
    }

    pub fn mark_ready_and_flush(&self, app: &AppHandle) {
        // If already marked ready, do nothing
        if !self.ready.swap(true, Ordering::SeqCst) {
            let mut vec = self.pending.lock().unwrap();
            log::debug!("Flushing {:?} pending paths", vec);
            for p in vec.drain(..) {
                if let Err(e) = app.emit("open-image", &p) {
                    log::error!("Failed to emit open-image event: {}", e);
                }
            }
        }
    }
}
