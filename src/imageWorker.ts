import init, { decode_image_to_sab } from "../src-wasm/pkg/src_wasm";

type MessageEventData = {
  content: Uint8Array;
  // Backwards compatibility: slot identifier (legacy path)
  slotId?: string;
  // New promise-based decode identifier
  requestId?: number;
};

export type ResponseData = {
  data: SharedArrayBuffer;
  width: number;
  height: number;
  slotId?: string;
  requestId?: number;
};

const initPromise = init().then(() => {
  console.log("WASM initialized");
  console.log(
    "[worker] typeof SharedArrayBuffer:",
    typeof (self as typeof globalThis).SharedArrayBuffer,
    "[worker] typeof Atomics:",
    typeof (self as typeof globalThis).Atomics
  );
});

self.onmessage = async (e: MessageEvent<MessageEventData>) => {
  await initPromise;
  const { content, slotId, requestId } = e.data;
  const obj = decode_image_to_sab(content) as {
    buffer: SharedArrayBuffer;
    width: number;
    height: number;
  };
  // Post the decoded ImageData back to the main thread and echo slotId if provided
  self.postMessage({
    data: obj.buffer,
    width: obj.width,
    height: obj.height,
    slotId,
    requestId,
  } as ResponseData);
};
