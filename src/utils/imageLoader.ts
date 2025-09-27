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
  return window.createImageBitmap(item.image).then((bitmap) => {
    item.bitmap = bitmap;
    imageCache.put(path, item); // Update cache with bitmap
    return bitmap;
  });
};

const returnDecodeImagePromise = (path: string) => {
  return decodeImageFromPath(path).then((img) => {
    const cacheItem: CacheItem = {
      image: img,
      width: img.width,
      height: img.height,
    };
    imageCache.put(path, cacheItem);
    return createImageBitmapFromCacheItem(cacheItem, path);
  });
};
