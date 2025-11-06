import { v4 as uuid } from "uuid";
import type { StateCreator } from "zustand";
import type { ComparisonTabState, TabStoreState } from "../types";

export const createComparisonTabActions: StateCreator<
  TabStoreState,
  [],
  [],
  Pick<TabStoreState, "addComparisonTab" | "setActiveSlotIndex">
> = (set, get) => ({
  addComparisonTab: (childrenIds, activeSlotIndex) => {
    const id = uuid();
    const children: string[] = [];
    childrenIds.forEach((childId) => {
      if (get().singleTabs[childId]) {
        children.push(childId);
      }
    });
    const tab: ComparisonTabState = {
      id,
      children,
      activeSlotIndex: activeSlotIndex ?? 0,
    };
    set((state) => {
      const newComparisonTabs = { ...state.comparisonTabs };
      newComparisonTabs[id] = tab;
      return {
        comparisonTabs: newComparisonTabs,
        tabOrder: [...state.tabOrder, id],
        activeTabId: id,
      };
    });
    return id;
  },
  setActiveSlotIndex(id, slotIndex) {
    set((state) => {
      return {
        comparisonTabs: {
          ...state.comparisonTabs,
          [id]: { ...state.comparisonTabs[id], activeSlotIndex: slotIndex },
        },
      };
    });
  },
});
