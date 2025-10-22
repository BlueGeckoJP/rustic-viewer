import type React from "react";
import { isComparisonTab, useTabStore } from "../../store";
import SlotComponent from "./SlotComponent";

type ComparisonViewProps = {
  tabId: string;
};

export const ComparisonView: React.FC<ComparisonViewProps> = ({ tabId }) => {
  const tab = useTabStore((s) => s.tabs.get(tabId) ?? null);
  const setActiveSlotIndex = useTabStore((s) => s.setActiveSlotIndex);

  if (!tab || !isComparisonTab(tab)) return null;

  const { children, childrenOrder, activeSlotIndex } = tab;
  const n = childrenOrder.length;

  // Basic layout rules (auto by number of children)
  let containerClass = "";
  if (n === 2) containerClass = "flex flex-row gap-2 h-full";
  else if (n === 3) containerClass = "flex flex-row gap-2 h-full";
  else if (n === 4)
    containerClass = "grid grid-cols-2 grid-rows-2 gap-2 h-full";
  else containerClass = "flex flex-row gap-2 h-full"; // fallback

  return (
    <div className={`p-2 box-border w-full h-full ${containerClass}`}>
      {childrenOrder.map((cid, idx) => {
        const child = children.get(cid);
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
