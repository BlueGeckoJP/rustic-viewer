import useImageViewer from "../../hooks/useImageViewer";
import {
  type ComparisonTabState,
  type SingleTabState,
  useTabStore,
} from "../../store";
import ImageViewer from "../ImageViewer";

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

  // NOTE: I left a 1rem gap with max-h because, without it, when the height is reduced even slightly,
  // the canvas rendering can’t keep up with the resize.
  // (Using max-h-[calc(100vh-2rem)] makes the size fit perfectly.)
  return (
    <div className="flex flex-col w-full h-full">
      <ImageViewer
        rawPath={rawPath}
        isLoading={isLoading}
        singleTab={childTab}
        currentImage={currentImage}
        isPanning={isPanning}
        imageCanvasClassName="w-full h-full max-w-full max-h-[calc(100vh-3rem)]"
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

export default SlotComponent;
