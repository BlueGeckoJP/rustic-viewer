import { useRef, useState } from "react";
import useTabHotkeysUndoRedo from "../hooks/useTabHotkeysUndoRedo";
import useTabMove from "../hooks/useTabMove";
import useTabSelection from "../hooks/useTabSelection";
import {
  type ComparisonTabState,
  type SingleTabState,
  useTabStore,
} from "../store";
import TabContextMenu from "./TabBar/TabContextMenu";
import ComparisonChildList from "./TabBar/ComparisonChildList";

const TabBar = () => {
  const tabBarRef = useRef<HTMLDivElement | null>(null);
  const singleTabs = useTabStore((s) => s.singleTabs);
  const comparisonTabs = useTabStore((s) => s.comparisonTabs);
  const tabOrder = useTabStore((s) => s.tabOrder);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const removeSingleTab = useTabStore((s) => s.removeSingleTab);
  const setActiveSlotIndex = useTabStore((s) => s.setActiveSlotIndex);
  const detachAllChildren = useTabStore((s) => s.detachAllChildren);

  const { undo, redo, pastStates, futureStates } =
    useTabStore.temporal.getState();
  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;

  const [isOpen, setIsOpen] = useState(true);
  const [expandedComparisonIds, setExpandedComparisonIds] = useState<
    Set<string>
  >(new Set());
  const toggleExpanded = (id: string) => {
    setExpandedComparisonIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };
  const tabMove = useTabMove({ tabBarRef, gap: 8, isOpen });

  useTabHotkeysUndoRedo({ canUndo, canRedo, undo, redo });

  const { selectedIDs, setSelectedIDs, toggleSelect } = useTabSelection({
    tabOrder,
  });

  // Context menu
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  const getLabel = (
    tab: SingleTabState | ComparisonTabState,
    type: "single" | "comparison",
  ) => {
    if (type === "comparison") {
      const compTab = tab as ComparisonTabState;
      return `Compare (${compTab.children.length})`;
    }
    const singleTab = tab as SingleTabState;
    if (singleTab.imageList?.length > 0) {
      const base = singleTab.imageList[singleTab.currentIndex]
        ?.split("/")
        .pop();
      return base || "Untitled";
    }
    return "New Tab";
  };

  return (
    <div
      style={{
        WebkitBackdropFilter: "blur(12px)",
        backdropFilter: "blur(12px)",
      }}
      className={`absolute left-0 flex flex-col text-[#D3DAD9] shadow-md transition-all duration-200 z-20 bg-[#37353E]/88 backdrop-blur-md ${
        isOpen
          ? "top-0 bottom-0 w-64 p-3 space-y-2 overflow-y-auto pr-5"
          : "top-1/2 -translate-y-1/2 h-8 w-4 p-1 rounded-r"
      }`}
      ref={tabBarRef}
    >
      <button
        aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        className="self-end mb-2 text-[#D3DAD9]"
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        {isOpen ? "«" : "»"}
      </button>

      {isOpen && (
        <div
          role="tablist"
          aria-orientation="vertical"
          className="flex flex-col gap-2"
        >
          {tabOrder.map((tabId, idx) => {
            const singleTab = singleTabs[tabId];
            const comparisonTab = comparisonTabs[tabId];
            if (!singleTab && !comparisonTab) return null;
            if (singleTab?.parentId) return null;

            const isComp = !!comparisonTab;
            const tab = isComp ? comparisonTab : singleTab;
            const label = getLabel(tab, isComp ? "comparison" : "single");
            const active = tabId === activeTabId;
            const selected = selectedIDs.has(tabId);
            const expanded = isComp && expandedComparisonIds.has(tabId);
            return (
              <div key={tabId} className="flex flex-col gap-1">
                {/** biome-ignore lint/a11y/useKeyWithClickEvents: Currently only mouse support is available. Key bindings will be added later if needed */}
                <div
                  role="tab"
                  tabIndex={0}
                  aria-selected={active}
                  aria-label={label}
                  onMouseDown={(e) => {
                    toggleSelect(tabId, idx, e);
                    tabMove.onTabMouseDown(e, tabId);
                  }}
                  onClick={(e) => {
                    if (tabMove.draggingId) return;
                    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                    setActiveTab(tabId);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpenFor(tabId);
                    setMenuPos({ x: e.clientX, y: e.clientY });
                  }}
                  className={`flex items-center gap-2 cursor-pointer select-none px-2 py-1 transition-colors duration-150 min-w-0 rounded-xl text-[#D3DAD9] ${
                    active
                      ? "shadow-md bg-[#44444E] ring-2 ring-[#715A5A]"
                      : selected
                        ? "bg-[#44444E]"
                        : "hover:bg-[#44444E]"
                  }`}
                  ref={(el) => tabMove.registerTabRef(tabId, el)}
                >
                  {isComp && (
                    <button
                      className="text-xs px-1 py-0.5 rounded hover:bg-[#555]"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpanded(tabId);
                      }}
                      aria-label={
                        expanded ? "Collapse comparison" : "Expand comparison"
                      }
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
                          tabOrder[
                            Math.min(tabOrder.length - 1, currentIndex + 1)
                          ];
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
                </div>
                <ComparisonChildList
                  isComp={isComp}
                  expanded={expanded}
                  comparisonTab={comparisonTab}
                  singleTabs={singleTabs}
                  active={active}
                  tabId={tabId}
                  setActiveTab={setActiveTab}
                  setActiveSlotIndex={setActiveSlotIndex}
                  setMenuOpenFor={setMenuOpenFor}
                  setMenuPos={setMenuPos}
                />
              </div>
            );
          })}
        </div>
      )}

      <TabContextMenu
        menuOpenFor={menuOpenFor}
        menuPos={menuPos}
        onClose={() => {
          setMenuOpenFor(null);
          setMenuPos(null);
        }}
        expandedComparisonIds={expandedComparisonIds}
        toggleExpanded={toggleExpanded}
        selectedIDs={selectedIDs}
        setSelectedIDs={setSelectedIDs}
      />
    </div>
  );
};

export default TabBar;
