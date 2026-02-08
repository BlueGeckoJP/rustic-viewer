import {
  faChevronDown,
  faChevronRight,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTabStore } from "../../store/tabStoreState";

export type TabRowProps = {
  isComp: boolean;
  expanded: boolean;
  label: string;
  tabId: string;
  toggleExpanded: (tabId: string) => void;
  setSelectedIDs: React.Dispatch<React.SetStateAction<Set<string>>>;
};

const TabRow = ({
  isComp,
  expanded,
  label,
  tabId,
  toggleExpanded,
  setSelectedIDs,
}: TabRowProps) => {
  const tabOrder = useTabStore((s) => s.tabOrder);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const removeSingleTab = useTabStore((s) => s.removeSingleTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const detachAllChildren = useTabStore((s) => s.detachAllChildren);

  return (
    <>
      {isComp && (
        <button
          className="text-xs px-1 py-0.5 rounded hover:bg-[#555]"
          onClick={(e) => {
            e.stopPropagation();
            toggleExpanded(tabId);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          aria-label={expanded ? "Collapse comparison" : "Expand comparison"}
          type="button"
        >
          {expanded ? (
            <FontAwesomeIcon icon={faChevronDown} />
          ) : (
            <FontAwesomeIcon icon={faChevronRight} />
          )}
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
          if (isComp) detachAllChildren(tabId);
          else removeSingleTab(tabId);

          setSelectedIDs((prev) => {
            if (!prev.has(tabId)) return prev;
            const n = new Set(prev);
            n.delete(tabId);
            return n;
          });
          if (nextTabId) setActiveTab(nextTabId);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        aria-label={`Close ${label}`}
        className="ml-1 text-[#D3DAD9] hover:text-white hover:bg-[#37353E] px-1 rounded-lg"
        type="button"
      >
        <FontAwesomeIcon icon={faXmark} />
      </button>
    </>
  );
};

export default TabRow;
