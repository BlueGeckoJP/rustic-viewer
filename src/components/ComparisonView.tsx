import React, { useEffect, useRef, useCallback, useState } from "react";
import { useTabStore, isComparisonTab } from "../store";
import ImageWorker from "../imageWorker.ts?worker";
import { convertFileSrc } from "@tauri-apps/api/core";
import { readFile } from "@tauri-apps/plugin-fs";

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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [imgData, setImgData] = useState<ImageData | null>(null);

  // Listen for worker messages targeting this slotId
  useEffect(() => {
    const worker = getSharedWorker();
    const handler = (e: MessageEvent) => {
      const data = e.data as { img?: ImageData; slotId?: string };
      if (data && data.slotId === slotId && data.img) {
        setImgData(data.img);
      }
    };
    worker.addEventListener("message", handler);
    return () => worker.removeEventListener("message", handler);
  }, [slotId]);

  // Load file bytes and ask worker to decode (include slotId so responses are routed)
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

  // Draw ImageData onto the canvas with aspect-fit (contain) behavior
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = imgData;
    if (!img) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // compute draw rect in CSS pixels (canvas is already sized to DPR-scaled pixels)
    const rect = canvas.getBoundingClientRect();
    const cssW = rect.width;
    const cssH = rect.height;

    const imgRatio = img.width / img.height;
    const canvasRatio = cssW / cssH;
    let drawWidth, drawHeight, offsetX, offsetY;

    if (imgRatio > canvasRatio) {
      drawWidth = cssW;
      drawHeight = cssW / imgRatio;
      offsetX = 0;
      offsetY = (cssH - drawHeight) / 2;
    } else {
      drawHeight = cssH;
      drawWidth = cssH * imgRatio;
      offsetX = (cssW - drawWidth) / 2;
      offsetY = 0;
    }

    // Convert ImageData -> Image source via offscreen canvas
    const srcCanvas = document.createElement("canvas");
    srcCanvas.width = img.width;
    srcCanvas.height = img.height;
    const srcCtx = srcCanvas.getContext("2d");
    if (!srcCtx) return;
    srcCtx.putImageData(img, 0, 0);

    // Clear and draw using CSS-space coordinates; since the canvas context is scaled for DPR,
    // drawing with CSS-space coordinates works because we set ctx.scale when resizing.
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
      srcCanvas,
      0,
      0,
      img.width,
      img.height,
      offsetX,
      offsetY,
      drawWidth,
      drawHeight
    );
  }, [imgData]);

  // Sync canvas pixel size with display size (DPR aware) and redraw on resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const wantedWidth = Math.round(rect.width * dpr);
      const wantedHeight = Math.round(rect.height * dpr);
      if (canvas.width !== wantedWidth || canvas.height !== wantedHeight) {
        canvas.width = wantedWidth;
        canvas.height = wantedHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.scale(dpr, dpr);
        }
      }
      draw();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [draw]);

  // Redraw when image data changes
  useEffect(() => {
    draw();
  }, [imgData, draw]);

  return (
    <canvas
      ref={canvasRef}
      className="max-w-full max-h-full"
      style={{ width: "100%", height: "100%" }}
    />
  );
};

export default ComparisonView;
