import type { ImageRenderer } from ".";
import imageCache from "../../../utils/imageCache";
import { replaceCacheWithResampledImage } from "../../../utils/imageLoader";

export class Canvas2DRenderer implements ImageRenderer {
  private ctx: CanvasRenderingContext2D | null = null;
  private timeoutId: number | null = null;
  private currentResizeId = 0;

  initialize(canvas: HTMLCanvasElement): void {
    this.ctx = canvas.getContext("2d");
  }

  draw(
    image: ImageBitmap,
    imagePath: string,
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

    this.markHighQualityStale(imagePath, drawWidth, drawHeight);

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

    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    this.currentResizeId++;
    const resizeId = this.currentResizeId;

    this.timeoutId = window.setTimeout(() => {
      this.performLazyResize(
        resizeId,
        imagePath,
        drawWidth,
        drawHeight,
        offsetX,
        offsetY,
      );

      return () => {
        if (this.timeoutId !== null) {
          clearTimeout(this.timeoutId);
          this.timeoutId = null;
        }
      };
    }, 500);
  }

  private markHighQualityStale(
    path: string,
    drawWidth: number,
    drawHeight: number,
  ): void {
    const item = imageCache.get(path);
    if (!item?.isHighQuality || !item.resampledDimensions) return;

    const roundedWidth = Math.round(drawWidth);
    const roundedHeight = Math.round(drawHeight);
    const widthMatch =
      Math.abs(item.resampledDimensions.width - roundedWidth) < 2;
    const heightMatch =
      Math.abs(item.resampledDimensions.height - roundedHeight) < 2;

    if (widthMatch && heightMatch) return;

    imageCache.put(path, {
      ...item,
      isHighQuality: false,
      resampledDimensions: undefined,
    });
  }

  private performLazyResize = async (
    resizeId: number,
    path: string,
    drawWidth: number,
    drawHeight: number,
    offsetX: number,
    offsetY: number,
  ) => {
    if (resizeId !== this.currentResizeId) return;

    try {
      const highQualityBitmap = await replaceCacheWithResampledImage(
        path,
        Math.round(drawWidth),
        Math.round(drawHeight),
      );

      if (!highQualityBitmap || resizeId !== this.currentResizeId) return;

      if (!this.ctx) return;
      const ctx = this.ctx;

      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.drawImage(highQualityBitmap, offsetX, offsetY, drawWidth, drawHeight);
    } catch (error) {
      console.error("Error during lazy resize:", error);
    }
  };

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
