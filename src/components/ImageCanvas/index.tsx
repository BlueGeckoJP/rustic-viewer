import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import type { ImageRenderer, RendererType } from "./renderers";
import createRenderer from "./renderers";

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
  rendererType?: RendererType;
}

const ImageCanvas: React.FC<ImageCanvasProps> = ({
  image,
  className,
  zoom = 1.0,
  panOffset = { x: 0, y: 0 },
  rendererType = "2d",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<ImageRenderer | null>(null);

  // Initialize renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = createRenderer(rendererType);
    renderer.initialize(canvas);
    rendererRef.current = renderer;

    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [rendererType]);

  // Core draw logic (aspect fit with zoom and pan)
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !renderer) return;

    if (!image) {
      renderer.clear();
      return;
    }

    renderer.draw(image, zoom, panOffset);
  }, [image, zoom, panOffset]);

  // Resize observer for DPR changes or container size changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = rendererRef.current;
    if (!canvas || !renderer) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      renderer.postResize();
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
