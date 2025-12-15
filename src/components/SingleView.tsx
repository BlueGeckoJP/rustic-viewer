import type React from "react";
import { useEffect, useRef, useState } from "react";
import useImageBitmap from "../hooks/useImageBitmap";
import useViewHotkeys from "../hooks/useViewHotkeys";
import { useTabStore } from "../store";
import ImageCanvas from "./ImageCanvas";

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
  const setZoom = useTabStore((s) => s.setZoom);
  const setPanOffset = useTabStore((s) => s.setPanOffset);
  const resetZoomAndPan = useTabStore((s) => s.resetZoomAndPan);
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
      <div
        className={`text-xs text-[#D3DAD9] flex items-center gap-2 h-6 ${isLoading ? "bg-[#715A5A] transition-colors duration-300" : "bg-[#44444E]"}`}
      >
        <span className="truncate mx-2" title={rawPath ? rawPath : "(empty)"}>
          {rawPath ? rawPath.split("/").pop() : "(empty)"}
        </span>
        <span className="opacity-60">
          {singleTab.imageList.length <= 0
            ? "No Images"
            : `${singleTab.currentIndex + 1}/${singleTab.imageList.length}`}
        </span>

        {/* Loading overlay */}
        <div
          className={`ml-auto px-2 h-full flex items-center justify-center transition-opacity duration-300 ${isLoading ? "animate-loading-overlay-fade-in" : "animate-loading-overlay-fade-out pointer-events-none"}`}
        >
          <div className="flex justify-between items-center gap-3">
            {/* Loading pulse indicator */}
            <div className="relative">
              <div className="w-3 h-3 bg-[#D3DAD9] rounded-full animate-pulse"></div>
              <div className="absolute top-0 left-0 w-3 h-3 bg-[#D3DAD9] rounded-full animate-ping opacity-75"></div>
            </div>
            <div className="flex">
              <span className="text-[#D3DAD9] text-sm font-medium">
                Loading...
              </span>
            </div>
          </div>
        </div>
      </div>

      <div
        className="flex-1 flex items-center justify-center"
        role="img"
        aria-label="Image viewer with zoom and pan controls"
        onWheel={(e) => {
          if (!singleTab) return;
          e.preventDefault();
          const delta = -e.deltaY;
          const zoomFactor = 1 + delta * 0.001;
          const newZoom = Math.max(
            0.1,
            Math.min(10, singleTab.zoom * zoomFactor),
          );
          setZoom(singleTab.id, newZoom);
        }}
        onMouseDown={(e) => {
          if (!singleTab) return;
          if (e.button === 0) {
            // Left click to pan
            e.preventDefault();
            setIsPanning(true);
            setPanStart({ x: e.clientX, y: e.clientY });
          }
        }}
        onMouseMove={(e) => {
          if (!singleTab || !isPanning || !panStart) return;
          const dx = e.clientX - panStart.x;
          const dy = e.clientY - panStart.y;
          setPanOffset(singleTab.id, {
            x: singleTab.panOffset.x + dx,
            y: singleTab.panOffset.y + dy,
          });
          setPanStart({ x: e.clientX, y: e.clientY });
        }}
        onMouseUp={() => {
          setIsPanning(false);
          setPanStart(null);
        }}
        onMouseLeave={() => {
          setIsPanning(false);
          setPanStart(null);
        }}
        onDoubleClick={() => {
          if (!singleTab) return;
          resetZoomAndPan(singleTab.id);
        }}
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
