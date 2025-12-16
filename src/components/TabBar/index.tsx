import { useRef, useState } from "react";
import { useStore } from "zustand";
import useTabHotkeysUndoRedo from "../../hooks/useTabHotkeysUndoRedo";
import useTabMove from "../../hooks/useTabMove";
import useTabSelection from "../../hooks/useTabSelection";
import { useTabStore } from "../../store";
import ComparisonChildList from "./ComparisonChildList";
import TabContextMenu from "./TabContextMenu";
import TabItem from "./TabItem";

const TabBar = () => {
  const tabBarRef = useRef<HTMLDivElement | null>(null);
  const singleTabs = useTabStore((s) => s.singleTabs);
  const comparisonTabs = useTabStore((s) => s.comparisonTabs);
  const tabOrder = useTabStore((s) => s.tabOrder);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const setActiveSlotIndex = useTabStore((s) => s.setActiveSlotIndex);

  const undo = useStore(useTabStore.temporal, (s) => s.undo);
  const redo = useStore(useTabStore.temporal, (s) => s.redo);
  const pastStates = useStore(useTabStore.temporal, (s) => s.pastStates);
  const futureStates = useStore(useTabStore.temporal, (s) => s.futureStates);
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
            const active = tabId === activeTabId;
            const expanded = isComp && expandedComparisonIds.has(tabId);
            return (
              <div key={tabId} className="flex flex-col gap-1">
                <TabItem
                  tabId={tabId}
                  index={idx}
                  tabMove={tabMove}
                  selectedIDs={selectedIDs}
                  isComp={isComp}
                  active={active}
                  expanded={expanded}
                  toggleSelect={toggleSelect}
                  setMenuOpenFor={setMenuOpenFor}
                  setMenuPos={setMenuPos}
                  toggleExpanded={toggleExpanded}
                  setSelectedIDs={setSelectedIDs}
                />
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
