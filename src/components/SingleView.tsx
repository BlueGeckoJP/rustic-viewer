import type React from "react";
import { useEffect, useRef, useState } from "react";
import { isSingleTab, useTabStore } from "../store";
import loadImage from "../utils/imageLoader";
import ImageCanvas from "./ImageCanvas";

/**
 * SingleView: handles all logic & UI for displaying a single image tab.
 * Extracted from App.tsx to keep App lean.
 *
 * Responsibilities:
 *  - Manage current decoded image + loading state
 *  - Directory listing & image sequence management
 *  - Arrow key navigation between images
 *  - High DPI canvas rendering via ImageCanvas
 *  - Expose openImage(rawPath) through provided ref for external triggers (e.g., Tauri events)
 */
export type SingleViewProps = unknown;

const SingleView: React.FC<SingleViewProps> = (_props: SingleViewProps) => {
  // Store selectors
  const activeTabId = useTabStore((s) => s.activeTabId);
  const singleTab = useTabStore((s) =>
    s.activeTabId ? s.getSingleTab(s.activeTabId) : null,
  );
  const setCurrentIndex = useTabStore((s) => s.setCurrentIndex);
  const activeTab = useTabStore((s) =>
    activeTabId ? (s.tabs.get(activeTabId) ?? null) : null,
  );
  const [rawPath, setRawPath] = useState<string>("");

  // Local view state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [currentImage, setCurrentImage] = useState<ImageBitmap | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    // Slight delay to avoid flicker on fast loads
    setTimeout(() => {
      if (alive) setIsLoading(true);
    }, 100);
    loadImage(rawPath)
      .then((img) => {
        if (alive) {
          setCurrentImage(img ?? null);
          setFileName(rawPath);
        }
      })
      .catch((e) => {
        console.error("Failed to load image:", e);
        if (alive) {
          setCurrentImage(null);
          setFileName(null);
        }
      })
      .finally(() => {
        if (alive) {
          setIsLoading(false);
          alive = false;
        }
      });
    return () => {
      alive = false;
    };
  }, [rawPath]);

  // When active single tab changes, load its current image
  useEffect(() => {
    if (
      !singleTab ||
      !singleTab.directory ||
      singleTab.imageList.length === 0
    ) {
      setCurrentImage(null);
      setFileName(null);
      return;
    }
    const path = singleTab.imageList[singleTab.currentIndex];
    setRawPath(path);
  }, [singleTab]);

  // Arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!singleTab) return;
      const { imageList, currentIndex } = singleTab;
      if (imageList.length === 0) return;
      if (e.key === "ArrowRight") {
        const next = (currentIndex + 1) % imageList.length;
        setCurrentIndex(singleTab.id, next);
        setRawPath(imageList[next]);
      } else if (e.key === "ArrowLeft") {
        const prev = (currentIndex - 1 + imageList.length) % imageList.length;
        setCurrentIndex(singleTab.id, prev);
        setRawPath(imageList[prev]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [singleTab, setCurrentIndex]);

  // Render nothing if the active tab is not a single tab
  if (!activeTab || !isSingleTab(activeTab)) return null;

  return (
    <div className="group relative overflow-hidden flex flex-col bg-[#2F2E33] h-full w-full">
      <div className="text-xs bg-[#44444E] text-[#D3DAD9] flex items-center gap-2 h-6">
        <span className="truncate mx-2" title={fileName ? fileName : "(empty)"}>
          {fileName ? fileName.split("/").pop() : "(empty)"}
        </span>
        <span className="opacity-60">
          {activeTab.imageList.length <= 0
            ? "No Images"
            : `${activeTab.currentIndex + 1}/${activeTab.imageList.length}`}
        </span>

        {/* Loading overlay */}
        <div
          className={`ml-auto bg-[#715A5A] px-2 h-full flex items-center justify-center transition-opacity duration-300 ${isLoading ? "animate-loading-overlay-fade-in" : "animate-loading-overlay-fade-out pointer-events-none"}`}
        >
          <div className="flex justify-between items-center gap-3">
            {/* Loading pulse indicator */}
            <div className="relative">
              <div className="w-3 h-3 bg-[#D3DAD9] rounded-full animate-pulse"></div>
              <div className="absolute top-0 left-0 w-3 h-3 bg-[#D3DAD9] rounded-full animate-ping opacity-75"></div>
            </div>
            <div className="flex">
              <span className="text-[#D3DAD9] text-sm font-medium">
                Loading...
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        {currentImage ? (
          <ImageCanvas
            image={currentImage}
            className="w-screen h-screen max-w-screen max-h-[calc(100vh-24px)]"
            onInitCanvas={(c) => {
              canvasRef.current = c;
            }}
          />
        ) : (
          <span className="text-[#888]">No Image</span>
        )}

        {/* Simple per-child navigation controls (optional) */}
        <div className="absolute bottom-1 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button
            className="px-2 py-1 bg-[#44444E] rounded text-xs hover:bg-[#555]"
            onClick={(e) => {
              e.stopPropagation();
              const next =
                (activeTab.currentIndex - 1 + activeTab.imageList.length) %
                activeTab.imageList.length;
              setCurrentIndex(activeTab.id, next);
            }}
            type="button"
          >
            ◀
          </button>
          <button
            className="px-2 py-1 bg-[#44444E] rounded text-xs hover:bg-[#555]"
            onClick={(e) => {
              e.stopPropagation();
              const next =
                (activeTab.currentIndex + 1) % activeTab.imageList.length;
              setCurrentIndex(activeTab.id, next);
            }}
            type="button"
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
};

export default SingleView;
