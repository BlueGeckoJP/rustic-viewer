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
      const activeTabId =
        state.activeTabId === id
          ? newOrder.length > 0
            ? newOrder[newOrder.length - 1]
            : state.addSingleTab([], 0, null)
          : state.activeTabId;
      return { singleTabs: newTabs, activeTabId, tabOrder: newOrder };
    });
  },
  setActiveTab: (id) => {
    set({ activeTabId: id });
  },
});
