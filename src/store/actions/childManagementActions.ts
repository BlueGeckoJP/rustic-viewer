// Actions for child tab management within comparison tabs

import type { StateCreator } from "zustand";
import { isComparisonTab } from "../guards";
import { normalizeComparisonAfterChildrenChangeMap } from "../helpers/comparisonHelpers";
import type { ComparisonTab, TabStore } from "../types";

export const createChildManagementActions: StateCreator<
  TabStore,
  [],
  [],
  Pick<
    TabStore,
    | "reorderComparisonChildren"
    | "detachChildToTopLevel"
    | "removeChildFromComparison"
    | "detachAllChildren"
  >
> = (set) => ({
  reorderComparisonChildren: (comparisonId, fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    set((state) => {
      const comp = state.tabs.get(comparisonId);
      if (!comp || !isComparisonTab(comp)) return state;
      const order = [...comp.childrenOrder];
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= order.length ||
        toIndex >= order.length
      )
        return state;
      const [moved] = order.splice(fromIndex, 1);
      order.splice(toIndex, 0, moved);
      let newActive = comp.activeSlotIndex;
      if (comp.activeSlotIndex === fromIndex) newActive = toIndex;
      else if (
        fromIndex < comp.activeSlotIndex &&
        toIndex >= comp.activeSlotIndex
      )
        newActive = comp.activeSlotIndex - 1;
      else if (
        fromIndex > comp.activeSlotIndex &&
        toIndex <= comp.activeSlotIndex
      )
        newActive = comp.activeSlotIndex + 1;
      const newComp: ComparisonTab = {
        ...comp,
        childrenOrder: order,
        activeSlotIndex: newActive,
      };
      const newTabs = new Map(state.tabs);
      newTabs.set(comparisonId, newComp);
      return { tabs: newTabs };
    });
  },

  detachChildToTopLevel: (comparisonId, childId, insertAfterParent = true) => {
    set((state) => {
      const comp = state.tabs.get(comparisonId);
      if (!comp || !isComparisonTab(comp)) return state;
      const childIndex = comp.childrenOrder.indexOf(childId);
      if (childIndex < 0) return state;
      const child = comp.children.get(childId);
      if (!child) return state;

      const newChildrenOrder = comp.childrenOrder.filter(
        (cid) => cid !== childId,
      );
      const newChildren = new Map(comp.children);
      newChildren.delete(childId);

      const newTabs = new Map(state.tabs);
      // Insert child as top-level tab at position
      const insertPos = insertAfterParent
        ? state.tabOrder.indexOf(comparisonId) + 1
        : state.tabOrder.length;
      const newOrder = [...state.tabOrder];
      newOrder.splice(insertPos, 0, childId);
      newTabs.set(childId, child);

      return normalizeComparisonAfterChildrenChangeMap(
        newTabs,
        newOrder,
        comparisonId,
        comp,
        newChildren,
        newChildrenOrder,
        childIndex,
      );
    });
  },

  removeChildFromComparison: (comparisonId, childId) => {
    set((state) => {
      const comp = state.tabs.get(comparisonId);
      if (!comp || !isComparisonTab(comp)) return state;
      const childIndex = comp.childrenOrder.indexOf(childId);
      if (childIndex < 0) return state;
      const newChildrenOrder = comp.childrenOrder.filter(
        (cid) => cid !== childId,
      );
      const newChildren = new Map(comp.children);
      newChildren.delete(childId);
      const newTabs = new Map(state.tabs);
      const newOrder = [...state.tabOrder];

      return normalizeComparisonAfterChildrenChangeMap(
        newTabs,
        newOrder,
        comparisonId,
        comp,
        newChildren,
        newChildrenOrder,
        childIndex,
      );
    });
  },

  detachAllChildren: (comparisonId) => {
    set((state) => {
      const comp = state.tabs.get(comparisonId);
      if (!comp || !isComparisonTab(comp)) return state;
      const newTabs = new Map(state.tabs);
      newTabs.delete(comparisonId);
      const newOrder = [...state.tabOrder];
      const compIndex = newOrder.indexOf(comparisonId);
      if (compIndex < 0) return state;
      // insert children ids at compIndex in order
      newOrder.splice(compIndex, 1, ...comp.childrenOrder);
      // add children to map
      comp.childrenOrder.forEach((cid) => {
        const child = comp.children.get(cid);
        if (!child) return;
        newTabs.set(cid, child);
      });
      return {
        tabs: newTabs,
        tabOrder: newOrder,
        activeTabId: comp.childrenOrder[0] || null,
      };
    });
  },
});
