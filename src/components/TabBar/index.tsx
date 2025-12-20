import { useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import useTabHotkeysUndoRedo from "../../hooks/useTabHotkeysUndoRedo";
import useTabMove from "../../hooks/useTabMove";
import useTabSelection from "../../hooks/useTabSelection";
import { selectVerticalTabs } from "../../selectors/selectVerticalTabs";
import { useTabStore } from "../../store";
import TabContextMenu from "./TabContextMenu";
import TabItem from "./TabItem";

const TabBar = () => {
  const tabBarRef = useRef<HTMLDivElement | null>(null);
  const tabOrder = useTabStore((s) => s.tabOrder);
  const tabStore = useTabStore();

  const undo = useStore(useTabStore.temporal, (s) => s.undo);
  const redo = useStore(useTabStore.temporal, (s) => s.redo);
  const pastStates = useStore(useTabStore.temporal, (s) => s.pastStates);
  const futureStates = useStore(useTabStore.temporal, (s) => s.futureStates);
  const canUndo = pastStates.length > 0;
  const canRedo = futureStates.length > 0;

  const verticalTabs = useMemo(() => selectVerticalTabs(tabStore), [tabStore]);

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

  const tabMove = useTabMove({ tabBarRef, verticalTabs });
  useTabHotkeysUndoRedo({ canUndo, canRedo, undo, redo });
  const { selectedIDs, setSelectedIDs, toggleSelect } = useTabSelection({
    tabOrder,
  });

  const renderItems = useMemo(() => {
    const filtered = verticalTabs.filter((tab) => {
      if (
        tab.kind === "single" &&
        tab.parentId !== null &&
        !expandedComparisonIds.has(tab.parentId)
      ) {
        return false;
      }

      if (tab.id === tabMove.draggingTabId) return false;

      return true;
    });

    if (!tabMove.dropTargetTabId) return filtered;

    const dropIndex = filtered.findIndex(
      (tab) => tab.id === tabMove.dropTargetTabId,
    );

    const result = [...filtered];
    result.splice(dropIndex === -1 ? result.length : dropIndex, 0, {
      kind: "spacer",
      id: `__spacer_${dropIndex}__`,
      active: false,
    });

    return result;
  }, [
    expandedComparisonIds,
    tabMove.dropTargetTabId,
    tabMove.draggingTabId,
    verticalTabs,
  ]);

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
          className="flex flex-col gap-2 relative"
        >
          {renderItems.map((item, index) => {
            if (item.kind === "spacer") {
              return <div className="h-10" />;
            }

            return (
              <TabItem
                key={item.id}
                item={item}
                index={index}
                expandedComparisonIds={expandedComparisonIds}
                selectedIDs={selectedIDs}
                tabMove={tabMove}
                setSelectedIDs={setSelectedIDs}
                toggleExpanded={toggleExpanded}
                toggleSelect={toggleSelect}
                setMenuOpenFor={setMenuOpenFor}
                setMenuPos={setMenuPos}
              />
            );
          })}

          {tabMove.draggingTabId &&
            (() => {
              const tab = verticalTabs.find(
                (t) => t.id === tabMove.draggingTabId,
              );
              if (!tab) return null;

              return (
                <TabItem
                  key={tab.id}
                  item={tab}
                  index={-1}
                  expandedComparisonIds={expandedComparisonIds}
                  selectedIDs={selectedIDs}
                  tabMove={tabMove}
                  setSelectedIDs={setSelectedIDs}
                  toggleExpanded={toggleExpanded}
                  toggleSelect={toggleSelect}
                  setMenuOpenFor={setMenuOpenFor}
                  setMenuPos={setMenuPos}
                />
              );
            })()}
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
