import { emit, listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef } from "react";
import ComparisonView from "./components/ComparisonView";
import SingleView from "./components/SingleView";
import TabBar from "./components/TabBar";
import { useTabStore } from "./store";
import { determineDirectory, getSortedImageFiles } from "./utils/fileUtils";

// Main App component: manages tab state, image loading, canvas rendering, and Tauri events
export default function App() {
  const didAddListeners = useRef(false);
  // Exposed by SingleView to allow Tauri events to open images
  // As a countermeasure for the issue where all internal conditional branches become null when using the old openImage
  const openImageRef = useRef<(rawPath: string, newTab?: boolean) => void>(
    () => {},
  );
  const updateImageListRef = useRef<(tabId: string) => void>(() => {});
  const rebuiltRef = useRef<Set<string>>(new Set());
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
      const dir = determineDirectory(rawPath);

      getSortedImageFiles(dir).then((files) => {
        const idx = files.indexOf(rawPath);

        if (!activeTab || newTab) {
          const id = addSingleTab(files, idx >= 0 ? idx : 0, dir);
          // Ensure this new tab becomes active (addTab already sets active but explicit for clarity)
          setActiveTab(id);
        } else {
          const singleTab = singleTabs[activeTabId];
          const comparisonTab = comparisonTabs[activeTabId];

          const targetTabId =
            singleTab?.id ??
            comparisonTab?.children[comparisonTab.activeSlotIndex];

          if (targetTabId)
            updateSingleTab(targetTabId, {
              directory: dir,
              imageList: files,
              currentIndex: idx >= 0 ? idx : 0,
            });
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

  const updateImageList = useCallback(
    (tabId: string) => {
      const tab = singleTabs[tabId];
      if (!tab || !tab.directory) return;

      getSortedImageFiles(tab.directory).then((files) => {
        updateSingleTab(tab.id, {
          imageList: files,
        });
      });
    },
    [singleTabs, updateSingleTab],
  );

  // Expose openImage through ref for parent (App) to call from Tauri events
  useEffect(() => {
    openImageRef.current = openImage;
    updateImageListRef.current = updateImageList;
  }, [openImage, updateImageList]);

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

  useEffect(() => {
    for (const tab of Object.values(singleTabs)) {
      if (!tab.directory) continue;
      if (rebuiltRef.current.has(tab.id)) continue;
      if (tab.imageList.length > 0) continue;

      rebuiltRef.current.add(tab.id);

      updateImageListRef.current(tab.id);
    }
  }, [singleTabs]);

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
