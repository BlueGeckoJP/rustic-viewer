import { useState } from "react";
import useImageBitmap from "../../hooks/useImageBitmap";
import useImageNavigation from "../../hooks/useImageNavigation";
import {
  type ComparisonTabState,
  type SingleTabState,
  useTabStore,
} from "../../store";
import ImageCanvas from "../ImageCanvas";
import ViewerControls from "../ViewerControls";
import ViewerHeader from "../ViewerHeader";

export type SlotComponentProps = {
  rawPath: string;
  tabId: string;
  childId: string;
};

const SlotComponent = ({ rawPath, tabId, childId }: SlotComponentProps) => {
  const comparisonTab: ComparisonTabState | undefined = useTabStore(
    (s) => s.comparisonTabs[tabId],
  );
  const childTab: SingleTabState | undefined = useTabStore(
    (s) => s.singleTabs[childId],
  );
  const setCurrentIndex = useTabStore((s) => s.setCurrentIndex);

  const [currentImage, setCurrentImage] = useState<ImageBitmap | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(
    null,
  );

  useImageBitmap({
    rawPath,
    setCurrentImage: setCurrentImage,
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
    singleTab: childTab,
    isPanning,
    panStart,
    setIsPanning,
    setPanStart,
  });

  // Render nothing if the comparison tab or child tab is missing
  if (!comparisonTab || !childTab) return null;

  return (
    <>
      <ViewerHeader
        rawPath={rawPath}
        isLoading={isLoading}
        singleTab={childTab}
      />

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
        {currentImage ? (
          // NOTE: I left a 1rem gap with max-h because, without it, when the height is reduced even slightly,
          // the canvas rendering can’t keep up with the resize.
          // (Using max-h-[calc(100vh-2rem)] makes the size fit perfectly.)
          <div className="max-w-[calc(100vw-2rem)] max-h-[calc(100vh-3rem)] w-full h-full block">
            <ImageCanvas
              image={currentImage}
              className="w-full h-full max-w-full max-h-full block"
              zoom={childTab.zoom}
              panOffset={childTab.panOffset}
            />
          </div>
        ) : (
          <span className="text-[#888]">No Image</span>
        )}
      </div>

      <ViewerControls singleTab={childTab} setCurrentIndex={setCurrentIndex} />
    </>
  );
};

export default SlotComponent;
