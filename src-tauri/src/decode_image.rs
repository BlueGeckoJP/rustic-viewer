use std::sync::Arc;

use image::GenericImageView as _;
use tauri::State;

use crate::{AppState, CachedImageData};

#[derive(serde::Serialize)]
pub struct DecodedImage {
    pub width: u32,
    pub height: u32,
    pub data: Vec<u8>,
}

#[tauri::command]
pub fn decode_image(state: State<AppState>, path: &str) -> Result<DecodedImage, String> {
    if let Some(img) = state.image_cache.lock().unwrap().get(path) {
        return Ok(DecodedImage {
            width: img.width,
            height: img.height,
            data: img.data.as_ref().clone(),
        });
    }

    let img = image::open(path).map_err(|e| format!("Failed to open image: {}", e))?;

    let (width, height) = img.dimensions();
    let data = img.to_rgba8().into_raw();

    // Cache the image
    if let Ok(mut cache) = state.image_cache.lock() {
        cache.put(
            path.to_string(),
            CachedImageData {
                width,
                height,
                data: Arc::new(data.clone()),
            },
        );
    }

    Ok(DecodedImage {
        width,
        height,
        data,
    })
}
