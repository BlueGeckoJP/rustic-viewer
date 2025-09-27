use js_sys::{Reflect, SharedArrayBuffer, Uint8Array};
use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
pub fn start() {
    console_error_panic_hook::set_once();
}

/// Convert a image byte slice to a SharedArrayBuffer
#[wasm_bindgen]
pub fn decode_image_to_sab(bytes: &[u8]) -> Result<JsValue, JsValue> {
    // In fail case, It can catch the error in JS side
    let img = image::load_from_memory(bytes)
        .map_err(|e| JsValue::from_str(&format!("Failed to decode image: {:?}", e)))?;
    let rgba = img.to_rgba8();
    let (w, h) = rgba.dimensions();
    let pixels: Vec<u8> = rgba.into_raw();

    // Create SharedArrayBuffer and copy pixel data via Uint8Array
    let len = pixels.len() as u32;
    let sab = SharedArrayBuffer::new(len);

    // create a view and copy bytes into it
    let target_u8 = Uint8Array::new(&sab);
    let tmp = Uint8Array::from(&pixels[..]);
    target_u8.set(&tmp, 0);

    // Return an object with sab, width, height
    let obj = js_sys::Object::new();
    Reflect::set(&obj, &JsValue::from_str("buffer"), &JsValue::from(sab))
        .map_err(|e| JsValue::from_str(&format!("Failed to set buffer property: {:?}", e)))?;
    Reflect::set(&obj, &JsValue::from_str("width"), &JsValue::from(w))
        .map_err(|e| JsValue::from_str(&format!("Failed to set width property: {:?}", e)))?;
    Reflect::set(&obj, &JsValue::from_str("height"), &JsValue::from(h))
        .map_err(|e| JsValue::from_str(&format!("Failed to set height property: {:?}", e)))?;
    Ok(JsValue::from(obj))
}
