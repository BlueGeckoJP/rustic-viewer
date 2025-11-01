import imageCache, { type CacheItem } from "./imageCache";
import { decodeImageFromPath } from "./imageDecoder";
import { type ImageLoadMetrics, monitor } from "./imagePerfMonitor";

export default async function loadImage(
  path: string,
): Promise<ImageBitmap | undefined> {
  const startTotal = performance.now();
  const item = imageCache.get(path);

  if (item?.bitmap) {
    const totalTime = performance.now() - startTotal;
    const metrics: ImageLoadMetrics = {
      path,
      fileReadTime: 0,
      wasmDecodeTime: 0,
      bitmapCreateTime: 0,
      totalTime,
      cacheHit: true,
      timestamp: Date.now(),
      imageSize: { width: item.width, height: item.height },
    };
    monitor.recordMetric(metrics);
    return Promise.resolve(item.bitmap);
  }

  return returnDecodeImagePromise(path, startTotal);
}

const createImageBitmapFromCacheItem = (
  item: CacheItem,
  data: ImageData,
  path: string,
): Promise<{ bitmap: ImageBitmap; bitmapTime: number }> => {
  const startBitmap = performance.now();
  return window.createImageBitmap(data).then((bitmap) => {
    const bitmapTime = performance.now() - startBitmap;
    item.bitmap = bitmap;
    imageCache.put(path, item); // Update cache with bitmap
    return { bitmap, bitmapTime };
  });
};

const returnDecodeImagePromise = async (path: string, startTotal: number) => {
  const { imageData, fileReadTime, wasmDecodeTime } =
    await decodeImageFromPath(path);

  const cacheItem: CacheItem = {
    width: imageData.width,
    height: imageData.height,
  };
  imageCache.put(path, cacheItem);

  const { bitmap, bitmapTime } = await createImageBitmapFromCacheItem(
    cacheItem,
    imageData,
    path,
  );

  const totalTime = performance.now() - startTotal;

  const metrics: ImageLoadMetrics = {
    path,
    fileReadTime,
    wasmDecodeTime,
    bitmapCreateTime: bitmapTime,
    totalTime,
    cacheHit: false,
    timestamp: Date.now(),
    imageSize: { width: imageData.width, height: imageData.height },
  };
  monitor.recordMetric(metrics);

  return bitmap;
};
