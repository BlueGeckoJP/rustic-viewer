mod args;
mod startup_state;

use clap::Parser;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    Emitter, Listener, Manager,
};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_log::log;

use crate::{
    args::{handle_args, Args},
    startup_state::StartupState,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            let parsed = Args::try_parse_from(args).unwrap_or_else(|e| {
                log::error!("Failed to parse args: {}", e);
                app.exit(1);
                // This will never be reached, but we need to return something
                Args::default()
            });

            handle_args(app, parsed, "subsequent");
        }))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let app_handle = app.handle();
            app.manage(StartupState::default());

            let inner_handle = app_handle.clone();
            app_handle.listen("frontend-ready", move |_| {
                log::info!("Frontend is ready");
                let state = inner_handle.state::<StartupState>();
                state.mark_ready_and_flush(&inner_handle);
            });

            match Args::try_parse() {
                Ok(parsed) => {
                    handle_args(app.handle(), parsed, "initial");
                }
                Err(e) => {
                    log::error!("Failed to parse CLI args: {}", e);
                    // Don't exit the app, just continue without CLI args
                }
            }

            Ok(())
        })
        .menu(|app| {
            let new_item = MenuItem::with_id(app, "new", "New", true, Some("Ctrl+N"))?;
            let open_item = MenuItem::with_id(app, "open", "Open", true, Some("Ctrl+O"))?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, Some("Ctrl+Q"))?;

            let file_menu = Submenu::with_items(
                app,
                "File",
                true,
                &[
                    &new_item,
                    &open_item,
                    &PredefinedMenuItem::separator(app)?,
                    &quit_item,
                ],
            )?;

            Menu::with_items(app, &[&file_menu])
        })
        .on_menu_event(|app, event| {
            log::debug!("Received the event: {}", event.id().as_ref());
            match event.id().as_ref() {
                "new" => {
                    app.emit("new-tab", ()).unwrap();
                }
                "open" => {
                    let inner_app = app.clone();
                    app.dialog().file().pick_file(move |path| {
                        if let Some(path) = path {
                            inner_app.emit("open-image", path.to_string()).unwrap();
                        }
                    });
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
