// Mock the worker module used by imageDecoder (ImageWorker)
const MockWorker = jest.fn().mockImplementation(function (this: any) {
  this.postMessage = jest.fn();
  this.terminate = jest.fn();
  this.onmessage = null;
  this.onerror = null;
});
jest.mock("../imageWorker.ts?worker", () => ({ default: MockWorker }));

// Mock tauri file APIs used in decodeImageFromPath
jest.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (p: string) => p,
}));

jest.mock("@tauri-apps/plugin-fs", () => ({
  readFile: jest.fn(async () => new Uint8Array([1, 2, 3])),
}));

describe("imageDecoder utilities", () => {
  beforeEach(async () => {
    // ensure fresh worker per test by terminating any existing worker
    const module = await import("../utils/imageDecoder");
    module.terminateDecoder();
  });

  test("decodeImageBytes posts message and resolves when worker replies", async () => {
    // import after mocks
    const module = await import("../utils/imageDecoder");
    // Access the mocked worker instance that was created
    const MockWorker = (await import("../imageWorker.ts?worker"))
      .default as any;
    // There should be a mock worker instance from ensureWorker
    const promise = module.decodeImageBytes(new Uint8Array([1, 2, 3]));

    // The worker instance created by ensureWorker is the last constructed MockWorker
    const instances = (MockWorker as any).mock?.instances || [];
    expect(instances.length).toBeGreaterThan(0);
    const inst = instances[instances.length - 1];
    // craft a fake ImageData to return
    const fakeImg = new ImageData(2, 2);
    // get the requestId used by the postMessage call
    const lastCall =
      inst.postMessage.mock.calls[inst.postMessage.mock.calls.length - 1][0];
    const rid = lastCall.requestId;
    // ensure onmessage exists and simulate worker response
    expect(typeof inst.onmessage).toBe("function");
    inst.onmessage({ data: { img: fakeImg, requestId: rid } });

    const result = await promise;
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
  });

  test("decodeImageFromPath reads file and resolves", async () => {
    const module = await import("../utils/imageDecoder");
    const MockWorker = (await import("../imageWorker.ts?worker"))
      .default as any;
    const promise = module.decodeImageFromPath("/some/path.png");
    const instances = (MockWorker as any).mock?.instances || [];
    expect(instances.length).toBeGreaterThan(0);
    const inst = instances[instances.length - 1];
    const fakeImg = new ImageData(1, 1);

    // wait for postMessage to be called on the worker (tolerate small async timing)
    const waitForCall = (ms = 1000) =>
      new Promise<void>((resolve, reject) => {
        const start = Date.now();
        (function check() {
          const calls = inst.postMessage.mock.calls || [];
          if (calls.length > 0) return resolve();
          if (Date.now() - start > ms)
            return reject(new Error("postMessage not called"));
          setTimeout(check, 10);
        })();
      });

    await waitForCall(1000);
    const calls = inst.postMessage.mock.calls || [];
    const lastCall = calls[calls.length - 1][0] || { requestId: 0 };
    const rid = lastCall.requestId ?? 0;
    inst.onmessage({ data: { img: fakeImg, requestId: rid } });
    const res = await promise;
    expect(res.width).toBe(1);
  });

  test("terminateDecoder terminates worker and clears pending", async () => {
    const module = await import("../utils/imageDecoder");
    const MockWorker = (await import("../imageWorker.ts?worker"))
      .default as any;
    const p = module.decodeImageBytes(new Uint8Array([4, 5, 6]));
    // avoid unhandled rejection if it rejects later
    p.catch(() => {});
    const instances = (MockWorker as any).mock?.instances || [];
    const inst = instances[instances.length - 1];
    expect(typeof inst.terminate).toBe("function");
    module.terminateDecoder();
    expect(inst.terminate).toHaveBeenCalled();
  });
});
