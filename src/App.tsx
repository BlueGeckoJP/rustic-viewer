import { emit, listen } from "@tauri-apps/api/event";
import { readDir } from "@tauri-apps/plugin-fs";
import { useCallback, useEffect, useRef } from "react";
import ComparisonView from "./components/ComparisonView";
import SingleView from "./components/SingleView";
import TabBar from "./components/TabBar";
import { useTabStore } from "./store";

const imageFileRegex = /\.(png|jpg|jpeg|gif|bmp|webp)$/i;

// Main App component: manages tab state, image loading, canvas rendering, and Tauri events
export default function App() {
  const didAddListeners = useRef(false);
  // Exposed by SingleView to allow Tauri events to open images
  // As a countermeasure for the issue where all internal conditional branches become null when using the old openImage
  const openImageRef = useRef<(rawPath: string, newTab?: boolean) => void>(
    () => {},
  );
  const activeTabId = useTabStore((s) => s.activeTabId);
  const singleTabs = useTabStore((s) => s.singleTabs);
  const comparisonTabs = useTabStore((s) => s.comparisonTabs);
  const activeTab =
    singleTabs[activeTabId] || comparisonTabs[activeTabId] || null;
  const addSingleTab = useTabStore((s) => s.addSingleTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const updateSingleTab = useTabStore((s) => s.updateSingleTab);

  const openImage = useCallback(
    (rawPath: string, newTab: boolean = false) => {
      // Determine directory
      const lastSlash = rawPath.lastIndexOf("/");
      const dir = lastSlash >= 0 ? rawPath.substring(0, lastSlash) : "";

      readDir(dir).then((entries) => {
        const files = entries
          .filter((e) => e.isFile && !!e.name && imageFileRegex.test(e.name))
          .map((e) => `${dir}/${e.name}`)
          .sort((a, b) =>
            a.localeCompare(b, undefined, {
              numeric: true,
              sensitivity: "base",
            }),
          );
        const idx = files.indexOf(rawPath);

        if (!activeTab || newTab) {
          const id = addSingleTab(files, idx >= 0 ? idx : 0, dir);
          // Ensure this new tab becomes active (addTab already sets active but explicit for clarity)
          setActiveTab(id);
        } else {
          const singleTab = singleTabs[activeTabId];
          const comparisonTab = comparisonTabs[activeTabId];

          if (singleTab) {
            updateSingleTab(singleTab.id, {
              directory: dir,
              imageList: files,
              currentIndex: idx >= 0 ? idx : 0,
            });
          } else if (comparisonTab) {
            const childId =
              comparisonTab.children[comparisonTab.activeSlotIndex];
            const child = singleTabs[childId];
            if (!child) return;
            // Update the child tab inside the comparison tab
            updateSingleTab(childId, {
              directory: dir,
              imageList: files,
              currentIndex: idx >= 0 ? idx : 0,
            });
          }
        }
      });
    },
    [
      activeTab,
      activeTabId,
      singleTabs,
      comparisonTabs,
      addSingleTab,
      setActiveTab,
      updateSingleTab,
    ],
  );

  // Expose openImage through ref for parent (App) to call from Tauri events
  useEffect(() => {
    openImageRef.current = openImage;
  }, [openImage]);

  // Add Tauri event listeners for 'open-image' and 'new-tab' events
  useEffect(() => {
    if (didAddListeners.current) return;
    didAddListeners.current = true;

    const unlisteners: Array<() => void> = [];

    (async () => {
      const openImageListener = await listen("open-image", (event) => {
        console.log("Received open-image event:", event.payload);
        const rawPath =
          typeof event.payload === "string"
            ? event.payload
            : String(event.payload);

        openImageRef.current(rawPath);
      });

      const openImageNewTabListener = await listen(
        "open-image-new-tab",
        (event) => {
          console.log("Received open-image-new-tab event:", event.payload);
          const rawPath =
            typeof event.payload === "string"
              ? event.payload
              : String(event.payload);

          openImageRef.current(rawPath, true);
        },
      );

      const newTabListener = await listen("new-tab", (event) => {
        console.log("Received new-tab event:", event.payload);

        addSingleTab([], 0, null);
      });

      unlisteners.push(
        openImageListener,
        newTabListener,
        openImageNewTabListener,
      );
      await emit("frontend-ready", null); // Notify backend that frontend is ready
    })();

    return () => {
      unlisteners.forEach((fn) => {
        fn();
      });
    };
  }, [addSingleTab]);

  // Arrow key navigation handled inside SingleView

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#27262B] text-[#D3DAD9]">
      <TabBar />
      <div className="h-full relative">
        {activeTab && singleTabs[activeTabId] && <SingleView />}

        {activeTab && comparisonTabs[activeTabId] && (
          <ComparisonView tabId={activeTabId} />
        )}
      </div>
    </div>
  );
}
