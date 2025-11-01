import { convertFileSrc } from "@tauri-apps/api/core";
import { readFile } from "@tauri-apps/plugin-fs";
import ImageWorker from "../imageWorker.ts?worker";

/**
 * Worker Pool based image decode service.
 * Uses multiple workers to decode images in parallel for better performance.
 */

type Pending = {
  resolve: (img: ImageData) => void;
  reject: (err: Error | ErrorEvent) => void;
};

type WorkerInstance = {
  worker: Worker;
  busy: boolean;
  currentRequestId: number | null;
};

// Worker pool configuration
const WORKER_POOL_SIZE = 4; // Can decode 4 images simultaneously
const workerPool: WorkerInstance[] = [];
let nextId = 0;
const pending = new Map<number, Pending>();

function initializeWorkerPool() {
  if (workerPool.length > 0) return;

  for (let i = 0; i < WORKER_POOL_SIZE; i++) {
    const worker = new ImageWorker();
    const instance: WorkerInstance = {
      worker,
      busy: false,
      currentRequestId: null,
    };

    worker.onmessage = (e: MessageEvent) => {
      const data = e.data as { img?: ImageData; requestId?: number };
      if (data && typeof data.requestId === "number") {
        const p = pending.get(data.requestId);
        if (p) {
          pending.delete(data.requestId);
          if (data.img) p.resolve(data.img);
          else p.reject(new Error("No image in worker response"));
        }

        // Mark worker as available
        instance.busy = false;
        instance.currentRequestId = null;

        // Process queued requests
        processQueue();
      }
    };

    worker.onerror = (err) => {
      // Fail current request
      if (instance.currentRequestId !== null) {
        const p = pending.get(instance.currentRequestId);
        if (p) {
          p.reject(err);
          pending.delete(instance.currentRequestId);
        }
      }
      instance.busy = false;
      instance.currentRequestId = null;
    };

    workerPool.push(instance);
  }
}

type QueuedRequest = {
  content: Uint8Array;
  requestId: number;
};

const requestQueue: QueuedRequest[] = [];

function getAvailableWorker(): WorkerInstance | null {
  return workerPool.find((w) => !w.busy) ?? null;
}

function processQueue() {
  while (requestQueue.length > 0) {
    const availableWorker = getAvailableWorker();
    if (!availableWorker) break;

    const request = requestQueue.shift();
    if (request) {
      availableWorker.busy = true;
      availableWorker.currentRequestId = request.requestId;
      availableWorker.worker.postMessage({
        content: request.content,
        requestId: request.requestId,
      });
    }
  }
}

function enqueueDecodeRequest(content: Uint8Array): Promise<ImageData> {
  initializeWorkerPool();

  const requestId = nextId++;

  return new Promise<ImageData>((resolve, reject) => {
    pending.set(requestId, { resolve, reject });

    const availableWorker = getAvailableWorker();
    if (availableWorker) {
      // Process immediately if a worker is available
      availableWorker.busy = true;
      availableWorker.currentRequestId = requestId;
      availableWorker.worker.postMessage({ content, requestId });
    } else {
      // Queue the request if all workers are busy
      requestQueue.push({ content, requestId });
    }
  });
}

export async function decodeImageFromPath(path: string): Promise<{
  imageData: ImageData;
  fileReadTime: number;
  wasmDecodeTime: number;
}> {
  const startFileRead = performance.now();
  const fileUrl = convertFileSrc(path);
  const content = await readFile(fileUrl);
  const fileReadTime = performance.now() - startFileRead;

  const startDecode = performance.now();
  const imageData = await enqueueDecodeRequest(content);
  const wasmDecodeTime = performance.now() - startDecode;

  return {
    imageData,
    fileReadTime,
    wasmDecodeTime,
  };
}

/** Optional: allow direct Uint8Array decoding if already loaded elsewhere */
export async function decodeImageBytes(bytes: Uint8Array): Promise<ImageData> {
  return enqueueDecodeRequest(bytes);
}

export function terminateDecoder() {
  workerPool.forEach((instance) => {
    instance.worker.terminate();
  });
  workerPool.length = 0;
  pending.clear();
  requestQueue.length = 0;
}

/** Debug utility: Get worker pool statistics */
export function getWorkerPoolStats() {
  return {
    totalWorkers: workerPool.length,
    busyWorkers: workerPool.filter((w) => w.busy).length,
    queuedRequests: requestQueue.length,
    pendingRequests: pending.size,
  };
}
