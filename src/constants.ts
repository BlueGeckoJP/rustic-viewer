export const STORAGE_KEY = "rustic-viewer:tabState:v1";

export const MAX_ZOOM = 10;
export const MIN_ZOOM = 0.1;

export const PERSIST_SAVE_DELAY_MS = 300;

export const IMAGE_CACHE_SIZE = 500;

export const WORKER_POOL_SIZE = () => {
  const MIN_POOL_SIZE = 2;

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.hardwareConcurrency === "number" &&
    navigator.hardwareConcurrency > 0
  ) {
    return Math.max(MIN_POOL_SIZE, navigator.hardwareConcurrency - 1);
  }

  return MIN_POOL_SIZE;
};
