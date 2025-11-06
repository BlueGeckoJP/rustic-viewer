import type { StateCreator } from "zustand";
import type { TabStoreState } from "../types";

export const createTabOrderActions: StateCreator<
  TabStoreState,
  [],
  [],
  Pick<TabStoreState, "reorderTab" | "reorderComparisonChildren">
> = (set) => ({
  reorderTab: (fromIndex, toIndex) => {
    set((state) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= state.tabOrder.length ||
        toIndex > state.tabOrder.length
      )
        return state;

      const order = [...state.tabOrder];
      const [moved] = order.splice(fromIndex, 1);
      order.splice(toIndex, 0, moved);
      return { ...state, tabOrder: order };
    });
  },

  reorderComparisonChildren: (comparisonId, fromIndex, toIndex) => {
    set((state) => {
      if (fromIndex === toIndex) return state;

      const comparisonTab = state.comparisonTabs[comparisonId];
      if (!comparisonTab) return state;

      const children = [...comparisonTab.children];

      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= children.length ||
        toIndex > children.length
      )
        return state;

      const [moved] = children.splice(fromIndex, 1);
      children.splice(toIndex, 0, moved);

      const newActiveSlotIndex = comparisonTab.activeSlotIndex;
      if (fromIndex === newActiveSlotIndex) {
        comparisonTab.activeSlotIndex = toIndex;
      } else if (
        fromIndex < newActiveSlotIndex &&
        toIndex >= newActiveSlotIndex
      ) {
        comparisonTab.activeSlotIndex -= 1;
      } else if (
        fromIndex > newActiveSlotIndex &&
        toIndex <= newActiveSlotIndex
      ) {
        comparisonTab.activeSlotIndex += 1;
      }

      return {
        comparisonTabs: {
          ...state.comparisonTabs,
          [comparisonId]: {
            ...comparisonTab,
            children,
            activeSlotIndex: newActiveSlotIndex,
          },
        },
      };
    });
  },
});
