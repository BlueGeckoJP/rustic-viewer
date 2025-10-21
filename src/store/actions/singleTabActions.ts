// Actions for single tab operations

import { v4 as uuid } from "uuid";
import type { StateCreator } from "zustand";
import { isComparisonTab, isSingleTab } from "../guards";
import type { SingleTab, TabStore } from "../types";

export const createSingleTabActions: StateCreator<
  TabStore,
  [],
  [],
  Pick<
    TabStore,
    "addSingleTab" | "getSingleTab" | "updateSingleTab" | "setCurrentIndex"
  >
> = (set, get) => ({
  addSingleTab: (directory, imageList, currentIndex) => {
    const id = uuid();
    const tab: SingleTab = {
      id,
      type: "single",
      directory,
      imageList,
      currentIndex,
    };
    set((state) => {
      const newTabs = new Map(state.tabs);
      newTabs.set(id, tab);
      return {
        tabs: newTabs,
        tabOrder: [...state.tabOrder, id],
        activeTabId: id,
      };
    });
    return id;
  },

  getSingleTab: (id) => {
    const t = get().tabs.get(id);
    return t && isSingleTab(t) ? t : null;
  },

  updateSingleTab: (id, patch) => {
    set((state) => {
      const existing = state.tabs.get(id);
      if (!existing || !isSingleTab(existing)) return state;
      const updated = { ...existing, ...patch } as SingleTab;
      const newTabs = new Map(state.tabs);
      newTabs.set(id, updated);
      return { tabs: newTabs };
    });
  },

  setCurrentIndex: (id, index) => {
    set((state) => {
      const currentTabs = state.tabs;
      const direct = currentTabs.get(id);
      if (direct && isSingleTab(direct)) {
        const newTabs = new Map(currentTabs);
        newTabs.set(id, { ...direct, currentIndex: index });
        return { tabs: newTabs };
      }
      // search comparisons for child
      for (const tid of state.tabOrder) {
        const tab = currentTabs.get(tid);
        if (tab && isComparisonTab(tab) && tab.children.has(id)) {
          const child = tab.children.get(id);
          if (!child) return state;
          const newChild = { ...child, currentIndex: index };
          const newChildren = new Map(tab.children);
          newChildren.set(id, newChild);
          const newTabs = new Map(currentTabs);
          newTabs.set(tid, { ...tab, children: newChildren });
          return { tabs: newTabs };
        }
      }
      return state;
    });
  },
});
