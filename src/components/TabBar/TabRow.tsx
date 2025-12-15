import type { ComparisonTabState, SingleTabState } from "../../store";

export type TabRowProps = {
  isComp: boolean;
  expanded: boolean;
  label: string;
  tabId: string;
  activeTabId: string | null;
  tabOrder: string[];
  singleTab: SingleTabState | null;
  comparisonTab: ComparisonTabState | null;
  toggleExpanded: (tabId: string) => void;
  removeSingleTab: (tabId: string) => void;
  detachAllChildren: (tabId: string) => void;
  setSelectedIDs: React.Dispatch<React.SetStateAction<Set<string>>>;
  setActiveTab: (tabId: string) => void;
};

const TabRow = ({
  isComp,
  expanded,
  label,
  tabId,
  activeTabId,
  tabOrder,
  singleTab,
  comparisonTab,
  toggleExpanded,
  removeSingleTab,
  detachAllChildren,
  setSelectedIDs,
  setActiveTab,
}: TabRowProps) => {
  return (
    <>
      {isComp && (
        <button
          className="text-xs px-1 py-0.5 rounded hover:bg-[#555]"
          onClick={(e) => {
            e.stopPropagation();
            toggleExpanded(tabId);
          }}
          aria-label={expanded ? "Collapse comparison" : "Expand comparison"}
          type="button"
        >
          {expanded ? "▼" : "▶"}
        </button>
      )}
      {!isComp && <span className="text-xs opacity-50">•</span>}
      <div className="flex-1 min-w-0">
        <span className="block truncate" title={label}>
          {label}
        </span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          let nextTabId: string | null = null;
          if (activeTabId === tabId) {
            const currentIndex = tabOrder.indexOf(tabId);
            nextTabId =
              tabOrder[Math.min(tabOrder.length - 1, currentIndex + 1)];
          }
          if (singleTab) {
            removeSingleTab(tabId);
          } else if (comparisonTab) {
            detachAllChildren(tabId);
          }
          setSelectedIDs((prev) => {
            if (!prev.has(tabId)) return prev;
            const n = new Set(prev);
            n.delete(tabId);
            return n;
          });
          if (nextTabId) setActiveTab(nextTabId);
        }}
        aria-label={`Close ${label}`}
        className="ml-1 text-[#D3DAD9] hover:text-white hover:bg-[#37353E] px-1 rounded-lg"
        type="button"
      >
        ✕
      </button>
    </>
  );
};

export default TabRow;
