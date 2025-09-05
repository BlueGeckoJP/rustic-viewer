import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { readFile, readDir } from "@tauri-apps/plugin-fs";
import ImageWorker from "./imageWorker.ts?worker";
import { useTabStore } from "./store";
import TabBar from "./components/TabBar";

export default function App() {
  const didAddListeners = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const openImageRef = useRef<(rawPath: string) => void>(() => {});

  const tab = useTabStore((s) => {
    const id = s.activeTabId;
    return id ? s.getTab(id) : null;
  });
  const addTab = useTabStore((s) => s.addTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const updateTab = useTabStore((s) => s.updateTab);
  const setCurrentIndex = useTabStore((s) => s.setCurrentIndex);
  const activeTabId = useTabStore((s) => s.activeTabId);

  const [currentImage, setCurrentImage] = useState<ImageData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    console.log("Active tab changed:", activeTabId);
    if (!tab || tab.directory === "" || tab.imageList.length === 0) return;
    openImage(tab.imageList[tab.currentIndex]);
  }, [activeTabId]);

  // Draw the current image on the canvas
  const drawCurrentImage = useCallback(() => {
    const img = currentImage;
    if (!img) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Calculate aspect ratio and resize canvas
    const canvasRatio = canvas.width / canvas.height;
    const imgRatio = img.width / img.height;
    let drawWidth, drawHeight, offsetX, offsetY;

    if (imgRatio > canvasRatio) {
      drawWidth = canvas.width;
      drawHeight = canvas.width / imgRatio;
      offsetX = 0;
      offsetY = (canvas.height - drawHeight) / 2;
    } else {
      drawHeight = canvas.height;
      drawWidth = canvas.height * imgRatio;
      offsetX = (canvas.width - drawWidth) / 2;
      offsetY = 0;
    }

    // Offscreen canvas to convert ImageData to CanvasImageSource
    const srcCanvas = document.createElement("canvas");
    srcCanvas.width = img.width;
    srcCanvas.height = img.height;
    const srcCtx = srcCanvas.getContext("2d");
    if (!srcCtx) return;
    srcCtx.putImageData(img, 0, 0);

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
  }, [currentImage]);

  // Helper to load and decode an image by raw file path
  const loadImageByPath = useCallback((rawPath: string) => {
    if (!workerRef.current) return;
    setIsLoading(true);
    const fileUrl = convertFileSrc(rawPath);
    readFile(fileUrl)
      .then((content) => {
        workerRef.current!.postMessage({ content });
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

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

  // Initialize Web Worker for decoding
  useEffect(() => {
    workerRef.current = new ImageWorker();
    workerRef.current.onmessage = (e: MessageEvent) => {
      setCurrentImage(e.data.img);
      setIsLoading(false);
    };
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Sync canvas size with its displayed size
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

  // Redraw the image whenever it changes
  useEffect(() => {
    drawCurrentImage();
  }, [currentImage, drawCurrentImage]);

  // Add listener for events from Tauri backend
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

  // Key navigation: left/right arrows to switch images
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
    <div className="relative flex items-center justify-center h-screen">
      <canvas className="w-screen h-screen" ref={canvasRef}></canvas>
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
      <TabBar />
    </div>
  );
}
