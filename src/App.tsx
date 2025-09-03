import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";
import init, { decode_image_to_image_data } from "../src-wasm/pkg/src_wasm";
import { convertFileSrc } from "@tauri-apps/api/core";
import { readFile } from "@tauri-apps/plugin-fs";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    init().then(() => {
      console.log("WASM module initialized");
    });
  }, []);

  // Add listener for "open-image" event from Tauri backend
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen("open-image", (event) => {
      console.log("Received event:", event.payload);
      const imagePath =
        typeof event.payload === "string"
          ? event.payload
          : String(event.payload);
      const filePath = convertFileSrc(imagePath);
      readFile(filePath).then((content) => {
        const img = decode_image_to_image_data(content);
        if (!img) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Calculate aspect ratio and resize canvas
        const canvasRatio = canvas.width / canvas.height;
        const imgRatio = img.width / img.height;
        let drawWidth, drawHeight, offsetX, offsetY;

        if (imgRatio > canvasRatio) {
          drawWidth = canvas.width;
          drawHeight = canvas.width / imgRatio;
          offsetX = 0;
          offsetY = (canvas.height - drawHeight) / 2;
        } else {
          drawHeight = canvas.height;
          drawWidth = canvas.height * imgRatio;
          offsetX = (canvas.width - drawWidth) / 2;
          offsetY = 0;
        }

        // Offscreen canvas to convert ImageData to CanvasImageSource
        const srcCanvas = document.createElement("canvas");
        srcCanvas.width = img.width;
        srcCanvas.height = img.height;
        const srcCtx = srcCanvas.getContext("2d");
        if (!srcCtx) return;
        srcCtx.putImageData(img, 0, 0);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
          srcCanvas,
          0,
          0,
          img.width,
          img.height,
          offsetX,
          offsetY,
          drawWidth,
          drawHeight
        );
      });
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  return (
    <div className="flex items-center justify-center h-screen">
      <canvas width={800} height={600} ref={canvasRef}></canvas>
    </div>
  );
}
