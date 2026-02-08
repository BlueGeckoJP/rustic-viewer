import useImageViewer from "../hooks/useImageViewer";
import useViewHotkeys from "../hooks/useViewHotkeys";
import { type SingleTabState, useTabStore } from "../store/tabStoreState";
import ImageViewer from "./ImageViewer";

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
      <ImageViewer
        rawPath={rawPath}
        isLoading={isLoading}
        singleTab={singleTab}
        currentImage={currentImage}
        isPanning={isPanning}
        imageCanvasClassName="w-full h-full max-w-full max-h-[calc(100vh-24px)]"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onDoubleClick={onDoubleClick}
        setCurrentIndex={setCurrentIndex}
      />
    </div>
  );
};

export default SingleView;
