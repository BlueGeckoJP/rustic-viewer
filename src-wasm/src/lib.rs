use wasm_bindgen::prelude::*;
use wasm_bindgen::Clamped;
use web_sys::ImageData;

#[wasm_bindgen(start)]
pub fn start() {
    console_error_panic_hook::set_once();
}

/// Convert a image byte slice to ImageData of RGBA format
#[wasm_bindgen]
pub fn decode_image_to_image_data(bytes: &[u8]) -> Result<ImageData, JsValue> {
    // In fail case, It can catch the error in JS side
    let img = image::load_from_memory(bytes).map_err(|e| JsValue::from_str(&e.to_string()))?;
    let rgba = img.to_rgba8();
    let (w, h) = rgba.dimensions();

    // Return ImageData(width, height) to JS side
    ImageData::new_with_u8_clamped_array_and_sh(Clamped(&rgba.into_raw()), w, h)
}
