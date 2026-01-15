import { Canvas2DRenderer } from "./Canvas2DRenderer";

export type RendererType = "2d" | "webgl";

export interface ImageRenderer {
  initialize(canvas: HTMLCanvasElement): void;
  draw(
    image: ImageBitmap,
    imagePath: string,
    zoom: number,
    panOffset: { x: number; y: number },
  ): void;
  postResize(): void;
  clear(): void;
  dispose(): void;
}

const createRenderer = (type: RendererType): ImageRenderer => {
  switch (type) {
    case "2d":
      return new Canvas2DRenderer();
    default:
      return new Canvas2DRenderer();
  }
};

export default createRenderer;
