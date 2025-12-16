import { useRef, useState } from "react";
import useTabHotkeysUndoRedo from "../../hooks/useTabHotkeysUndoRedo";
import useTabMove from "../../hooks/useTabMove";
import useTabSelection from "../../hooks/useTabSelection";
import { useTabStore } from "../../store";
import { getLabel } from "../../utils/tabHelpers";
import ComparisonChildList from "./ComparisonChildList";
import TabContextMenu from "./TabContextMenu";
import TabRow from "./TabRow";

const TabBar = () => {
  const tabBarRef = useRef<HTMLDivElement | null>(null);
  const singleTabs = useTabStore((s) => s.singleTabs);
  const comparisonTabs = useTabStore((s) => s.comparisonTabs);
  const tabOrder = useTabStore((s) => s.tabOrder);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const setActiveTab = useTabStore((s) => s.setActiveTab);

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
                  <TabRow
                    isComp={isComp}
                    expanded={expanded}
                    label={label}
                    tabId={tabId}
                    toggleExpanded={toggleExpanded}
                    setSelectedIDs={setSelectedIDs}
                  />
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
