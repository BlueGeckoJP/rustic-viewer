import imageCache, { type CacheItem } from "./imageCache";
import { imageDecoderPool } from "./imageDecoder";
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
      decodeTime: 0,
      totalTime,
      cacheHit: true,
      timestamp: Date.now(),
      imageSize: { width: item.width, height: item.height },
    };
    monitor.recordMetric(metrics);
    return item.bitmap;
  }

  return decodeAndCacheImage(path, startTotal);
}

const decodeAndCacheImage = async (path: string, startTotal: number) => {
  const { imageBitmap, fileReadTime, decodeTime } =
    await imageDecoderPool.decodeImageFromPath(path);

  const cacheItem: CacheItem = {
    bitmap: imageBitmap,
    width: imageBitmap.width,
    height: imageBitmap.height,
  };
  imageCache.put(path, cacheItem);

  const totalTime = performance.now() - startTotal;

  const metrics: ImageLoadMetrics = {
    path,
    fileReadTime,
    decodeTime,
    totalTime,
    cacheHit: false,
    timestamp: Date.now(),
    imageSize: { width: imageBitmap.width, height: imageBitmap.height },
  };
  monitor.recordMetric(metrics);

  return imageBitmap;
};
