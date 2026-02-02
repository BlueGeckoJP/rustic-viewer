import { emit, listen } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";
import { useShallow } from "zustand/shallow";
import ComparisonView from "./components/ComparisonView";
import SingleView from "./components/SingleView";
import TabBar from "./components/TabBar";
import { useTabStore } from "./store";

// Main App component: manages tab state, image loading, canvas rendering, and Tauri events
export default function App() {
  const didAddListeners = useRef(false);
  const rebuiltRef = useRef<Set<string>>(new Set());

  // Optimize re-renders by using a single selector with shallow comparison
  const { activeTabId, singleTabs, comparisonTabs, activeTab } = useTabStore(
    useShallow((s) => ({
      activeTabId: s.activeTabId,
      singleTabs: s.singleTabs,
      comparisonTabs: s.comparisonTabs,
      activeTab:
        s.singleTabs[s.activeTabId] || s.comparisonTabs[s.activeTabId] || null,
    })),
  );

  const addSingleTab = useTabStore((s) => s.addSingleTab);
  const openImage = useTabStore((s) => s.openImage);
  const reloadActiveImage = useTabStore((s) => s.reloadActiveImage);
  const updateImageList = useTabStore((s) => s.updateImageList);

  // Add Tauri event listeners for 'open-image' and 'new-tab' events
  useEffect(() => {
    if (didAddListeners.current) return;
    didAddListeners.current = true;

    const unlisteners: Array<() => void> = [];

    (async () => {
      const [
        openImageListener,
        openImageNewTabListener,
        newTabListener,
        reloadImageListener,
      ] = await Promise.all([
        listen("open-image", (event) => {
          console.log("Received open-image event:", event.payload);
          const rawPath =
            typeof event.payload === "string"
              ? event.payload
              : String(event.payload);

          openImage(rawPath);
        }),
        listen("open-image-new-tab", (event) => {
          console.log("Received open-image-new-tab event:", event.payload);
          const rawPath =
            typeof event.payload === "string"
              ? event.payload
              : String(event.payload);

          openImage(rawPath, true);
        }),
        listen("new-tab", (event) => {
          console.log("Received new-tab event:", event.payload);

          addSingleTab([], 0, null);
        }),
        listen("reload-image", (event) => {
          console.log("Received reload-image event: ", event.payload);
          reloadActiveImage();
        }),
      ]);

      unlisteners.push(
        openImageListener,
        newTabListener,
        openImageNewTabListener,
        reloadImageListener,
      );

      await emit("frontend-ready", null); // Notify backend that frontend is ready
    })();

    return () => {
      unlisteners.forEach((fn) => {
        fn();
      });
    };
  }, [addSingleTab, openImage, reloadActiveImage]);

  useEffect(() => {
    for (const tab of Object.values(singleTabs)) {
      if (!tab.directory) continue;
      if (rebuiltRef.current.has(tab.id)) continue;
      if (tab.imageList.length > 0) continue;

      rebuiltRef.current.add(tab.id);

      updateImageList(tab.id);
    }
  }, [singleTabs, updateImageList]);

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
