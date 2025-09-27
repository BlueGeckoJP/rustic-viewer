import imageCache, { type CacheItem } from "./imageCache";
import { decodeImageFromPath } from "./imageDecoder";

export default async function loadImage(
  path: string
): Promise<ImageBitmap | undefined> {
  if (imageCache.has(path)) {
    const item = imageCache.get(path);
    if (item) {
      if (item.bitmap) {
        return Promise.resolve(item.bitmap);
      } else {
        return createImageBitmapFromCacheItem(item, path);
      }
    } else {
      return returnDecodeImagePromise(path);
    }
  } else {
    return returnDecodeImagePromise(path);
  }
}

const createImageBitmapFromCacheItem = (
  item: CacheItem,
  path: string
): Promise<ImageBitmap> => {
  const w = item.width;
  const h = item.height;

  const sab = item.buffer;
  const pixels = new Uint8ClampedArray(sab);

  const imageData = new ImageData(w, h);
  imageData.data.set(pixels);

  return window.createImageBitmap(imageData).then((bitmap) => {
    item.bitmap = bitmap;
    imageCache.put(path, item); // Update cache with bitmap
    return bitmap;
  });
};

const returnDecodeImagePromise = (path: string) => {
  return decodeImageFromPath(path).then((img) => {
    const sab = new SharedArrayBuffer(img.data.buffer.byteLength);
    const pixels = new Uint8ClampedArray(sab);
    pixels.set(img.data);

    const cacheItem = {
      buffer: sab,
      width: img.width,
      height: img.height,
      bitmap: undefined,
    };
    imageCache.put(path, cacheItem);
    return createImageBitmapFromCacheItem(cacheItem, path);
  });
};
