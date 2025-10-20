// Test setup: extend expect with DOM matchers
import "@testing-library/jest-dom";

// Optionally add global mocks or setup here

// ImageData polyfill for jsdom environment used in tests
// This ensures ImageData is available in the test environment
const ensureImageDataExists = (): void => {
  if (typeof globalThis.ImageData === "undefined") {
    // Simple constructor supporting width/height and a data buffer
    class ImageDataPolyfill {
      readonly colorSpace = "srgb" as const;
      width: number;
      height: number;
      data: Uint8ClampedArray;

      constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.data = new Uint8ClampedArray(width * height * 4);
      }
    }

    // biome-ignore lint/suspicious/noExplicitAny: Polyfill requires dynamic property assignment
    (globalThis as Record<string, any>).ImageData = ImageDataPolyfill;
  }
};

ensureImageDataExists();
