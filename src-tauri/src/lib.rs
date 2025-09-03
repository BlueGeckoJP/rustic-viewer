use tauri::menu::{Menu, MenuItem, Submenu};
use tauri_plugin_dialog::DialogExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .menu(|app| {
            let open_item = MenuItem::with_id(app, "open", "Open", true, Some("Ctrl+O"))?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, Some("Ctrl+Q"))?;

            let file_menu = Submenu::with_items(app, "File", true, &[&open_item, &quit_item])?;

            Menu::with_items(app, &[&file_menu])
        })
        .on_menu_event(|app, event| {
            println!("Menu event: {:?}", event.id());
            match event.id().as_ref() {
                "open" => {
                    app.dialog().file().pick_file(|path| {
                        if let Some(path) = path {
                            // TODO: Handle the selected file path
                            println!("Selected file: {path:?}");
                        } else {
                            println!("No file selected");
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
