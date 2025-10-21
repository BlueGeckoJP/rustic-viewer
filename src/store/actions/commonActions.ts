// Common actions that apply to all tab types

import type { StateCreator } from "zustand";
import type { TabStore } from "../types";

export const createCommonActions: StateCreator<
  TabStore,
  [],
  [],
  Pick<TabStore, "removeTab" | "setActiveTab">
> = (set) => ({
  removeTab: (id) => {
    set((state) => {
      const newTabs = new Map(state.tabs);
      newTabs.delete(id);
      const newOrder = state.tabOrder.filter((tid) => tid !== id);
      const activeTabId =
        state.activeTabId === id
          ? newOrder.length > 0
            ? newOrder[newOrder.length - 1]
            : null
          : state.activeTabId;
      return { tabs: newTabs, tabOrder: newOrder, activeTabId };
    });
  },

  setActiveTab: (id) => {
    set({ activeTabId: id });
  },
});
