import type { StateCreator } from "zustand";
import type { TabStoreState } from "../types";

export const createCommonActions: StateCreator<
  TabStoreState,
  [],
  [],
  Pick<TabStoreState, "removeSingleTab" | "setActiveTab">
> = (set) => ({
  removeSingleTab: (id) => {
    set((state) => {
      const newTabs = { ...state.singleTabs };
      delete newTabs[id];
      const newOrder = state.tabOrder.filter((tid) => tid !== id);

      let activeTabId = state.activeTabId;
      if (state.activeTabId === id) {
        if (newOrder.length > 0) {
          const currentIndex = state.tabOrder.indexOf(id);
          activeTabId =
            currentIndex < state.tabOrder.length - 1
              ? state.tabOrder[currentIndex + 1]
              : state.tabOrder[currentIndex - 1];
        } else {
          activeTabId = state.addSingleTab([], 0, null);
        }
      }

      return { singleTabs: newTabs, activeTabId, tabOrder: newOrder };
    });
  },
  setActiveTab: (id) => {
    set({ activeTabId: id });
  },
});
