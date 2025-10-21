// Actions for comparison tab operations

import { v4 as uuid } from "uuid";
import type { StateCreator } from "zustand";
import { isComparisonTab, isSingleTab } from "../guards";
import type { ComparisonTab, SingleTab, TabStore } from "../types";

export const createComparisonTabActions: StateCreator<
  TabStore,
  [],
  [],
  Pick<
    TabStore,
    | "addComparisonTab"
    | "getComparisonTab"
    | "createComparisonFromSingleIds"
    | "setActiveSlotIndex"
    | "updateComparisonChildren"
  >
> = (set, get) => ({
  addComparisonTab: (children, activeSlotIndex) => {
    const id = uuid();
    const childrenMap = new Map<string, SingleTab>();
    const childrenOrder: string[] = [];
    children.forEach((c) => {
      childrenMap.set(c.id, c);
      childrenOrder.push(c.id);
    });
    const tab: ComparisonTab = {
      id,
      type: "comparison",
      children: childrenMap,
      childrenOrder,
      activeSlotIndex,
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

  getComparisonTab: (id) => {
    const t = get().tabs.get(id);
    return t && isComparisonTab(t) ? t : null;
  },

  // Move selected single tabs into a new comparison tab
  createComparisonFromSingleIds: (ids) => {
    const uniq = Array.from(new Set(ids));
    if (uniq.length < 2) return null;

    set((state) => {
      // Preserve order according to tabOrder
      const orderedSingles: SingleTab[] = [];
      const remainingOrder: string[] = [];
      state.tabOrder.forEach((tid) => {
        const t = state.tabs.get(tid);
        if (t && isSingleTab(t) && uniq.includes(t.id)) {
          orderedSingles.push(t);
        } else if (t) {
          remainingOrder.push(tid);
        }
      });

      if (orderedSingles.length < 2) return state;

      const limited = orderedSingles.slice(0, 4);

      const comparisonId = uuid();
      const childrenMap = new Map<string, SingleTab>();
      const childrenOrder: string[] = [];
      limited.forEach((c) => {
        childrenMap.set(c.id, c);
        childrenOrder.push(c.id);
      });

      const comparison: ComparisonTab = {
        id: comparisonId,
        type: "comparison",
        children: childrenMap,
        childrenOrder,
        activeSlotIndex: 0,
      };

      const firstIndexInOld = state.tabOrder.findIndex((tid) => {
        const t = state.tabs.get(tid);
        return t && isSingleTab(t) && uniq.includes(t.id);
      });

      const newTabs = new Map(state.tabs);
      limited.map((c) => newTabs.delete(c.id));

      const newOrder: string[] = [];
      let inserted = false;
      for (let i = 0; i < state.tabOrder.length; i++) {
        if (i === firstIndexInOld) {
          newTabs.set(comparisonId, comparison);
          newOrder.push(comparisonId);
          inserted = true;
        }
        const tid = state.tabOrder[i];
        const t = state.tabs.get(tid);
        if (t && isSingleTab(t) && uniq.includes(t.id)) continue;
        newOrder.push(tid);
      }
      if (!inserted) {
        newTabs.set(comparisonId, comparison);
        newOrder.push(comparisonId);
      }

      return {
        tabs: newTabs,
        tabOrder: newOrder,
        activeTabId: comparisonId,
      };
    });

    return null;
  },

  setActiveSlotIndex: (id, slotIndex) => {
    set((state) => {
      const tab = state.tabs.get(id);
      if (!tab || !isComparisonTab(tab)) return state;
      const newTabs = new Map(state.tabs);
      newTabs.set(id, { ...tab, activeSlotIndex: slotIndex });
      return { tabs: newTabs };
    });
  },

  updateComparisonChildren: (id, children) => {
    set((state) => {
      const tab = state.tabs.get(id);
      if (!tab || !isComparisonTab(tab)) return state;
      const childrenOrder = tab.childrenOrder.filter((cid) =>
        children.has(cid),
      );
      // ensure order includes any new ids in insertion order
      for (const key of children.keys()) {
        if (!childrenOrder.includes(key)) childrenOrder.push(key);
      }
      const newTabs = new Map(state.tabs);
      newTabs.set(id, { ...tab, children: new Map(children), childrenOrder });
      return { tabs: newTabs };
    });
  },
});
