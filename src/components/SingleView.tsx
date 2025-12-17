import useImageViewer from "../hooks/useImageViewer";
import useViewHotkeys from "../hooks/useViewHotkeys";
import { type SingleTabState, useTabStore } from "../store";
import ImageCanvas from "./ImageCanvas";
import ViewerControls from "./ViewerControls";
import ViewerHeader from "./ViewerHeader";

const SingleView = () => {
  const activeTabId = useTabStore((s) => s.activeTabId);
  const singleTab: SingleTabState | null = useTabStore(
    (s) => s.singleTabs[activeTabId] ?? null,
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
  } = useImageViewer({ singleTab });

  // Arrow key navigation and keyboard shortcuts
  useViewHotkeys({ singleTab });

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
          />
        ) : (
          <span className="text-[#888]">No Image</span>
        )}
      </div>

      <ViewerControls singleTab={singleTab} setCurrentIndex={setCurrentIndex} />
    </div>
  );
};

export default SingleView;
