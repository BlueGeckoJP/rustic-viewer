use std::{fs, path::Path};

use tauri::menu::{Menu, MenuItem, Submenu};
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
fn open_image(path: &str) {
    let p = fs::canonicalize(path).unwrap_or_default();

    // Validate the path
    if path.is_empty() {
        println!("No image path provided");
        return;
    } else if !p.exists() {
        println!("Image path does not exist: {path}");
        return;
    } else if !p.is_file() {
        println!("Path is not a file: {path}");
        return;
    }

    println!("Open image at path: {path}");
    // Implement image opening logic here
}

fn open_image_from_any_path<T: AsRef<Path>>(path: Option<T>) {
    let path_str = path
        .as_ref()
        .map(|p| p.as_ref().to_string_lossy())
        .unwrap_or_default();
    open_image(&path_str);
}

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
                            open_image_from_any_path(path.as_path());
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
        .invoke_handler(tauri::generate_handler![open_image])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
