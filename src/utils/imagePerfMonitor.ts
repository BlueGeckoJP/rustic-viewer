export interface ImageLoadMetrics {
  path: string;
  fileReadTime: number;
  wasmDecodeTime: number;
  bitmapCreateTime: number;
  totalTime: number;
  cacheHit: boolean;
  timestamp: number;
  imageSize: { width: number; height: number };
}

class ImagePerformanceMonitor {
  private metrics: ImageLoadMetrics[] = [];

  recordMetric(metric: ImageLoadMetrics) {
    this.metrics.push(metric);
    this.logMetric(metric);
  }

  private logMetric(metric: ImageLoadMetrics) {
    console.group(`Image Load: ${metric.path}`);
    console.log(`  Total: ${metric.totalTime.toFixed(2)} ms`);
    console.log(`  File Read: ${metric.fileReadTime.toFixed(2)} ms`);
    console.log(`  WASM Decode: ${metric.wasmDecodeTime.toFixed(2)} ms`);
    console.log(`  Bitmap Create: ${metric.bitmapCreateTime.toFixed(2)} ms`);
    console.log(`  Cache Hit: ${metric.cacheHit}`);
    console.log(
      `  Image Size: ${metric.imageSize.width}x${metric.imageSize.height}`,
    );
    console.groupEnd();
  }
}

export const monitor = new ImagePerformanceMonitor();
