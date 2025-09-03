use tauri::menu::{Menu, MenuItem, Submenu};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .menu(|app| {
            let file_menu = Submenu::with_items(
                app,
                "File",
                true,
                &[&MenuItem::new(app, "Open", true, None::<&str>)?],
            )?;

            Menu::with_items(app, &[&file_menu])
        })
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
