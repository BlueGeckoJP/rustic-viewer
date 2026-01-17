use std::io::Cursor;

use image::{ImageBuffer, ImageReader, Rgba};
use serde::Serialize;
use tauri::ipc::Channel;
use tokio::task::JoinHandle;

#[derive(Serialize)]
pub struct ResizedImage {
    width: u32,
    height: u32,
    data: String,
}

#[tauri::command]
pub async fn lanczos_resize(
    channel: Channel<ResizedImage>,
    path: &str,
    target_width: u32,
    target_height: u32,
) -> Result<(), String> {
    let path = path.to_owned();

    let handle: JoinHandle<Result<ResizedImage, String>> = tokio::task::spawn_blocking(move || {
        let img = ImageReader::open(path)
            .map_err(|e| format!("Failed to open image: {}", e))?
            .decode()
            .map_err(|e| format!("Failed to decode image: {}", e))?;

        let resized = image::imageops::resize(
            &img,
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

        Ok(result)
    });

    let base64_data = handle.await.map_err(|e| format!("Task failed: {}", e))??;

    channel
        .send(base64_data)
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
