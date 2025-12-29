import type { ImageRenderer } from ".";

export class Canvas2DRenderer implements ImageRenderer {
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
