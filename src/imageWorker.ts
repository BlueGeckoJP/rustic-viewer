import init, { decode_image_to_image_data } from "../src-wasm/pkg/src_wasm";

type MessageEventData = {
  content: Uint8Array;
  // optional slot id to identify which canvas requested this image
  slotId?: string;
};

type ResponseData = {
  img: ImageData;
  slotId?: string;
};

const initPromise = init().then(() => {
  console.log("WASM initialized");
});

self.onmessage = async (e: MessageEvent<MessageEventData>) => {
  await initPromise;
  const { content, slotId } = e.data;
  const img = decode_image_to_image_data(content);
  // Post the decoded ImageData back to the main thread and echo slotId if provided
  (self as any).postMessage({ img, slotId } as ResponseData);
};
