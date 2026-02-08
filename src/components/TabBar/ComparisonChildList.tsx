import type { ComparisonTabState, SingleTabState } from "../../store/tabStoreState";

export type ComparisonChildListProps = {
  isComp: boolean;
  expanded: boolean;
  comparisonTab: ComparisonTabState;
  singleTabs: Record<string, SingleTabState>;
  active: boolean;
  tabId: string;
  setActiveTab: (tabId: string) => void;
  setActiveSlotIndex: (tabId: string, slotIndex: number) => void;
  setMenuOpenFor: (id: string | null) => void;
  setMenuPos: (pos: { x: number; y: number } | null) => void;
};

const CHILD_PREFIX = "::child::";

const ComparisonChildList = ({
  isComp,
  expanded,
  comparisonTab,
  singleTabs,
  active,
  tabId,
  setActiveTab,
  setActiveSlotIndex,
  setMenuOpenFor,
  setMenuPos,
}: ComparisonChildListProps) => {
  return (
    <>
      {isComp && expanded && comparisonTab && (
        <div className="flex flex-col gap-1 pl-6 pr-1">
          {comparisonTab.children.map((childId, cIdx) => {
            const child = singleTabs[childId];
            if (!child) return null;
            const file = child.imageList[child.currentIndex];
            const childActive =
              active && comparisonTab.activeSlotIndex === cIdx;
            return (
              <button
                key={childId}
                className={`group flex items-center gap-2 text-xs rounded-lg px-2 py-1 cursor-pointer min-w-0 transition-colors ${childActive
                    ? "bg-[#4F4E58] ring-1 ring-[#715A5A]"
                    : "hover:bg-[#44444E]"
                  }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveTab(tabId);
                  setActiveSlotIndex(tabId, cIdx);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpenFor(`${tabId}${CHILD_PREFIX}${childId}`);
                  setMenuPos({ x: e.clientX, y: e.clientY });
                }}
                type="button"
              >
                <span className="truncate flex-1 text-start" title={file}>
                  {file ? file.split("/").pop() : "(empty)"}
                </span>
                <span className="opacity-50 text-[10px]">
                  {child.currentIndex + 1}/{child.imageList.length}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
};

export default ComparisonChildList;
