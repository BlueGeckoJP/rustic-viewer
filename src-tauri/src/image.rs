use std::io::Cursor;

use image::{ImageBuffer, Rgba};
use serde::Serialize;
use tauri::ipc::Channel;

#[derive(Serialize)]
pub struct ResizedImage {
    width: u32,
    height: u32,
    data: String,
}

#[tauri::command]
pub async fn lanczos_resize(
    channel: Channel<ResizedImage>,
    data: Vec<u8>,
    image_width: u32,
    image_height: u32,
    target_width: u32,
    target_height: u32,
) -> Result<(), String> {
    let buffer = ImageBuffer::<Rgba<u8>, Vec<u8>>::from_raw(image_width, image_height, data)
        .ok_or("Failed to create image buffer from raw data")?;

    let resized = image::imageops::resize(
        &buffer,
        target_width,
        target_height,
        image::imageops::FilterType::Lanczos3,
    );

    let base64_data = image_to_base64(&resized)?;

    let result = ResizedImage {
        width: target_width,
        height: target_height,
        data: base64_data,
    };

    channel
        .send(result)
        .map_err(|e| format!("Failed to send resized image: {}", e))?;

    Ok(())
}

fn image_to_base64(img: &ImageBuffer<Rgba<u8>, Vec<u8>>) -> Result<String, String> {
    let mut buffer = Cursor::new(Vec::new());
    img.write_to(&mut buffer, image::ImageFormat::Png)
        .map_err(|e| format!("Failed to write image: {}", e))?;
    let base64 =
        base64::Engine::encode(&base64::engine::general_purpose::STANDARD, buffer.get_ref());
    Ok(format!("data:image/png;base64,{}", base64))
}
