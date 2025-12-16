import { useRef, useState } from "react";
import useImageBitmap from "../../hooks/useImageBitmap";
import useImageNavigation from "../../hooks/useImageNavigation";
import { useTabStore } from "../../store";
import ImageCanvas from "../ImageCanvas";
import ViewerControls from "../ViewerControls";
import ViewerHeader from "../ViewerHeader";

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
      <ViewerHeader rawPath={rawPath} isLoading={isLoading} singleTab={child} />

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

      <ViewerControls singleTab={child} setCurrentIndex={setCurrentIndex} />
    </>
  );
};

export default SlotComponent;
