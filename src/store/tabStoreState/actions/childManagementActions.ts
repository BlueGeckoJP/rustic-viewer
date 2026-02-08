import type { StateCreator } from "zustand";
import { handleChildRemoval } from "../helpers/comparisonHelpers";
import type { TabStoreState } from "../types";

export const createChildManagementActions: StateCreator<
  TabStoreState,
  [],
  [],
  Pick<TabStoreState, "detachToSingleTab" | "removeChild" | "detachAllChildren">
> = (set) => ({
  detachToSingleTab: (comparisonId, slotIndex) => {
    set((state) => {
      const comparisonTab = state.comparisonTabs[comparisonId];
      if (!comparisonTab) return state;
      const childId = comparisonTab.children[slotIndex];
      if (!childId) return state;
      const child = state.singleTabs[childId];
      if (!child) return state;

      const newChildren = comparisonTab.children.filter(
        (_, i) => i !== slotIndex,
      );
      const newSingleTabs = { ...state.singleTabs };
      newSingleTabs[childId] = { ...child, parentId: null };

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

      const activeTabId =
        comparisonTab.children[0] || state.addSingleTab([], 0, null);

      const newSingleTabs = { ...state.singleTabs };
      comparisonTab.children.forEach((childId) => {
        const child = newSingleTabs[childId];
        if (child) {
          newSingleTabs[childId] = { ...child, parentId: null };
        }
      });
      const newComparisonTabs = { ...state.comparisonTabs };
      delete newComparisonTabs[comparisonId];

      return {
        tabOrder: state.tabOrder.filter((id) => id !== comparisonId),
        activeTabId,
        singleTabs: newSingleTabs,
        comparisonTabs: newComparisonTabs,
      };
    });
  },
});
