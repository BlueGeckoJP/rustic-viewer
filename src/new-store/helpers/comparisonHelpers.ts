import type {
  ComparisonTabState,
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
