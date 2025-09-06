import init, { decode_image_to_image_data } from "../src-wasm/pkg/src_wasm";

type MessageEventData = {
  content: Uint8Array;
  // Backwards compatibility: slot identifier (legacy path)
  slotId?: string;
  // New promise-based decode identifier
  requestId?: number;
};

type ResponseData = {
  img: ImageData;
  slotId?: string;
  requestId?: number;
};

const initPromise = init().then(() => {
  console.log("WASM initialized");
});

self.onmessage = async (e: MessageEvent<MessageEventData>) => {
  await initPromise;
  const { content, slotId, requestId } = e.data;
  const img = decode_image_to_image_data(content);
  // Post the decoded ImageData back to the main thread and echo slotId if provided
  (self as any).postMessage({ img, slotId, requestId } as ResponseData);
};
