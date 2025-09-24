import { render } from "@testing-library/react";
import ImageCanvas from "../ImageCanvas";

// Provide a fake 2D context with spies
function createFakeCtx() {
  return {
    clearRect: jest.fn(),
    drawImage: jest.fn(),
    setTransform: jest.fn(),
    scale: jest.fn(),
    getImageData: jest.fn(),
    putImageData: jest.fn(),
  } as unknown as CanvasRenderingContext2D;
}

describe("ImageCanvas", () => {
  let origGetContext: any;
  beforeEach(() => {
    origGetContext = HTMLCanvasElement.prototype.getContext;
  });
  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = origGetContext;
  });

  test("clears canvas when image is null", () => {
    const fakeCtx = createFakeCtx();
    HTMLCanvasElement.prototype.getContext = jest.fn(() => fakeCtx as any);
    const { container } = render(<ImageCanvas image={null} />);
    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    expect(canvas).toBeTruthy();
    // draw is called in effect - ensure clearRect used at least once
    expect(fakeCtx.clearRect).toHaveBeenCalled();
  });

  test("draws image with correct aspect fit calls", () => {
    const fakeCtx = createFakeCtx();
    HTMLCanvasElement.prototype.getContext = jest.fn(() => fakeCtx as any);

    // Create a small ImageData and set canvas bounding rect
    const img = new ImageData(4, 2);

    // jsdom doesn't implement getBoundingClientRect size; mock it per-element
    // Render and then stub getBoundingClientRect on the canvas element
    const { container } = render(<ImageCanvas image={img} />);
    const canvas = container.querySelector("canvas") as HTMLCanvasElement;
    // mock bounding rect
    canvas.getBoundingClientRect = () =>
      ({
        width: 200,
        height: 100,
        top: 0,
        left: 0,
        x: 0,
        y: 0,
        toJSON: () => {},
      }) as any;

    // Trigger a resize effect manually by calling the resize callback via window.dispatchEvent
    window.dispatchEvent(new Event("resize"));

    // After render and resize, drawImage should be called
    expect(fakeCtx.drawImage).toHaveBeenCalled();
  });
});
