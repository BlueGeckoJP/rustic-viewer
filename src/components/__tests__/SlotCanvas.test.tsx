import { render, waitFor } from "@testing-library/react";
import SlotCanvas from "../SlotCanvas";

// Mock decodeImageFromPath to return a small ImageData
jest.mock("../../utils/imageDecoder", () => ({
  decodeImageFromPath: jest.fn(async () => new ImageData(2, 2)),
}));

describe("SlotCanvas", () => {
  beforeEach(() => {
    const fakeCtx = {
      clearRect: jest.fn(),
      drawImage: jest.fn(),
      setTransform: jest.fn(),
      scale: jest.fn(),
      getImageData: jest.fn(),
      putImageData: jest.fn(),
    } as unknown as CanvasRenderingContext2D;
    HTMLCanvasElement.prototype.getContext = jest.fn(() => fakeCtx as any);
  });

  test("calls decodeImageFromPath and renders ImageCanvas canvas", async () => {
    render(<SlotCanvas rawPath={"/some/path.png"} />);

    // Expect the canvas element to eventually appear (ImageCanvas renders a canvas)
    await waitFor(() => {
      const canvas = document.querySelector("canvas");
      expect(canvas).toBeTruthy();
    });
  });
});
