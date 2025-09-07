import React, { useCallback, useEffect, useRef, useState } from "react";
import { decodeImageFromPath } from "../utils/imageDecoder";
import ImageCanvas from "./ImageCanvas";
import { isSingleTab, useTabStore } from "../store";

/**
 * SingleView: handles all logic & UI for displaying a single image tab.
 * Extracted from App.tsx to keep App lean.
 *
 * Responsibilities:
 *  - Manage current decoded image + loading state
 *  - Directory listing & image sequence management
 *  - Arrow key navigation between images
 *  - High DPI canvas rendering via ImageCanvas
 *  - Expose openImage(rawPath) through provided ref for external triggers (e.g., Tauri events)
 */
export type SingleViewProps = {};

const SingleView: React.FC<SingleViewProps> = (_props: SingleViewProps) => {
  // Store selectors
  const activeTabId = useTabStore((s) => s.activeTabId);
  const singleTab = useTabStore((s) =>
    s.activeTabId ? s.getSingleTab(s.activeTabId) : null
  );
  const setCurrentIndex = useTabStore((s) => s.setCurrentIndex);
  const activeTab = useTabStore((s) =>
    activeTabId ? s.tabs.find((t) => t.id === activeTabId) : null
  );

  // Local view state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentImage, setCurrentImage] = useState<ImageData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Draw wrapper kept for possible future extensions (zoom/pan etc.)
  const drawCurrentImage = useCallback(() => {
    // ImageCanvas handles draw on image/state change.
  }, []);

  const loadImageByPath = useCallback((rawPath: string) => {
    setIsLoading(true);
    decodeImageFromPath(rawPath)
      .then((img) => setCurrentImage(img))
      .finally(() => setIsLoading(false));
  }, []);

  // When active single tab changes, load its current image
  useEffect(() => {
    if (
      !singleTab ||
      !singleTab.directory ||
      singleTab.imageList.length === 0
    ) {
      setCurrentImage(null);
      drawCurrentImage();
      return;
    }
    const path = singleTab.imageList[singleTab.currentIndex];
    loadImageByPath(path);
  }, [
    singleTab?.id,
    singleTab?.directory,
    singleTab?.currentIndex,
    singleTab?.imageList,
  ]);

  // Canvas resize sync (delegated mostly to ImageCanvas, but keep for potential extra logic)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const wantedWidth = Math.round(rect.width * dpr);
      const wantedHeight = Math.round(rect.height * dpr);
      if (canvas.width !== wantedWidth || canvas.height !== wantedHeight) {
        canvas.width = wantedWidth;
        canvas.height = wantedHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(dpr, dpr);
        }
        drawCurrentImage();
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [drawCurrentImage]);

  // Redraw on image change (no-op wrapper)
  useEffect(() => {
    drawCurrentImage();
  }, [currentImage, drawCurrentImage]);

  // Arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!singleTab) return;
      const { imageList, currentIndex } = singleTab;
      if (imageList.length === 0) return;
      if (e.key === "ArrowRight") {
        const next = (currentIndex + 1) % imageList.length;
        setCurrentIndex(singleTab.id, next);
        loadImageByPath(imageList[next]);
      } else if (e.key === "ArrowLeft") {
        const prev = (currentIndex - 1 + imageList.length) % imageList.length;
        setCurrentIndex(singleTab.id, prev);
        loadImageByPath(imageList[prev]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [singleTab?.imageList, singleTab?.currentIndex, loadImageByPath]);

  // Render nothing if the active tab is not a single tab
  if (!activeTab || !isSingleTab(activeTab)) return null;

  return (
    <div className="w-full h-full flex items-center justify-center">
      <ImageCanvas
        image={currentImage}
        className="w-screen h-screen"
        onInitCanvas={(c) => (canvasRef.current = c)}
      />
      {isLoading && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded">
          Loading...
        </div>
      )}
      {(singleTab?.imageList.length ?? 0) > 0 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded">
          {`[${(singleTab?.currentIndex ?? -1) + 1}/${
            singleTab?.imageList.length
          }]`}
        </div>
      )}
    </div>
  );
};

export default SingleView;
