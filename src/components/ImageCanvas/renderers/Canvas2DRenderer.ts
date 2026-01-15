import { Channel, invoke } from "@tauri-apps/api/core";
import type { ImageRenderer } from ".";

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
    }

    this.currentResizeId++;
    const resizeId = this.currentResizeId;

    this.performLazyResize(
      resizeId,
      imagePath,
      drawWidth,
      drawHeight,
      offsetX,
      offsetY,
    );

    this.timeoutId = window.setTimeout(async () => {
      return () => {
        this.timeoutId = null;
      };
    }, 300);
  }

  private performLazyResize = async (
    resizeId: number,
    path: string,
    drawWidth: number,
    drawHeight: number,
    offsetX: number,
    offsetY: number,
  ) => {
    if (resizeId !== this.currentResizeId) {
      return;
    }

    const ctx = this.ctx;
    if (!ctx) return;

    const channel = new Channel();

    channel.onmessage = (m) => {
      const message = m as { width: number; height: number; data: string };

      const img = new Image();

      img.onload = () => {
        if (resizeId !== this.currentResizeId) {
          return;
        }

        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
      };

      img.src = message.data;
    };

    await invoke("lanczos_resize", {
      channel: channel,
      path,
      targetWidth: Math.round(drawWidth),
      targetHeight: Math.round(drawHeight),
    }).catch((e) => {
      console.error("Error during lanczos resize:", e);
    });
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
