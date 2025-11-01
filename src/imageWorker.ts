type MessageEventData = {
  content: Uint8Array;
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
  const blob = new Blob([new Uint8Array(content)]);
  const img = await createImageBitmap(blob);
  // Post the decoded ImageBitmap back to the main thread and echo slotId if provided
  self.postMessage({ img, slotId, requestId } as ResponseData);
};
