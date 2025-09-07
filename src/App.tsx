import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef } from "react";
import { isComparisonTab, isSingleTab, SingleTab, useTabStore } from "./store";
import TabBar from "./components/TabBar";
import ComparisonView from "./components/ComparisonView";
import SingleView from "./components/SingleView";
import { readDir } from "@tauri-apps/plugin-fs";

const imageFileRegex = /\.(png|jpg|jpeg|gif|bmp|webp)$/i;

// Main App component: manages tab state, image loading, canvas rendering, and Tauri events
export default function App() {
  const didAddListeners = useRef(false);
  // Exposed by SingleView to allow Tauri events to open images
  // As a countermeasure for the issue where all internal conditional branches become null when using the old openImage
  const openImageRef = useRef<(rawPath: string) => void>(() => {});
  const addTab = useTabStore((s) => s.addSingleTab); // still needed for new-tab event
  const activeTabId = useTabStore((s) => s.activeTabId);
  const activeTab = useTabStore((s) =>
    activeTabId ? s.tabs.find((t) => t.id === activeTabId) : null
  );
  const addSingleTab = useTabStore((s) => s.addSingleTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const updateSingleTab = useTabStore((s) => s.updateSingleTab);
  const updateComparisonChildren = useTabStore(
    (s) => s.updateComparisonChildren
  );

  const openImage = useCallback(
    (rawPath: string) => {
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
            })
          );
        const idx = files.findIndex((p) => p === rawPath);

        if (!activeTab) {
          const id = addTab(dir, files, idx >= 0 ? idx : 0);
          // Ensure this new tab becomes active (addTab already sets active but explicit for clarity)
          setActiveTab(id);
        } else if (isSingleTab(activeTab)) {
          updateSingleTab(activeTab.id, {
            directory: dir,
            imageList: files,
            currentIndex: idx >= 0 ? idx : 0,
          });
        } else if (isComparisonTab(activeTab)) {
          const oldChild = activeTab.children[activeTab.activeSlotIndex];
          const modified: SingleTab = {
            ...oldChild,
            directory: dir,
            imageList: files,
            currentIndex: idx >= 0 ? idx : 0,
          };
          const newChildren = [...activeTab.children];
          newChildren[activeTab.activeSlotIndex] = modified;
          //updateSingleTab(oldChild.id, modified); // Update the moved child's data
          updateComparisonChildren(activeTab.id, newChildren);
        }
      });
    },
    [
      activeTab,
      addSingleTab,
      setActiveTab,
      updateSingleTab,
      updateComparisonChildren,
    ]
  );

  // Expose openImage through ref for parent (App) to call from Tauri events
  useEffect(() => {
    openImageRef.current = openImage;
  }, [openImageRef, openImage]);

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
        {activeTab && activeTab.type === "single" && <SingleView />}

        {activeTab && isComparisonTab(activeTab) && (
          <ComparisonView tabId={activeTab.id} />
        )}
      </div>
    </div>
  );
}
