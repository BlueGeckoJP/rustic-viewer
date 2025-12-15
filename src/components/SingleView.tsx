import type React from "react";
import { useEffect, useRef, useState } from "react";
import useImageBitmap from "../hooks/useImageBitmap";
import useImageNavigation from "../hooks/useImageNavigation";
import useViewHotkeys from "../hooks/useViewHotkeys";
import { useTabStore } from "../store";
import ImageCanvas from "./ImageCanvas";
import ViewerHeader from "./ViewerHeader";

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
export type SingleViewProps = unknown;

const SingleView: React.FC<SingleViewProps> = (_props: SingleViewProps) => {
  // Store selectors
  const activeTabId = useTabStore((s) => s.activeTabId);
  const singleTab = useTabStore((s) =>
    activeTabId ? s.singleTabs[activeTabId] || null : null,
  );
  const setCurrentIndex = useTabStore((s) => s.setCurrentIndex);
  const [rawPath, setRawPath] = useState<string>("");

  // Local view state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentImage, setCurrentImage] = useState<ImageBitmap | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(
    null,
  );

  useImageBitmap({
    rawPath,
    setCurrentImage,
    setIsLoading,
  });

  const {
    onWheel,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
    onDoubleClick,
  } = useImageNavigation({
    singleTab,
    isPanning,
    panStart,
    setIsPanning,
    setPanStart,
  });

  // When active single tab changes, load its current image
  useEffect(() => {
    if (
      !singleTab ||
      !singleTab.directory ||
      singleTab.imageList.length === 0
    ) {
      setCurrentImage(null);
      setRawPath("");
      return;
    }
    const path = singleTab.imageList[singleTab.currentIndex];
    setRawPath(path);
  }, [singleTab]);

  // Arrow key navigation and keyboard shortcuts
  useViewHotkeys({ singleTab, setRawPath });

  // Render nothing if the active tab is not a single tab
  if (!singleTab) return null;

  return (
    <div className="group relative overflow-hidden flex flex-col bg-[#2F2E33] h-full w-full">
      <ViewerHeader
        rawPath={rawPath}
        isLoading={isLoading}
        singleTab={singleTab}
      />

      <div
        className="flex-1 flex items-center justify-center"
        role="img"
        aria-label="Image viewer with zoom and pan controls"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onDoubleClick={onDoubleClick}
        style={{ cursor: isPanning ? "grabbing" : "default" }}
      >
        {currentImage ? (
          <ImageCanvas
            image={currentImage}
            className="w-screen h-screen max-w-screen max-h-[calc(100vh-24px)]"
            zoom={singleTab?.zoom ?? 1.0}
            panOffset={singleTab?.panOffset ?? { x: 0, y: 0 }}
            onInitCanvas={(c) => {
              canvasRef.current = c;
            }}
          />
        ) : (
          <span className="text-[#888]">No Image</span>
        )}

        {/* Simple per-child navigation controls (optional) */}
        <div className="absolute bottom-1 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button
            className="px-2 py-1 bg-[#44444E] rounded text-xs hover:bg-[#555]"
            onClick={(e) => {
              e.stopPropagation();
              const next =
                (singleTab.currentIndex - 1 + singleTab.imageList.length) %
                singleTab.imageList.length;
              setCurrentIndex(singleTab.id, next);
            }}
            type="button"
          >
            ◀
          </button>
          <button
            className="px-2 py-1 bg-[#44444E] rounded text-xs hover:bg-[#555]"
            onClick={(e) => {
              e.stopPropagation();
              const next =
                (singleTab.currentIndex + 1) % singleTab.imageList.length;
              setCurrentIndex(singleTab.id, next);
            }}
            type="button"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
};

export default SingleView;
