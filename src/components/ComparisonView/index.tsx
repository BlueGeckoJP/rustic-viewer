import type React from "react";
import { useEffect } from "react";
import { useTabStore } from "../../store";
import SlotComponent from "./SlotComponent";

type ComparisonViewProps = {
  tabId: string;
};

export const ComparisonView: React.FC<ComparisonViewProps> = ({ tabId }) => {
  const tab = useTabStore((s) => s.comparisonTabs[tabId] || null);
  const singleTabs = useTabStore((s) => s.singleTabs);
  const setActiveSlotIndex = useTabStore((s) => s.setActiveSlotIndex);
  const setCurrentIndex = useTabStore((s) => s.setCurrentIndex);
  const resetZoomAndPan = useTabStore((s) => s.resetZoomAndPan);

  // Arrow key navigation and keyboard shortcuts for active slot
  useEffect(() => {
    if (!tab) return;

    const { children, activeSlotIndex } = tab;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeChildId = children[activeSlotIndex];
      const activeChild = singleTabs[activeChildId];

      if (!activeChild || activeChild.imageList.length === 0) return;

      const { imageList, currentIndex } = activeChild;

      if (e.key === "ArrowRight") {
        const next = (currentIndex + 1) % imageList.length;
        setCurrentIndex(activeChild.id, next);
      } else if (e.key === "ArrowLeft") {
        const prev = (currentIndex - 1 + imageList.length) % imageList.length;
        setCurrentIndex(activeChild.id, prev);
      } else if (e.key === "0" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        resetZoomAndPan(activeChild.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tab, setCurrentIndex, resetZoomAndPan, singleTabs]);

  if (!tab) return null;

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
      {children.map((cid, idx) => {
        const child = singleTabs[cid];
        if (!child) return null;
        return (
          <button
            key={child.id}
            className={`relative group rounded-md overflow-hidden flex flex-col bg-[#2F2E33] hover:[&>div:last-child]:opacity-100 ${
              n <= 3 ? "flex-1" : "w-full h-full"
            } ${
              activeSlotIndex === idx
                ? "outline-2 outline-[#715A5A]"
                : "outline-1 outline-transparent"
            }`}
            onClick={() => setActiveSlotIndex(tab.id, idx)}
            type="button"
          >
            <SlotComponent
              rawPath={child.imageList[child.currentIndex] || ""}
              tabId={tab.id}
              childId={child.id}
            />
          </button>
        );
      })}
    </div>
  );
};

export default ComparisonView;
