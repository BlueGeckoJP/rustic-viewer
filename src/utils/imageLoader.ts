import imageCache, { type CacheItem } from "./imageCache";
import { decodeImageFromPath } from "./imageDecoder";

export default async function loadImage(
  path: string,
): Promise<ImageBitmap | undefined> {
  const item = imageCache.get(path);
  return item?.bitmap
    ? Promise.resolve(item.bitmap)
    : returnDecodeImagePromise(path);
}

const createImageBitmapFromCacheItem = (
  item: CacheItem,
  data: ImageData,
  path: string,
): Promise<ImageBitmap> => {
  return window.createImageBitmap(data).then((bitmap) => {
    item.bitmap = bitmap;
    imageCache.put(path, item); // Update cache with bitmap
    return bitmap;
  });
};

const returnDecodeImagePromise = (path: string) => {
  return decodeImageFromPath(path).then((img) => {
    const cacheItem: CacheItem = {
      width: img.width,
      height: img.height,
    };
    imageCache.put(path, cacheItem);
    return createImageBitmapFromCacheItem(cacheItem, img, path);
  });
};
