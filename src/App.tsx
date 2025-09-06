import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import { readDir } from "@tauri-apps/plugin-fs";
import { decodeImageFromPath } from "./utils/imageDecoder";
import { isComparisonTab, isSingleTab, useTabStore } from "./store";
import TabBar from "./components/TabBar";
import ComparisonView from "./components/ComparisonView";
import ImageCanvas from "./components/ImageCanvas";

// Main App component: manages tab state, image loading, canvas rendering, and Tauri events
export default function App() {
  const didAddListeners = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Ref to store the function for opening images
  // Reason: prevent the tab from being null-checked inside the function when using the old function
  const openImageRef = useRef<(rawPath: string) => void>(() => {});

  const tab = useTabStore((s) => {
    const id = s.activeTabId;
    return id ? s.getSingleTab(id) : null;
  });
  const addTab = useTabStore((s) => s.addSingleTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const updateTab = useTabStore((s) => s.updateSingleTab);
  const setCurrentIndex = useTabStore((s) => s.setCurrentIndex);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const activeTab = useTabStore((s) =>
    activeTabId ? s.tabs.find((t) => t.id === activeTabId) : null
  );

  const [currentImage, setCurrentImage] = useState<ImageData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // Shared decoder worker (see utils/imageDecoder) removes need for local worker ref

  useEffect(() => {
    // When active tab changes, load the corresponding image or clear the canvas
    console.log("Active tab changed:", activeTabId);
    if (!tab || tab.directory === "" || tab.imageList.length === 0) {
      setCurrentImage(null);
      drawCurrentImage();
      return;
    }
    openImage(tab.imageList[tab.currentIndex]);
  }, [activeTabId]);

  // Draw function now delegated to ImageCanvas component. Keep a wrapper for resize usage.
  const drawCurrentImage = useCallback(() => {
    // ImageCanvas handles drawing when image changes & on resize; nothing needed here.
    // This function remains to satisfy existing effect dependencies.
  }, []);

  // Load image content from filesystem and post it to the worker for decoding
  const loadImageByPath = useCallback((rawPath: string) => {
    setIsLoading(true);
    decodeImageFromPath(rawPath)
      .then((img) => {
        setCurrentImage(img);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Open an image: update or create a tab, list images, and start loading
  const openImage = useCallback(
    (rawPath: string) => {
      // List all images in the same directory
      const dir = rawPath.substring(0, rawPath.lastIndexOf("/"));
      readDir(dir).then((entries) => {
        const files = entries
          .filter(
            (e) => e.isFile && e.name.match(/\.(png|jpg|jpeg|gif|bmp|webp)$/i)
          )
          .map((e) => `${dir}/${e.name}`)
          .sort((a, b) =>
            a.localeCompare(b, undefined, {
              numeric: true,
              sensitivity: "base",
            })
          );
        const idx = files.findIndex((p) => p === rawPath);

        if (!tab) {
          const id = addTab(dir, files, idx >= 0 ? idx : 0);
          setActiveTab(id);
        } else {
          updateTab(tab.id, {
            directory: dir,
            imageList: files,
            currentIndex: idx >= 0 ? idx : 0,
          });
        }
      });
      // Load and display the selected image
      loadImageByPath(rawPath);
    },
    [tab, addTab, setActiveTab, updateTab, loadImageByPath]
  );

  useEffect(() => {
    openImageRef.current = openImage;
  }, [openImage]);

  // Local worker initialization no longer needed (handled in shared utility)
  useEffect(() => {}, []);

  // Sync canvas resolution with display size to handle high-DPI devices
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
        drawCurrentImage();
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [drawCurrentImage]);

  // ImageCanvas handles redraw internally; effect retained for dependency consistency (no-op).
  useEffect(() => {
    drawCurrentImage();
  }, [currentImage, drawCurrentImage]);

  // Add Tauri event listeners for 'open-image' and 'new-tab' events
  useEffect(() => {
    if (didAddListeners.current) return;

    const unlisteners: Array<() => void> = [];

    listen("open-image", (event) => {
      console.log("Received open-image event:", event.payload);
      const rawPath =
        typeof event.payload === "string"
          ? event.payload
          : String(event.payload);

      openImageRef.current(rawPath);
    }).then((fn) => {
      unlisteners.push(fn);
    });

    listen("new-tab", (event) => {
      console.log("Received new-tab event:", event.payload);

      addTab(null, [], 0);
    }).then((fn) => {
      unlisteners.push(fn);
    });

    didAddListeners.current = true;

    return () => {
      unlisteners.forEach((fn) => fn());
    };
  }, [loadImageByPath, addTab]);

  // Handle arrow key navigation to switch between images in the tab
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!tab) return;
      const { imageList, currentIndex } = tab;

      if (imageList.length === 0) return;
      if (e.key === "ArrowRight") {
        const next = (currentIndex + 1) % imageList.length;
        setCurrentIndex(tab.id, next);
        loadImageByPath(imageList[next]);
      } else if (e.key === "ArrowLeft") {
        const prev = (currentIndex - 1 + imageList.length) % imageList.length;
        setCurrentIndex(tab.id, prev);
        loadImageByPath(imageList[prev]);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tab?.imageList, tab?.currentIndex, loadImageByPath]);

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#27262B] text-[#D3DAD9]">
      <TabBar />
      <div className="h-full relative">
        {activeTab && isSingleTab(activeTab) && (
          <div className="w-full h-full flex items-center justify-center">
            <ImageCanvas
              image={currentImage}
              className="w-screen h-screen"
              onInitCanvas={(c) => (canvasRef.current = c)}
            />
            {isLoading && (
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded">
                Loading...
              </div>
            )}
            {(tab?.imageList.length ?? 0) > 0 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded">
                {`[${(tab?.currentIndex ?? -1) + 1}/${tab?.imageList.length}]`}
              </div>
            )}
          </div>
        )}

        {activeTab && isComparisonTab(activeTab) && (
          <ComparisonView tabId={activeTab.id} />
        )}
      </div>
    </div>
  );
}
