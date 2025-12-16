import { convertFileSrc } from "@tauri-apps/api/core";
import { readFile } from "@tauri-apps/plugin-fs";
import ImageWorker from "../imageWorker.ts?worker";

/**
 * Worker Pool based image decode service.
 * Uses multiple workers to decode images in parallel for better performance.
 */

type Pending = {
  resolve: (img: ImageBitmap) => void;
  reject: (err: Error | ErrorEvent) => void;
};

type WorkerInstance = {
  worker: Worker;
  busy: boolean;
  currentRequestId: number | null;
};

type QueuedRequest = {
  content: Uint8Array;
  requestId: number;
};

export class ImageDecoderPool {
  private poolSize = 4; // Can decode 4 images simultaneously
  private workerPool: WorkerInstance[] = [];
  private nextId = 0;
  private pending = new Map<number, Pending>();
  private requestQueue: QueuedRequest[] = [];

  private initializeWorkerPool() {
    if (this.workerPool.length > 0) return;

    for (let i = 0; i < this.poolSize; i++) {
      const worker = new ImageWorker();
      const instance: WorkerInstance = {
        worker,
        busy: false,
        currentRequestId: null,
      };

      worker.onmessage = (e: MessageEvent) => {
        const data = e.data as { img?: ImageBitmap; requestId?: number };
        if (data && typeof data.requestId === "number") {
          const p = this.pending.get(data.requestId);
          if (p) {
            this.pending.delete(data.requestId);
            if (data.img) p.resolve(data.img);
            else p.reject(new Error("No image in worker response"));
          }

          // Mark worker as available
          instance.busy = false;
          instance.currentRequestId = null;

          // Process queued requests
          this.processQueue();
        }
      };

      worker.onerror = (err) => {
        // Fail current request
        if (instance.currentRequestId !== null) {
          const p = this.pending.get(instance.currentRequestId);
          if (p) {
            p.reject(err);
            this.pending.delete(instance.currentRequestId);
          }
        }
        instance.busy = false;
        instance.currentRequestId = null;
      };

      this.workerPool.push(instance);
    }
  }

  private getAvailableWorker(): WorkerInstance | null {
    return this.workerPool.find((w) => !w.busy) ?? null;
  }

  private processQueue() {
    while (this.requestQueue.length > 0) {
      const availableWorker = this.getAvailableWorker();
      if (!availableWorker) break;

      const request = this.requestQueue.shift();
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

  private enqueueDecodeRequest(content: Uint8Array): Promise<ImageBitmap> {
    this.initializeWorkerPool();

    const requestId = this.nextId++;

    return new Promise<ImageBitmap>((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });

      const availableWorker = this.getAvailableWorker();
      if (availableWorker) {
        // Process immediately if a worker is available
        availableWorker.busy = true;
        availableWorker.currentRequestId = requestId;
        availableWorker.worker.postMessage({ content, requestId });
      } else {
        // Queue the request if all workers are busy
        this.requestQueue.push({ content, requestId });
      }
    });
  }

  async decodeImageFromPath(path: string): Promise<{
    imageBitmap: ImageBitmap;
    fileReadTime: number;
    decodeTime: number;
  }> {
    const startFileRead = performance.now();
    const fileUrl = convertFileSrc(path);
    const content = await readFile(fileUrl);
    const fileReadTime = performance.now() - startFileRead;

    const startDecode = performance.now();
    const imageBitmap = await this.enqueueDecodeRequest(content);
    const decodeTime = performance.now() - startDecode;

    return {
      imageBitmap,
      fileReadTime,
      decodeTime,
    };
  }

  terminate() {
    this.workerPool.forEach((instance) => {
      instance.worker.terminate();
    });
    this.workerPool.length = 0;
    this.pending.clear();
    this.requestQueue.length = 0;
  }

  /** Debug utility: Get worker pool statistics */
  getWorkerPoolStats() {
    return {
      totalWorkers: this.workerPool.length,
      busyWorkers: this.workerPool.filter((w) => w.busy).length,
      queuedRequests: this.requestQueue.length,
      pendingRequests: this.pending.size,
    };
  }
}

export const imageDecoderPool = new ImageDecoderPool();
