import { useRef, useState } from "react";
import useImageBitmap from "../../hooks/useImageBitmap";
import useImageNavigation from "../../hooks/useImageNavigation";
import { useTabStore } from "../../store";
import ImageCanvas from "../ImageCanvas";

export type SlotComponentProps = {
  rawPath: string;
  tabId: string;
  childId: string;
};

// Shared worker now encapsulated by decodeImageFromPath utility
const SlotComponent: React.FC<SlotComponentProps> = ({
  rawPath,
  tabId,
  childId,
}) => {
  const [imgData, setImgData] = useState<ImageBitmap | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(
    null,
  );

  const tab = useTabStore((s) => s.comparisonTabs[tabId] || null);
  const singleTabs = useTabStore((s) => s.singleTabs);
  const setCurrentIndex = useTabStore((s) => s.setCurrentIndex);

  const child = singleTabs[childId] ?? null;

  useImageBitmap({
    rawPath,
    setCurrentImage: setImgData,
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
    singleTab: child,
    isPanning,
    panStart,
    setIsPanning,
    setPanStart,
  });

  if (!tab) return null;
  if (!child) return null;

  return (
    <>
      <div
        className={`text-xs text-[#D3DAD9] flex items-center gap-2 w-full h-6 ${isLoading ? "bg-[#715A5A] transition-colors duration-300" : "bg-[#44444E]"}`}
      >
        <span className="truncate mx-2" title={rawPath ? rawPath : "(empty)"}>
          {rawPath ? rawPath.split("/").pop() : "(empty)"}
        </span>
        <span className="opacity-60">
          {child.currentIndex + 1}/{child.imageList.length}
        </span>

        {/* Loading overlay */}
        <div
          className={`ml-auto px-2 h-full flex items-center justify-center transition-all duration-300 ${isLoading ? "animate-loading-overlay-fade-in" : "pointer-events-none animate-loading-overlay-fade-out"}`}
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

      {/* Canvas-based image rendering (matches SingleTab canvas behavior) */}
      <div
        className="flex-1 flex items-center justify-center w-full"
        role="img"
        aria-label="Comparison slot with zoom and pan controls"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onDoubleClick={onDoubleClick}
        style={{ cursor: isPanning ? "grabbing" : "default" }}
      >
        {rawPath ? (
          // NOTE: I left a 1rem gap with max-h because, without it, when the height is reduced even slightly,
          // the canvas rendering can’t keep up with the resize.
          // (Using max-h-[calc(100vh-2rem)] makes the size fit perfectly.)
          <div className="max-w-[calc(100vw-2rem)] max-h-[calc(100vh-3rem)] w-full h-full block">
            <ImageCanvas
              image={imgData}
              className="w-full h-full max-w-full max-h-full block"
              zoom={child.zoom}
              panOffset={child.panOffset}
              onInitCanvas={(c) => {
                canvasRef.current = c;
              }}
            />
          </div>
        ) : (
          <span className="text-[#888]">No Image</span>
        )}
      </div>

      {/* Simple per-child navigation controls (optional) */}
      <div className="absolute bottom-1 right-2 flex gap-1 opacity-0 transition">
        <button
          className="px-2 py-1 bg-[#44444E] rounded text-xs hover:bg-[#555]"
          onClick={(e) => {
            e.stopPropagation();
            const next =
              (child.currentIndex - 1 + child.imageList.length) %
              child.imageList.length;
            setCurrentIndex(child.id, next);
          }}
          type="button"
        >
          ◀
        </button>
        <button
          className="px-2 py-1 bg-[#44444E] rounded text-xs hover:bg-[#555]"
          onClick={(e) => {
            e.stopPropagation();
            const next = (child.currentIndex + 1) % child.imageList.length;
            setCurrentIndex(child.id, next);
          }}
          type="button"
        >
          ▶
        </button>
      </div>
    </>
  );
};

export default SlotComponent;
