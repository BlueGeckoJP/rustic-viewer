import useImageViewer from "../../hooks/useImageViewer";
import {
  type ComparisonTabState,
  type SingleTabState,
  useTabStore,
} from "../../store";
import ImageCanvas from "../ImageCanvas";
import ViewerControls from "../ViewerControls";
import ViewerHeader from "../ViewerHeader";

export type SlotComponentProps = {
  tabId: string;
  childId: string;
};

const SlotComponent = ({ tabId, childId }: SlotComponentProps) => {
  const comparisonTab: ComparisonTabState | null = useTabStore(
    (s) => s.comparisonTabs[tabId] ?? null,
  );
  const childTab: SingleTabState | null = useTabStore(
    (s) => s.singleTabs[childId] ?? null,
  );
  const setCurrentIndex = useTabStore((s) => s.setCurrentIndex);

  const {
    currentImage,
    rawPath,
    isLoading,
    isPanning,
    onWheel,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
    onDoubleClick,
  } = useImageViewer({ singleTab: childTab });

  // Render nothing if the comparison tab or child tab is missing
  if (!comparisonTab || !childTab) return null;

  return (
    <div className="flex flex-col w-full h-full">
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
              imagePath={rawPath}
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
    </div>
  );
};

export default SlotComponent;
