// Test setup: extend expect with DOM matchers
import "@testing-library/jest-dom";

// Optionally add global mocks or setup here

// Minimal ImageData polyfill for jsdom environment used in tests
if (typeof (globalThis as any).ImageData === "undefined") {
  // Simple constructor supporting width/height and a data buffer
  (globalThis as any).ImageData = class {
    width: number;
    height: number;
    data: Uint8ClampedArray;
    constructor(w: number, h: number) {
      this.width = w;
      this.height = h;
      this.data = new Uint8ClampedArray(w * h * 4);
    }
  };
}
