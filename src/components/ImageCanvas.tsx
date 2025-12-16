import type React from "react";
import { useCallback, useEffect, useRef } from "react";

/**
 * Generic high-DPI aware canvas component that draws an ImageBitmap using aspect-fit (contain) logic.
 * Optionally accepts an already decoded ImageBitmap OR raw drawing params via a callback.
 *
 * Props:
 *  - image: ImageBitmap | null -> when provided triggers drawing
 *  - className/style: styling
 *  - zoom?: number (1.0 = 100%, 2.0 = 200%, etc.)
 *  - panOffset?: { x: number, y: number } (pan offset in CSS pixels)
 */
export interface ImageCanvasProps {
  image: ImageBitmap | null;
  className: string;
  zoom: number;
  panOffset: { x: number; y: number };
}

const ImageCanvas: React.FC<ImageCanvasProps> = ({
  image,
  className,
  zoom = 1.0,
  panOffset = { x: 0, y: 0 },
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Core draw logic (aspect fit with zoom and pan)
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!image) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // CSS pixel size for layout
    const rect = canvas.getBoundingClientRect();
    const cssW = rect.width;
    const cssH = rect.height;

    const imgRatio = image.width / image.height;
    const canvasRatio = cssW / cssH;

    // Calculate base size (fit to canvas)
    let baseWidth: number, baseHeight: number;
    if (imgRatio > canvasRatio) {
      baseWidth = cssW;
      baseHeight = cssW / imgRatio;
    } else {
      baseHeight = cssH;
      baseWidth = cssH * imgRatio;
    }

    // Apply zoom
    const drawWidth = baseWidth * zoom;
    const drawHeight = baseHeight * zoom;

    // Calculate center point for zoom
    const centerX = cssW / 2;
    const centerY = cssH / 2;

    // Apply pan offset (with zoom consideration)
    const offsetX = centerX - drawWidth / 2 + panOffset.x;
    const offsetY = centerY - drawHeight / 2 + panOffset.y;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      image,
      0,
      0,
      image.width,
      image.height,
      offsetX,
      offsetY,
      drawWidth,
      drawHeight,
    );
  }, [image, zoom, panOffset]);

  // Resize observer for DPR changes or container size changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const wantedWidth = Math.round(rect.width * dpr);
      const wantedHeight = Math.round(rect.height * dpr);
      if (canvas.width !== wantedWidth || canvas.height !== wantedHeight) {
        canvas.width = wantedWidth;
        canvas.height = wantedHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(dpr, dpr);
        }
      }
      draw();
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [draw]);

  // Redraw when image changes
  useEffect(() => {
    draw();
  }, [draw]);

  return <canvas ref={canvasRef} className={className} />;
};

export default ImageCanvas;
