use image::GenericImageView as _;

#[derive(serde::Serialize)]
pub struct DecodedImage {
    pub width: u32,
    pub height: u32,
    pub data: Vec<u8>,
}

#[tauri::command]
pub fn decode_image(path: &str) -> Result<DecodedImage, String> {
    let img = image::open(path).map_err(|e| format!("Failed to open image: {}", e))?;
    let (width, height) = img.dimensions();
    let data = img.to_rgba8().into_raw();
    Ok(DecodedImage {
        width,
        height,
        data,
    })
}
