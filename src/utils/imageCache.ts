import { IMAGE_CACHE_SIZE } from "../store/constants";

export type CacheItem = {
  width: number;
  height: number;
  bitmap?: ImageBitmap;
};

// Simple LRU Cache (Map maintains insertion order)
// NOTE: You can improve this with a doubly linked list for O(1) operations if needed
export class ImageCache {
  private cache = new Map<string, CacheItem>();
  private capacity: number;

  constructor(capacity: number) {
    if (capacity <= 0) throw new Error("Capacity must be greater than 0");

    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key: string): CacheItem | undefined {
    if (!this.cache.has(key)) return undefined;
    const value = this.cache.get(key);
    if (!value) return undefined;
    this.cache.delete(key);
    // Re-insert to mark as most recently used
    this.cache.set(key, value);
    return value;
  }

  put(key: string, item: CacheItem): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Remove least recently used (first item in Map)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        const oldest = this.cache.get(oldestKey);
        if (oldest?.bitmap) oldest.bitmap.close(); // Free up ImageBitmap resources
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, item);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  size(): number {
    return this.cache.size;
  }
}

const imageCache = new ImageCache(IMAGE_CACHE_SIZE); // Default capacity
export default imageCache;
