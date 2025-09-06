import React, { useEffect, useRef, useState } from "react";
import { useTabStore, isComparisonTab } from "../store";
import ImageWorker from "../imageWorker.ts?worker";
import { convertFileSrc } from "@tauri-apps/api/core";
import { readFile } from "@tauri-apps/plugin-fs";
import ImageCanvas from "./ImageCanvas";

type ComparisonViewProps = {
  tabId: string;
};

const ComparisonView: React.FC<ComparisonViewProps> = ({ tabId }) => {
  const tab = useTabStore((s) =>
    s.tabs.find((t) => t.id === tabId && t.type === "comparison")
  );
  const setActiveSlotIndex = useTabStore((s) => s.setActiveSlotIndex);
  const setCurrentIndex = useTabStore((s) => s.setCurrentIndex);

  if (!tab || !isComparisonTab(tab)) return null;

  const { children, activeSlotIndex } = tab;
  const n = children.length;

  // Basic layout rules (auto by number of children)
  let containerClass = "";
  if (n === 2) containerClass = "flex flex-row gap-2 h-full";
  else if (n === 3) containerClass = "flex flex-row gap-2 h-full";
  else if (n === 4)
    containerClass = "grid grid-cols-2 grid-rows-2 gap-2 h-full";
  else containerClass = "flex flex-row gap-2 h-full"; // fallback

  return (
    <div className={`p-2 box-border w-full h-full ${containerClass}`}>
      {children.map((child, idx) => {
        const file = child.imageList[child.currentIndex];
        return (
          <div
            key={child.id}
            className={`relative group rounded-md overflow-hidden flex flex-col bg-[#2F2E33] ${
              n <= 3 ? "flex-1" : "w-full h-full"
            } ${
              activeSlotIndex === idx
                ? "outline-2 outline-[#715A5A]"
                : "outline-1 outline-transparent"
            }`}
            onClick={() => setActiveSlotIndex(tab.id, idx)}
          >
            <div className="text-xs px-2 py-1 bg-[#44444E] text-[#D3DAD9] flex items-center gap-2">
              <span className="truncate" title={file}>
                {file ? file.split("/").pop() : "(empty)"}
              </span>
              <span className="opacity-60">
                {child.currentIndex + 1}/{child.imageList.length}
              </span>
            </div>

            {/* Canvas-based image rendering (matches SingleTab canvas behavior) */}
            <div className="flex-1 flex items-center justify-center">
              {file ? (
                <SlotCanvas key={child.id} rawPath={file} slotId={child.id} />
              ) : (
                <span className="text-[#888]">No Image</span>
              )}
            </div>

            {/* Simple per-child navigation controls (optional) */}
            <div className="absolute bottom-1 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
              <button
                className="px-2 py-1 bg-[#44444E] rounded text-xs hover:bg-[#555]"
                onClick={(e) => {
                  e.stopPropagation();
                  const next =
                    (child.currentIndex - 1 + child.imageList.length) %
                    child.imageList.length;
                  setCurrentIndex(child.id, next);
                }}
              >
                ◀
              </button>
              <button
                className="px-2 py-1 bg-[#44444E] rounded text-xs hover:bg-[#555]"
                onClick={(e) => {
                  e.stopPropagation();
                  const next =
                    (child.currentIndex + 1) % child.imageList.length;
                  setCurrentIndex(child.id, next);
                }}
              >
                ▶
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// --- SlotCanvas component -------------------------------------------------
type SlotCanvasProps = {
  rawPath: string;
  slotId: string;
};

// Shared worker singleton so multiple slots can reuse the same decoder worker
const getSharedWorker = (() => {
  let w: Worker | null = null;
  return () => {
    if (!w) w = new ImageWorker();
    return w!;
  };
})();

const SlotCanvas: React.FC<SlotCanvasProps> = ({ rawPath, slotId }) => {
  const [imgData, setImgData] = useState<ImageData | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const worker = getSharedWorker();
    const handler = (e: MessageEvent) => {
      const data = e.data as { img?: ImageData; slotId?: string };
      if (data && data.slotId === slotId && data.img) setImgData(data.img);
    };
    worker.addEventListener("message", handler);
    return () => worker.removeEventListener("message", handler);
  }, [slotId]);

  useEffect(() => {
    const worker = getSharedWorker();
    let cancelled = false;
    const fileUrl = convertFileSrc(rawPath);
    readFile(fileUrl)
      .then((content) => {
        if (cancelled) return;
        worker.postMessage({ content, slotId });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [rawPath, slotId]);

  return (
    <ImageCanvas
      image={imgData}
      className="max-w-full max-h-full"
      onInitCanvas={(c) => (canvasRef.current = c)}
    />
  );
};

export default ComparisonView;
