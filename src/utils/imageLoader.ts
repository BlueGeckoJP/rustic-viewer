import { Channel, invoke } from "@tauri-apps/api/core";
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
    isHighQuality: false,
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

export const replaceCacheWithResampledImage = async (
  path: string,
  targetWidth: number,
  targetHeight: number,
): Promise<ImageBitmap | undefined> => {
  const item = imageCache.get(path);
  if (item?.bitmap && isAlreadyResampled(path, targetWidth, targetHeight)) {
    return item.bitmap;
  }

  const highQualityBitmap = await performLanczosResampling(
    path,
    targetWidth,
    targetHeight,
  );
  if (!highQualityBitmap) return undefined;

  imageCache.put(path, {
    bitmap: highQualityBitmap,
    width: targetWidth,
    height: targetHeight,
    isHighQuality: true,
    resampledDimensions: { width: targetWidth, height: targetHeight },
  });

  return highQualityBitmap;
};

const performLanczosResampling = async (
  path: string,
  targetWidth: number,
  targetHeight: number,
): Promise<ImageBitmap> => {
  return new Promise((resolve, reject) => {
    const channel = new Channel<{
      width: number;
      height: number;
      data: string;
    }>();

    channel.onmessage = (message) => {
      const image = new Image();

      image.onload = async () => {
        try {
          const bitmap = await createImageBitmap(image);
          resolve(bitmap);
        } catch (error) {
          reject(error);
        }
      };

      image.onerror = (error) => {
        reject(error);
      };

      image.src = message.data;
    };

    invoke("lanczos_resize", {
      channel,
      path,
      targetWidth: Math.round(targetWidth),
      targetHeight: Math.round(targetHeight),
    }).catch((error) => {
      reject(error);
    });
  });
};

const isAlreadyResampled = (
  path: string,
  width: number,
  height: number,
): boolean => {
  const item = imageCache.get(path);
  if (!item?.isHighQuality || !item.resampledDimensions) return false;

  const widthMatch = Math.abs(item.resampledDimensions.width - width) < 2;
  const heightMatch = Math.abs(item.resampledDimensions.height - height) < 2;

  return widthMatch && heightMatch;
};
