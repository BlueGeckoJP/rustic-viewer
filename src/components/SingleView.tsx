import { useEffect, useState } from "react";
import useImageBitmap from "../hooks/useImageBitmap";
import useImageNavigation from "../hooks/useImageNavigation";
import useViewHotkeys from "../hooks/useViewHotkeys";
import { type SingleTabState, useTabStore } from "../store";
import ImageCanvas from "./ImageCanvas";
import ViewerControls from "./ViewerControls";
import ViewerHeader from "./ViewerHeader";

const SingleView = () => {
  const activeTabId = useTabStore((s) => s.activeTabId);
  const singleTab: SingleTabState | undefined = useTabStore(
    (s) => s.singleTabs[activeTabId],
  );
  const setCurrentIndex = useTabStore((s) => s.setCurrentIndex);
  const [rawPath, setRawPath] = useState<string>("");

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
