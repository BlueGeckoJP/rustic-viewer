import type {
  ChildSingleTabState,
  ComparisonTabState,
  IndependentSingleTabState,
  SingleTabState,
  TabStoreState,
} from "../types";

export function handleChildRemoval(
  state: TabStoreState,
  comparisonTab: ComparisonTabState,
  comparisonId: string,
  slotIndex: number,
  newChildren: string[],
  newSingleTabs: Record<string, SingleTabState>,
): Partial<TabStoreState> {
  if (newChildren.length === 0) {
    // If no children left, remove the comparison tab
    const newComparisonTabs = { ...state.comparisonTabs };
    delete newComparisonTabs[comparisonId];

    const newTabOrder = state.tabOrder.filter((id) => id !== comparisonId);
    const nextActiveTabId = newTabOrder[0] || state.addSingleTab([], 0, null);

    return {
      singleTabs: newSingleTabs,
      comparisonTabs: newComparisonTabs,
      tabOrder: newTabOrder,
      activeTabId: nextActiveTabId,
    };
  } else if (newChildren.length === 1) {
    // If one child left, convert to single tab
    const remainingChildId = newChildren[0];
    const remainingChild = state.singleTabs[remainingChildId];
    if (remainingChild) {
      newSingleTabs[remainingChildId] = {
        ...remainingChild,
        parentId: null,
      };
    }

    const newComparisonTabs = { ...state.comparisonTabs };
    delete newComparisonTabs[comparisonId];

    const newTabOrder = state.tabOrder.filter((id) => id !== comparisonId);

    return {
      singleTabs: newSingleTabs,
      comparisonTabs: newComparisonTabs,
      tabOrder: newTabOrder,
      activeTabId: remainingChildId,
    };
  } else {
    // More than one child left, just update comparison tab
    const adjustedActiveSlotIndex = Math.min(
      comparisonTab.activeSlotIndex >= slotIndex
        ? comparisonTab.activeSlotIndex - 1
        : comparisonTab.activeSlotIndex,
      newChildren.length - 1,
    );

    const newComparisonTabs = {
      ...state.comparisonTabs,
      [comparisonId]: {
        ...comparisonTab,
        children: newChildren,
        activeSlotIndex: adjustedActiveSlotIndex,
      },
    };

    return {
      singleTabs: newSingleTabs,
      comparisonTabs: newComparisonTabs,
    };
  }
}

export function restoreToIndependentTab(
  childTab: ChildSingleTabState,
  state: TabStoreState,
): TabStoreState {
  const { originalIndex, snapshotOrder, beforeTabId, afterTabId } = childTab;
  const independentTab = {
    ...childTab,
    parentId: null,
  } as IndependentSingleTabState;

  const currentOrder = state.tabOrder.filter((id) => id !== childTab.id);
  const beforeIndex =
    beforeTabId === null ? -1 : currentOrder.indexOf(beforeTabId);
  const afterIndex =
    afterTabId === null ? -1 : currentOrder.indexOf(afterTabId);

  const clamp = (index: number) =>
    Math.max(0, Math.min(index, currentOrder.length));

  let insertIndex: number | null = null;

  // Both anchors exist
  if (beforeIndex !== -1 && afterIndex !== -1) {
    // Normal order: insert right after before anchor
    if (beforeIndex < afterIndex) {
      insertIndex = beforeIndex + 1;
    } else {
      // Reversed order: pick the side closer to originalIndex
      const beforeCandidate = beforeIndex + 1;
      const afterCandidate = afterIndex;
      const distanceToBefore = Math.abs(beforeCandidate - originalIndex);
      const distanceToAfter = Math.abs(afterCandidate - originalIndex);
      insertIndex =
        distanceToBefore <= distanceToAfter ? beforeCandidate : afterCandidate;
    }
  } else if (beforeIndex !== -1) {
    // Only before exists
    insertIndex = beforeIndex + 1;
  } else if (afterIndex !== -1) {
    // Only after exists
    insertIndex = afterIndex;
  } else {
    // No anchors: project historical originalIndex into current order
    if (Number.isFinite(originalIndex) && originalIndex >= 0) {
      const prefix = snapshotOrder.slice(
        0,
        Math.min(originalIndex, snapshotOrder.length),
      );
      const currentIdSet = new Set(currentOrder);
      let projectedIndex = 0;
      prefix.forEach((id) => {
        if (currentIdSet.has(id)) projectedIndex += 1;
      });
      insertIndex = projectedIndex;
    }
  }

  // Final fallback
  if (insertIndex === null || Number.isNaN(insertIndex)) {
    insertIndex = 0;
  }

  const normalizedInsertIndex = clamp(insertIndex);
  const nextOrder = [...currentOrder];
  nextOrder.splice(normalizedInsertIndex, 0, independentTab.id);

  return {
    ...state,
    singleTabs: {
      ...state.singleTabs,
      [independentTab.id]: independentTab,
    },
    tabOrder: nextOrder,
  };
}
