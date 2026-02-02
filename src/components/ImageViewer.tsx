import type { SingleTabState } from "../store";
import ImageCanvas from "./ImageCanvas";
import ViewerControls from "./ViewerControls";
import ViewerHeader from "./ViewerHeader";

export type ImageViewerComponentProps = {
  singleTab: SingleTabState;
  rawPath: string;
  isLoading: boolean;
  currentImage: ImageBitmap | null;
  isPanning: boolean;
  imageCanvasClassName: string;
  onWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
  onMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseUp: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => void;
  onDoubleClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  setCurrentIndex: (id: string, index: number) => void;
};

const ImageViewer = ({
  rawPath,
  isLoading,
  singleTab,
  currentImage,
  isPanning,
  imageCanvasClassName,
  onWheel,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onDoubleClick,
  setCurrentIndex,
}: ImageViewerComponentProps) => {
  return (
    <>
      <ViewerHeader
        rawPath={rawPath}
        isLoading={isLoading}
        singleTab={singleTab}
      />
      <div
        className="flex flex-1 items-center justify-center"
        role="img"
        aria-label="Image viewer"
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
            imagePath={rawPath}
            className={imageCanvasClassName}
            zoom={singleTab?.zoom ?? 1.0}
            panOffset={singleTab?.panOffset ?? { x: 0, y: 0 }}
          />
        ) : (
          <span className="text-[#888]">No Image</span>
        )}
      </div>

      <ViewerControls singleTab={singleTab} setCurrentIndex={setCurrentIndex} />
    </>
  );
};

export default ImageViewer;
