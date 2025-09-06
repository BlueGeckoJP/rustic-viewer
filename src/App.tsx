import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef } from "react";
import { isComparisonTab, useTabStore } from "./store";
import TabBar from "./components/TabBar";
import ComparisonView from "./components/ComparisonView";
import SingleView from "./components/SingleView";

// Main App component: manages tab state, image loading, canvas rendering, and Tauri events
export default function App() {
  const didAddListeners = useRef(false);
  // Exposed by SingleView to allow Tauri events to open images
  const openImageRef = useRef<(rawPath: string) => void>(() => {});
  const addTab = useTabStore((s) => s.addSingleTab); // still needed for new-tab event
  const activeTabId = useTabStore((s) => s.activeTabId);
  const activeTab = useTabStore((s) =>
    activeTabId ? s.tabs.find((t) => t.id === activeTabId) : null
  );
  // SingleView owns image state & navigation now.

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
  }, [addTab]);

  // Arrow key navigation handled inside SingleView

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#27262B] text-[#D3DAD9]">
      <TabBar />
      <div className="h-full relative">
        {activeTab && activeTab.type === "single" && (
          <SingleView openImageRef={openImageRef} />
        )}

        {activeTab && isComparisonTab(activeTab) && (
          <ComparisonView tabId={activeTab.id} />
        )}
      </div>
    </div>
  );
}
