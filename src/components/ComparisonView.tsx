import React from "react";
import { useTabStore, isComparisonTab } from "../store";
import SlotCanvas from "./SlotCanvas";

type ComparisonViewProps = {
  tabId: string;
};

const ComparisonView: React.FC<ComparisonViewProps> = ({ tabId }) => {
  const tab = useTabStore((s) => s.tabs.get(tabId) ?? null);
  const setActiveSlotIndex = useTabStore((s) => s.setActiveSlotIndex);
  const setCurrentIndex = useTabStore((s) => s.setCurrentIndex);

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
        const child = children.get(cid)!;
        const file = child.imageList[child.currentIndex];
        return (
          <div
            key={child.id}
            className={`relative group rounded-md overflow-hidden flex flex-col bg-[#2F2E33] ${
              n <= 3 ? "flex-1" : "w-full h-full"
            } ${
              activeSlotIndex === idx
                ? "outline-2 outline-[#715A5A]"
                : "outline-1 outline-transparent"
            }`}
            onClick={() => setActiveSlotIndex(tab.id, idx)}
          >
            <div className="text-xs px-2 py-1 bg-[#44444E] text-[#D3DAD9] flex items-center gap-2">
              <span className="truncate" title={file}>
                {file ? file.split("/").pop() : "(empty)"}
              </span>
              <span className="opacity-60">
                {child.currentIndex + 1}/{child.imageList.length}
              </span>
            </div>

            {/* Canvas-based image rendering (matches SingleTab canvas behavior) */}
            <div className="flex-1 flex items-center justify-center">
              {file ? (
                <SlotCanvas key={child.id} rawPath={file} />
              ) : (
                <span className="text-[#888]">No Image</span>
              )}
            </div>

            {/* Simple per-child navigation controls (optional) */}
            <div className="absolute bottom-1 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
              <button
                className="px-2 py-1 bg-[#44444E] rounded text-xs hover:bg-[#555]"
                onClick={(e) => {
                  e.stopPropagation();
                  const next =
                    (child.currentIndex - 1 + child.imageList.length) %
                    child.imageList.length;
                  setCurrentIndex(child.id, next);
                }}
              >
                ◀
              </button>
              <button
                className="px-2 py-1 bg-[#44444E] rounded text-xs hover:bg-[#555]"
                onClick={(e) => {
                  e.stopPropagation();
                  const next =
                    (child.currentIndex + 1) % child.imageList.length;
                  setCurrentIndex(child.id, next);
                }}
              >
                ▶
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ComparisonView;
