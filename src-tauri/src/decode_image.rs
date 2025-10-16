use image::GenericImageView as _;
use tauri::State;

use crate::AppState;

#[derive(serde::Serialize)]
pub struct DecodedImage {
    pub width: u32,
    pub height: u32,
    pub data: Vec<u8>,
}

#[tauri::command]
pub fn decode_image(state: State<AppState>, path: &str) -> Result<DecodedImage, String> {
    if let Some(img) = state.image_cache.lock().unwrap().get(path) {
        let (width, height) = img.dimensions();
        let data = img.to_rgba8().into_raw();

        return Ok(DecodedImage {
            width,
            height,
            data,
        });
    }

    let img = image::open(path).map_err(|e| format!("Failed to open image: {}", e))?;

    // Cache the image
    if let Ok(mut cache) = state.image_cache.lock() {
        cache.put(path.to_string(), img.clone());
    }

    let (width, height) = img.dimensions();
    let data = img.to_rgba8().into_raw();
    Ok(DecodedImage {
        width,
        height,
        data,
    })
}
