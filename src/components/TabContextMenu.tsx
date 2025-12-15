import type React from "react";
import { useTabStore } from "../store";
import ContextMenu, { type ContextMenuItem } from "./ContextMenu";

const CHILD_PREFIX = "::child::";

interface TabContextMenuProps {
  menuOpenFor: string | null;
  menuPos: { x: number; y: number } | null;
  onClose: () => void;
  expandedComparisonIds: Set<string>;
  toggleExpanded: (id: string) => void;
  selectedIDs: Set<string>;
  setSelectedIDs: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const TabContextMenu = ({
  menuOpenFor,
  menuPos,
  onClose,
  expandedComparisonIds,
  toggleExpanded,
  selectedIDs,
  setSelectedIDs,
}: TabContextMenuProps) => {
  const singleTabs = useTabStore((s) => s.singleTabs);
  const comparisonTabs = useTabStore((s) => s.comparisonTabs);
  const tabOrder = useTabStore((s) => s.tabOrder);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const removeSingleTab = useTabStore((s) => s.removeSingleTab);
  const createComparison = useTabStore((s) => s.createComparisonFromSingleTabs);
  const addSingleTab = useTabStore((s) => s.addSingleTab);
  const detachChild = useTabStore((s) => s.detachToSingleTab);
  const removeChild = useTabStore((s) => s.removeChild);
  const reorderChildren = useTabStore((s) => s.reorderComparisonChildren);
  const setActiveSlotIndex = useTabStore((s) => s.setActiveSlotIndex);
  const detachAllChildren = useTabStore((s) => s.detachAllChildren);

  if (!menuOpenFor || !menuPos) return null;

  const isChildContext = menuOpenFor.includes(CHILD_PREFIX);
  let contextItems: ContextMenuItem[] = [];

  if (!isChildContext) {
    contextItems = [
      { id: "new", label: "New Tab" },
      { id: "clone", label: "Clone Tab" },
      { id: "close", label: "Close" },
      { id: "close-others", label: "Close Others" },
      { id: "close-right", label: "Close Tabs to Right" },
    ];
    const singleSelectedCount = tabOrder.filter(
      (id) => singleTabs[id] && selectedIDs.has(id),
    ).length;
    if (singleSelectedCount >= 2) {
      contextItems.unshift({
        id: "create-comparison",
        label: `Create Comparison (${singleSelectedCount})`,
      });
    }
    // Add comparison-specific actions if target is a comparison
    const target = comparisonTabs[menuOpenFor];
    if (target) {
      contextItems.push({ id: "detach-all", label: "Detach All Children" });
      contextItems.push({
        id: "toggle-expand",
        label: expandedComparisonIds.has(target.id) ? "Collapse" : "Expand",
      });
    }
  } else {
    // Child menu items
    contextItems = [
      { id: "activate", label: "Activate" },
      { id: "move-up", label: "Move Up" },
      { id: "move-down", label: "Move Down" },
      { id: "detach", label: "Detach to Top" },
      { id: "remove", label: "Remove From Comparison" },
    ];
  }

  const handleSelect = (id: string) => {
    const targetId = menuOpenFor;
    if (!targetId) return;
    const childMode = targetId.includes(CHILD_PREFIX);

    if (!childMode) {
      if (id === "create-comparison") {
        const singleIds = tabOrder.filter(
          (tid) => singleTabs[tid] && selectedIDs.has(tid),
        );
        if (singleIds.length >= 2) {
          createComparison(singleIds);
        }
        setSelectedIDs(new Set());
      } else if (id === "new") {
        addSingleTab([], 0, null);
      } else if (id === "clone") {
        const oldTab = singleTabs[targetId];
        if (oldTab) {
          const newDirectory = oldTab.directory;
          const newImageList = [...oldTab.imageList];
          const newIndex = oldTab.currentIndex;
          addSingleTab(newImageList, newIndex, newDirectory);
        }
      } else if (id === "close") {
        if (singleTabs[targetId]) {
          removeSingleTab(targetId);
        } else if (comparisonTabs[targetId]) {
          detachAllChildren(targetId);
        }
        setSelectedIDs((prev) => {
          if (!prev.has(targetId)) return prev;
          const n = new Set(prev);
          n.delete(targetId);
          return n;
        });
      } else if (id === "close-others") {
        tabOrder
          .filter((tid) => tid !== targetId)
          .forEach((tid) => {
            if (singleTabs[tid]) {
              removeSingleTab(tid);
            } else if (comparisonTabs[tid]) {
              detachAllChildren(tid);
            }
          });
        setSelectedIDs(new Set([targetId]));
        setActiveTab(targetId);
      } else if (id === "close-right") {
        const idx = tabOrder.indexOf(targetId);
        if (idx >= 0) {
          tabOrder.slice(idx + 1).forEach((tid) => {
            if (singleTabs[tid]) {
              removeSingleTab(tid);
            } else if (comparisonTabs[tid]) {
              detachAllChildren(tid);
            }
          });
        }
      } else if (id === "detach-all") {
        detachAllChildren(targetId);
      } else if (id === "toggle-expand") {
        toggleExpanded(targetId);
      }
    } else {
      // Child actions
      const [parentId, childId] = targetId.split(CHILD_PREFIX);
      const parent = comparisonTabs[parentId];
      if (!parent) return;
      const childIndex = parent.children.indexOf(childId);
      if (childIndex < 0) return;

      if (id === "activate") {
        setActiveTab(parent.id);
        setActiveSlotIndex(parent.id, childIndex);
      } else if (id === "move-up") {
        if (childIndex > 0)
          reorderChildren(parent.id, childIndex, childIndex - 1);
      } else if (id === "move-down") {
        if (childIndex < parent.children.length - 1)
          reorderChildren(parent.id, childIndex, childIndex + 1);
      } else if (id === "detach") {
        detachChild(parent.id, childIndex);
      } else if (id === "remove") {
        removeChild(parent.id, childIndex);
      }
    }

    onClose();
  };

  return (
    <ContextMenu
      x={menuPos.x}
      y={menuPos.y}
      items={contextItems.map((it) => ({ ...it, disabled: false }))}
      onSelect={handleSelect}
      onClose={onClose}
    />
  );
};

export default TabContextMenu;
