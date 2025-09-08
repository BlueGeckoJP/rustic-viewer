import ImageWorker from "../imageWorker.ts?worker";
import { convertFileSrc } from "@tauri-apps/api/core";
import { readFile } from "@tauri-apps/plugin-fs";

/**
 * Singleton image decode service.
 * Provides promise-based decode using a single Web Worker instance.
 */

type Pending = {
  resolve: (img: ImageData) => void;
  reject: (err: Error | ErrorEvent) => void;
};

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, Pending>();

function ensureWorker() {
  if (worker) return worker;
  worker = new ImageWorker();
  worker.onmessage = (e: MessageEvent) => {
    const data = e.data as { img?: ImageData; requestId?: number };
    if (data && typeof data.requestId === "number") {
      const p = pending.get(data.requestId);
      if (p) {
        pending.delete(data.requestId);
        if (data.img) p.resolve(data.img);
        else p.reject(new Error("No image in worker response"));
      }
    }
  };
  worker.onerror = (err) => {
    // Fail all pending
    pending.forEach((p) => p.reject(err));
    pending.clear();
  };
  return worker;
}

export async function decodeImageFromPath(path: string): Promise<ImageData> {
  const w = ensureWorker();
  const fileUrl = convertFileSrc(path);
  const content = await readFile(fileUrl);
  const requestId = nextId++;
  return new Promise<ImageData>((resolve, reject) => {
    pending.set(requestId, { resolve, reject });
    w.postMessage({ content, requestId });
  });
}

/** Optional: allow direct Uint8Array decoding if already loaded elsewhere */
export async function decodeImageBytes(bytes: Uint8Array): Promise<ImageData> {
  const w = ensureWorker();
  const requestId = nextId++;
  return new Promise<ImageData>((resolve, reject) => {
    pending.set(requestId, { resolve, reject });
    w.postMessage({ content: bytes, requestId });
  });
}

export function terminateDecoder() {
  if (worker) {
    worker.terminate();
    worker = null;
    pending.clear();
  }
}
