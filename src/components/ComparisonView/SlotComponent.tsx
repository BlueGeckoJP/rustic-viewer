import { useEffect, useRef, useState } from "react";
import { isComparisonTab, useTabStore } from "../../store";
import loadImage from "../../utils/imageLoader";
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const tab = useTabStore((s) => s.tabs.get(tabId) ?? null);
  const setCurrentIndex = useTabStore((s) => s.setCurrentIndex);

  useEffect(() => {
    let alive = true;
    loadImage(rawPath)
      .then((img) => {
        if (alive) setImgData(img ?? null);
      })
      .catch((e) => {
        console.error("Failed to load image:", e);
        if (alive) setImgData(null);
      });
    return () => {
      alive = false;
    };
  }, [rawPath]);

  if (!tab || !isComparisonTab(tab)) return null;
  const child = tab.children.get(childId) ?? null;
  if (!child) return null;

  return (
    <>
      <div className="text-xs px-2 py-1 bg-[#44444E] text-[#D3DAD9] flex items-center gap-2 w-full">
        <span className="truncate" title={rawPath}>
          {rawPath ? rawPath.split("/").pop() : "(empty)"}
        </span>
        <span className="opacity-60">
          {child.currentIndex + 1}/{child.imageList.length}
        </span>
      </div>

      {/* Canvas-based image rendering (matches SingleTab canvas behavior) */}
      <div className="flex-1 flex items-center justify-center w-full">
        {rawPath ? (
          // NOTE: I left a 1rem gap with max-h because, without it, when the height is reduced even slightly,
          // the canvas rendering can’t keep up with the resize.
          // (Using max-h-[calc(100vh-2rem)] makes the size fit perfectly.)
          <div className="max-w-[calc(100vw-2rem)] max-h-[calc(100vh-3rem)] w-full h-full block">
            <ImageCanvas
              image={imgData}
              className="w-full h-full max-w-full max-h-full block"
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
