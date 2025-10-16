import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef, useState } from "react";
import type { DecodedImage } from "../types";
import ImageCanvas from "./ImageCanvas";

export type SlotCanvasProps = { rawPath: string };

// Shared worker now encapsulated by decodeImageFromPath utility
const SlotCanvas: React.FC<SlotCanvasProps> = ({ rawPath }) => {
  const [imgData, setImgData] = useState<ImageBitmap | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let alive = true;
    invoke("decode_image", { path: rawPath })
      .catch((e) => {
        console.error("Failed to decode image:", e);
        if (alive) setImgData(null);
      })
      .then(async (payload) => {
        if (!payload) return;
        const decodedImage = payload as DecodedImage;
        const imageData = new ImageData(
          new Uint8ClampedArray(decodedImage.data),
          decodedImage.width,
          decodedImage.height,
        );
        const img = await createImageBitmap(imageData);
        if (alive) setImgData(img ?? null);
      });
    return () => {
      alive = false;
    };
  }, [rawPath]);

  return (
    // NOTE: I left a 1rem gap with max-h because, without it, when the height is reduced even slightly,
    // the canvas rendering can’t keep up with the resize.
    // (Using max-h-[calc(100vh-2rem)] makes the size fit perfectly.)
    <div className="max-w-[calc(100vw-2rem)] max-h-[calc(100vh-3rem)] w-full h-full block">
      <ImageCanvas
        image={imgData}
        className="w-full h-full max-w-full max-h-full block"
        onInitCanvas={(c) => {
          canvasRef.current = c;
        }}
      />
    </div>
  );
};

export default SlotCanvas;
