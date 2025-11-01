type MessageEventData = {
  content: Uint8Array<ArrayBuffer>;
  // Backwards compatibility: slot identifier (legacy path)
  slotId?: string;
  // New promise-based decode identifier
  requestId?: number;
};

type ResponseData = {
  img: ImageBitmap;
  slotId?: string;
  requestId?: number;
};

self.onmessage = async (e: MessageEvent<MessageEventData>) => {
  const { content, slotId, requestId } = e.data;
  const blob = new Blob([content], { type: "image/png" });
  const img = await createImageBitmap(blob, { resizeQuality: "high" });
  // Post the decoded ImageBitmap back to the main thread and echo slotId if provided
  self.postMessage({ img, slotId, requestId } as ResponseData);
};
