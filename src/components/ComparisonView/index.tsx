import type React from "react";
import { useMemo } from "react";
import useViewHotkeys from "../../hooks/useViewHotkeys";
import { useTabStore } from "../../store";
import { getComparisonLayoutClass } from "../../utils/layoutUtils";
import SlotComponent from "./SlotComponent";

type ComparisonViewProps = {
  tabId: string;
};

export const ComparisonView: React.FC<ComparisonViewProps> = ({ tabId }) => {
  const tab = useTabStore((s) => s.comparisonTabs[tabId] || null);
  const singleTabs = useTabStore((s) => s.singleTabs);
  const setActiveSlotIndex = useTabStore((s) => s.setActiveSlotIndex);

  // Arrow key navigation and keyboard shortcuts for active slot
  const children = tab?.children ?? [];
  const activeSlotIndex = tab?.activeSlotIndex ?? 0;
  const activeChildId = children[activeSlotIndex];
  const activeChild = activeChildId ? singleTabs[activeChildId] : null;
  useViewHotkeys({ singleTab: activeChild });

  const n = children.length;

  // Basic layout rules (auto by number of children)
  const containerClass = useMemo(() => getComparisonLayoutClass(n), [n]);

  if (!tab) return null;

  return (
    <div className={`p-2 box-border w-full h-full ${containerClass}`}>
      {children.map((cid, idx) => {
        const child = singleTabs[cid];
        if (!child) return null;
        return (
          // biome-ignore lint/a11y/useSemanticElements: Cannot use <button> as it would create nested buttons (ViewerControls contains buttons)
          <div
            key={child.id}
            className={`relative group rounded-md overflow-hidden flex flex-col bg-[#2F2E33] hover:[&>div:last-child]:opacity-100 ${
              n <= 3 ? "flex-1" : "w-full h-full"
            } ${
              activeSlotIndex === idx
                ? "outline-2 outline-[#715A5A]"
                : "outline-1 outline-transparent"
            }`}
            onClick={() => setActiveSlotIndex(tab.id, idx)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setActiveSlotIndex(tab.id, idx);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <SlotComponent tabId={tab.id} childId={child.id} />
          </div>
        );
      })}
    </div>
  );
};

export default ComparisonView;
