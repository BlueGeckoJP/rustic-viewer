import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import init, { decode_image_to_image_data } from "../src-wasm/pkg/src_wasm";
import { convertFileSrc } from "@tauri-apps/api/core";
import { readFile, readDir } from "@tauri-apps/plugin-fs";

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [currentImage, setCurrentImage] = useState<ImageData | null>(null);
  const [imageList, setImageList] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  // Initialize the WASM module
  useEffect(() => {
    init().then(() => {
      console.log("WASM module initialized");
    });
  }, []);

  // Draw the current image on the canvas
  const drawCurrentImage = useCallback(() => {
    const img = currentImage;
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
    console.log("Image drawn on canvas");
  }, [currentImage]);

  // Helper to load and decode an image by raw file path
  const loadImageByPath = useCallback((rawPath: string) => {
    const fileUrl = convertFileSrc(rawPath);
    readFile(fileUrl).then((content) => {
      const img = decode_image_to_image_data(content);
      if (!img) return;
      setCurrentImage(img);
    });
  }, []);

  // Sync canvas size with its displayed size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;

      // Get the size the canvas is being displayed
      const rect = canvas.getBoundingClientRect();
      const displayWidth = rect.width;
      const displayHeight = rect.height;

      // If the canvas size already matches, do nothing
      const wantedWidth = Math.round(displayWidth * dpr);
      const wantedHeight = Math.round(displayHeight * dpr);
      if (canvas.width !== wantedWidth || canvas.height !== wantedHeight) {
        canvas.width = wantedWidth;
        canvas.height = wantedHeight;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Scaling to make logical coordinates relative to CSS pixels
          ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset any existing transforms
          ctx.scale(dpr, dpr);
        }

        drawCurrentImage();
      }
    };

    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [drawCurrentImage]);

  // Redraw the image whenever it changes
  useEffect(() => {
    drawCurrentImage();
  }, [currentImage, drawCurrentImage]);

  // Add listener for "open-image" event from Tauri backend
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen("open-image", (event) => {
      console.log("Received event:", event.payload);
      const rawPath =
        typeof event.payload === "string"
          ? event.payload
          : String(event.payload);
      // List all images in the same directory
      const dir = rawPath.substring(0, rawPath.lastIndexOf("/"));
      readDir(dir).then((entries) => {
        const files = entries
          .filter(
            (e) => e.isFile && e.name.match(/\.(png|jpg|jpeg|gif|bmp|webp)$/i)
          )
          .map((e) => `${dir}/${e.name}`)
          .sort();
        setImageList(files);
        const idx = files.findIndex((p) => p === rawPath);
        setCurrentIndex(idx >= 0 ? idx : 0);
      });
      // Load and display the selected image
      loadImageByPath(rawPath);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      if (unlisten) unlisten();
    };
  }, [loadImageByPath]);

  // Key navigation: left/right arrows to switch images
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (imageList.length === 0) return;
      if (e.key === "ArrowRight") {
        const next = (currentIndex + 1) % imageList.length;
        setCurrentIndex(next);
        loadImageByPath(imageList[next]);
      } else if (e.key === "ArrowLeft") {
        const prev = (currentIndex - 1 + imageList.length) % imageList.length;
        setCurrentIndex(prev);
        loadImageByPath(imageList[prev]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [imageList, currentIndex, loadImageByPath]);

  return (
    <div className="flex items-center justify-center h-screen">
      <canvas className="w-screen h-screen" ref={canvasRef}></canvas>
    </div>
  );
}
