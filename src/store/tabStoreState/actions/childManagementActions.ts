import type { StateCreator } from "zustand";
import {
  handleChildRemoval,
  restoreToIndependentTab,
} from "../helpers/comparisonHelpers";
import type { TabStoreState } from "../types";
import { isChildSingleTabState } from "../types/guards";

export const createChildManagementActions: StateCreator<
  TabStoreState,
  [],
  [],
  Pick<
    TabStoreState,
    | "detachToSingleTab"
    | "removeChild"
    | "detachAllChildren"
    | "removeComparison"
  >
> = (set) => ({
  detachToSingleTab: (comparisonId, slotIndex) => {
    set((state) => {
      const comparisonTab = state.comparisonTabs[comparisonId];
      if (!comparisonTab) return state;
      const childId = comparisonTab.children[slotIndex];
      if (!childId) return state;
      const child = state.singleTabs[childId];
      if (!isChildSingleTabState(child)) return state;

      const newChildren = comparisonTab.children.filter(
        (_, i) => i !== slotIndex,
      );
      const restoredState = restoreToIndependentTab(child, state);
      const newSingleTabs = { ...restoredState.singleTabs };

      return handleChildRemoval(
        restoredState,
        comparisonTab,
        comparisonId,
        slotIndex,
        newChildren,
        newSingleTabs,
      );
    });
  },

  removeChild: (comparisonId, slotIndex) => {
    set((state) => {
      const comparisonTab = state.comparisonTabs[comparisonId];
      if (!comparisonTab) return state;
      const childId = comparisonTab.children[slotIndex];
      if (!childId) return state;

      const newSingleTabs = { ...state.singleTabs };
      const newChildren = comparisonTab.children.filter(
        (_, i) => i !== slotIndex,
      );
      delete newSingleTabs[childId];

      return handleChildRemoval(
        state,
        comparisonTab,
        comparisonId,
        slotIndex,
        newChildren,
        newSingleTabs,
      );
    });
  },

  detachAllChildren: (comparisonId) => {
    set((state) => {
      const comparisonTab = state.comparisonTabs[comparisonId];
      if (!comparisonTab) return state;

      let restoredState = state;
      comparisonTab.children.forEach((childId) => {
        const child = restoredState.singleTabs[childId];
        if (isChildSingleTabState(child)) {
          restoredState = restoreToIndependentTab(child, restoredState);
        }
      });

      const activeTabId =
        comparisonTab.children.find(
          (childId) => restoredState.singleTabs[childId]?.parentId === null,
        ) || state.addSingleTab([], 0, null);

      const newComparisonTabs = { ...restoredState.comparisonTabs };
      delete newComparisonTabs[comparisonId];

      return {
        tabOrder: restoredState.tabOrder.filter((id) => id !== comparisonId),
        activeTabId,
        singleTabs: restoredState.singleTabs,
        comparisonTabs: newComparisonTabs,
      };
    });
  },

  removeComparison: (comparisonId) => {
    set((state) => {
      const comparisonTab = state.comparisonTabs[comparisonId];
      if (!comparisonTab) return state;

      const childrenIds = comparisonTab.children;
      const newSingleTabs = { ...state.singleTabs };
      for (const childId of childrenIds) {
        delete newSingleTabs[childId];
      }

      const newComparisonTabs = { ...state.comparisonTabs };
      delete newComparisonTabs[comparisonId];

      const newOrder = state.tabOrder.filter(
        (id) => id !== comparisonId && !childrenIds.includes(id),
      );

      const currentIndex = state.tabOrder.indexOf(comparisonId);
      const isActiveRemoved =
        state.activeTabId === comparisonId ||
        childrenIds.includes(state.activeTabId);

      const activeTabId = isActiveRemoved
        ? newOrder.length > 0
          ? newOrder[Math.min(currentIndex, newOrder.length - 1)]
          : state.addSingleTab([], 0, null)
        : state.activeTabId;

      return {
        singleTabs: newSingleTabs,
        comparisonTabs: newComparisonTabs,
        tabOrder: newOrder,
        activeTabId,
      };
    });
  },
});
