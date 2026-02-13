import type React from "react";
import { useTabStore } from "../../store/tabStoreState";
import {
  isChildSingleTabState,
  isIndependentSingleTabState,
} from "../../store/tabStoreState/types/guards";
import ContextMenu, { type ContextMenuItem } from "../ContextMenu";

export type TabContextMenuProps = {
  menuOpenFor: string | null;
  menuPos: { x: number; y: number } | null;
  onClose: () => void;
  expandedComparisonIds: Set<string>;
  toggleExpanded: (id: string) => void;
  selectedIDs: Set<string>;
  setSelectedIDs: React.Dispatch<React.SetStateAction<Set<string>>>;
};

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
  const detachAllChildren = useTabStore((s) => s.detachAllChildren);

  if (!menuOpenFor || !menuPos) return null;

  const selectedIndependentSingleIDs = tabOrder.filter((id) => {
    const tab = singleTabs[id];
    return isIndependentSingleTabState(tab) && selectedIDs.has(id);
  });
  const selectedIndependentSingleCount = selectedIndependentSingleIDs.length;

  const contextItemDefinitions: Record<
    string,
    {
      label: string;
      handle: () => void;
      disabled?: boolean;
    }
  > = {
    new: {
      label: "New Tab",
      handle: () => addSingleTab([], 0, null),
    },
    clone: {
      label: "Clone Tab",
      handle: () => {
        const oldTab = singleTabs[menuOpenFor];
        if (!oldTab) return;
        const newDirectory = oldTab.directory;
        const newImageList = [...oldTab.imageList];
        const newIndex = oldTab.currentIndex;
        addSingleTab(newImageList, newIndex, newDirectory);
      },
    },
    close: {
      label: "Close",
      handle: () => {
        if (singleTabs[menuOpenFor]) removeSingleTab(menuOpenFor);
        else if (comparisonTabs[menuOpenFor]) detachAllChildren(menuOpenFor);
        setSelectedIDs((prev) => {
          if (!prev.has(menuOpenFor)) return prev;
          const n = new Set(prev);
          n.delete(menuOpenFor);
          return n;
        });
      },
    },
    "close-others": {
      label: "Close Others",
      handle: () => {
        tabOrder
          .filter((id) => id !== menuOpenFor)
          .forEach((id) => {
            if (singleTabs[id]) removeSingleTab(id);
            else if (comparisonTabs[id]) detachAllChildren(id);
          });
        setSelectedIDs(new Set([menuOpenFor]));
        setActiveTab(menuOpenFor);
      },
    },
    "create-comparison": {
      label: `Create Comparison (${selectedIndependentSingleCount})`,
      handle: () => {
        if (selectedIndependentSingleCount >= 2) {
          createComparison(selectedIndependentSingleIDs);
        }
        setSelectedIDs(new Set());
      },
      disabled: selectedIndependentSingleCount < 2,
    },
    "detach-all": {
      label: "Detach All Children",
      handle: () => detachAllChildren(menuOpenFor),
    },
    "toggle-expand": {
      label: expandedComparisonIds.has(menuOpenFor) ? "Collapse" : "Expand",
      handle: () => toggleExpanded(menuOpenFor),
    },
    "move-up": {
      label: "Move Up",
      handle: () => {
        const tab = singleTabs[menuOpenFor];
        if (!isChildSingleTabState(tab)) return;
        const parentId = tab.parentId;
        const childId = menuOpenFor;
        const parent = comparisonTabs[parentId];
        if (!parent) return;
        const childIndex = parent.children.indexOf(childId);
        if (childIndex < 0) return;
        if (childIndex > 0)
          reorderChildren(parent.id, childIndex, childIndex - 1);
      },
    },
    "move-down": {
      label: "Move Down",
      handle: () => {
        const tab = singleTabs[menuOpenFor];
        if (!isChildSingleTabState(tab)) return;
        const parentId = tab.parentId;
        const childId = menuOpenFor;
        const parent = comparisonTabs[parentId];
        if (!parent) return;
        const childIndex = parent.children.indexOf(childId);
        if (childIndex < 0) return;
        if (childIndex < parent.children.length - 1)
          reorderChildren(parent.id, childIndex, childIndex + 1);
      },
    },
    detach: {
      label: "Detach to Top",
      handle: () => {
        const tab = singleTabs[menuOpenFor];
        if (!isChildSingleTabState(tab)) return;
        const parentId = tab.parentId;
        const childId = menuOpenFor;
        const parent = comparisonTabs[parentId];
        if (!parent) return;
        const childIndex = parent.children.indexOf(childId);
        if (childIndex < 0) return;
        detachChild(parent.id, childIndex);
      },
    },
    remove: {
      label: "Remove From Comparison",
      handle: () => {
        const tab = singleTabs[menuOpenFor];
        if (!isChildSingleTabState(tab)) return;
        const parentId = tab.parentId;
        const childId = menuOpenFor;
        const parent = comparisonTabs[parentId];
        if (!parent) return;
        const childIndex = parent.children.indexOf(childId);
        if (childIndex < 0) return;
        removeChild(parent.id, childIndex);
      },
    },
  };

  const isChildContext = isChildSingleTabState(singleTabs[menuOpenFor]);
  let contextItemIds: string[] = [];

  if (!isChildContext) {
    contextItemIds = ["new", "clone", "close", "close-others"];

    if (selectedIndependentSingleCount >= 2) {
      contextItemIds.unshift("create-comparison");
    }

    // Add comparison-specific actions if target is a comparison
    const target = comparisonTabs[menuOpenFor];
    if (target) {
      contextItemIds.push("detach-all", "toggle-expand");
    }
  } else {
    // Child menu items
    contextItemIds = ["move-up", "move-down", "detach", "remove"];
  }

  const contextItems: ContextMenuItem[] = contextItemIds.map((id) => {
    const def = contextItemDefinitions[id];
    return {
      id,
      label: def.label,
      disabled: def.disabled ?? false,
    };
  });

  const handleSelect = (id: string) => {
    const definition = contextItemDefinitions[id];
    if (definition && !definition.disabled) {
      definition.handle();
    }
    onClose();
  };

  return (
    <ContextMenu
      x={menuPos.x}
      y={menuPos.y}
      items={contextItems}
      onSelect={handleSelect}
      onClose={onClose}
    />
  );
};

export default TabContextMenu;
