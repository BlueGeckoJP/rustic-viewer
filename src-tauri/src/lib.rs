use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    Emitter,
};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_log::log;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
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
