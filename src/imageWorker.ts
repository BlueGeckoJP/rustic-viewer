import init, { decode_image_to_image_data } from "../src-wasm/pkg/src_wasm";

type MessageEventData = {
  content: Uint8Array;
};

type ResponseData = {
  img: ImageData;
};

let _wasmInitialized = false;
const initPromise = init().then(() => {
  _wasmInitialized = true;
  console.log("WASM initialized");
});

self.onmessage = async (e: MessageEvent<MessageEventData>) => {
  await initPromise;
  const { content } = e.data;
  const img = decode_image_to_image_data(content);
  // Post the decoded ImageData back to the main thread
  (self as any).postMessage({ img } as ResponseData);
};
