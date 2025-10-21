// Helper functions for comparison tab operations

import type { ComparisonTab, SingleTab, Tab } from "../types";

// Helper: centralize the logic for updating a comparison tab after its children change
// Works with the store's map-based tabs and childrenOrder representation.
export function normalizeComparisonAfterChildrenChangeMap(
  tabs: Map<string, Tab>,
  tabOrder: string[],
  comparisonId: string,
  comp: ComparisonTab,
  newChildren: Map<string, SingleTab>,
  newChildrenOrder: string[],
  removedChildIndex?: number,
): { tabs: Map<string, Tab>; tabOrder: string[]; activeTabId?: string } {
  const outTabs = new Map(tabs);
  const outOrder = [...tabOrder];

  if (newChildrenOrder.length === 1) {
    const remainingId = newChildrenOrder[0];
    const remaining = newChildren.get(remainingId);
    if (!remaining) return { tabs: outTabs, tabOrder: outOrder };
    // Replace comparison with remaining single
    outTabs.delete(comparisonId);
    outTabs.set(remainingId, remaining);
    const idx = outOrder.indexOf(comparisonId);
    if (idx >= 0) outOrder.splice(idx, 1, remainingId);
    else outOrder.push(remainingId);
    return { tabs: outTabs, tabOrder: outOrder, activeTabId: remainingId };
  } else if (newChildrenOrder.length === 0) {
    // Remove comparison entirely
    outTabs.delete(comparisonId);
    const filtered = outOrder.filter((tid) => tid !== comparisonId);
    return { tabs: outTabs, tabOrder: filtered };
  } else {
    const adjustedActive = Math.min(
      comp.activeSlotIndex >= (removedChildIndex ?? 0)
        ? comp.activeSlotIndex - 1
        : comp.activeSlotIndex,
      newChildrenOrder.length - 1,
    );
    const newComp: ComparisonTab = {
      ...comp,
      children: new Map(newChildren),
      childrenOrder: [...newChildrenOrder],
      activeSlotIndex: adjustedActive,
    };
    outTabs.set(comparisonId, newComp);
    return { tabs: outTabs, tabOrder: outOrder };
  }
}
