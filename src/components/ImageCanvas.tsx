import React, { useCallback, useEffect, useRef } from "react";

/**
 * Generic high-DPI aware canvas component that draws an ImageData using aspect-fit (contain) logic.
 * Optionally accepts an already decoded ImageData OR raw drawing params via a callback.
 *
 * Props:
 *  - image: ImageData | null -> when provided triggers drawing
 *  - className/style: styling
 *  - onInitCanvas?: (canvas: HTMLCanvasElement) => void  (for parent to keep a ref if needed)
 */
export interface ImageCanvasProps {
  image: ImageData | null;
  className?: string;
  style?: React.CSSProperties;
  onInitCanvas?: (canvas: HTMLCanvasElement) => void;
}

const ImageCanvas: React.FC<ImageCanvasProps> = ({
  image,
  className = "",
  style,
  onInitCanvas,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Core draw logic (aspect fit)
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

    let drawWidth: number, drawHeight: number, offsetX: number, offsetY: number;
    if (imgRatio > canvasRatio) {
      drawWidth = cssW;
      drawHeight = cssW / imgRatio;
      offsetX = 0;
      offsetY = (cssH - drawHeight) / 2;
    } else {
      drawHeight = cssH;
      drawWidth = cssH * imgRatio;
      offsetX = (cssW - drawWidth) / 2;
      offsetY = 0;
    }

    const srcCanvas = document.createElement("canvas");
    srcCanvas.width = image.width;
    srcCanvas.height = image.height;
    const srcCtx = srcCanvas.getContext("2d");
    if (!srcCtx) return;
    srcCtx.putImageData(image, 0, 0);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      srcCanvas,
      0,
      0,
      image.width,
      image.height,
      offsetX,
      offsetY,
      drawWidth,
      drawHeight
    );
  }, [image]);

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
  }, [image, draw]);

  useEffect(() => {
    if (canvasRef.current && onInitCanvas) onInitCanvas(canvasRef.current);
  }, [onInitCanvas]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", ...style }}
    />
  );
};

export default ImageCanvas;
