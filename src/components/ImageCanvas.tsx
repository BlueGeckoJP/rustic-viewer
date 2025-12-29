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

type RendererType = "2d" | "webgl";

export interface ImageCanvasProps {
  image: ImageBitmap | null;
  className: string;
  zoom: number;
  panOffset: { x: number; y: number };
  rendererType?: RendererType;
}

interface ImageRenderer {
  initialize(canvas: HTMLCanvasElement): void;
  draw(
    image: ImageBitmap,
    zoom: number,
    panOffset: { x: number; y: number },
  ): void;
  postResize(): void;
  clear(): void;
  dispose(): void;
}

class Canvas2DRenderer implements ImageRenderer {
  private ctx: CanvasRenderingContext2D | null = null;

  initialize(canvas: HTMLCanvasElement): void {
    this.ctx = canvas.getContext("2d");
  }

  draw(
    image: ImageBitmap,
    zoom: number,
    panOffset: { x: number; y: number },
  ): void {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const { width: cssW, height: cssH } = ctx.canvas.getBoundingClientRect();

    const imgRatio = image.width / image.height;
    const canvasRatio = cssW / cssH;

    let baseWidth: number, baseHeight: number;
    if (imgRatio > canvasRatio) {
      baseWidth = cssW;
      baseHeight = cssW / imgRatio;
    } else {
      baseHeight = cssH;
      baseWidth = cssH * imgRatio;
    }

    const drawWidth = baseWidth * zoom;
    const drawHeight = baseHeight * zoom;

    const centerX = cssW / 2;
    const centerY = cssH / 2;

    const offsetX = centerX - drawWidth / 2 + panOffset.x;
    const offsetY = centerY - drawHeight / 2 + panOffset.y;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
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
  }

  postResize(): void {
    const ctx = this.ctx;
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  clear(): void {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
  }

  dispose(): void {
    this.clear();
    this.ctx = null;
  }
}

const createRenderer = (type: RendererType): ImageRenderer => {
  switch (type) {
    case "2d":
      return new Canvas2DRenderer();
    default:
      return new Canvas2DRenderer();
  }
};

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
