import { v4 as uuid } from "uuid";
import type { StateCreator } from "zustand";
import type {
  ComparisonTabState,
  SingleTabState,
  TabStoreState,
} from "../types";

export const createComparisonTabActions: StateCreator<
  TabStoreState,
  [],
  [],
  Pick<
    TabStoreState,
    "addComparisonTab" | "setActiveSlotIndex" | "createComparisonFromSingleTabs"
  >
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

      const newSingleTabs = { ...state.singleTabs };
      children.forEach((childId) => {
        newSingleTabs[childId].parentId = id;
      });

      return {
        singleTabs: newSingleTabs,
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

  createComparisonFromSingleTabs: (ids) => {
    set((state) => {
      const uniqueIds = Array.from(new Set(ids));
      if (uniqueIds.length < 2) return state;

      const orderedSingleTabs: SingleTabState[] = [];
      state.tabOrder.forEach((tabId) => {
        const tab = state.singleTabs[tabId];
        if (tab && uniqueIds.includes(tabId) && tab.parentId === null) {
          orderedSingleTabs.push(tab);
        }
      });

      if (orderedSingleTabs.length < 2) return state;

      const newComparisonTabId = uuid();

      const limited = orderedSingleTabs.slice(0, 4);
      const childrenIds = limited.map((tab) => tab.id);
      const newSingleTabs = { ...state.singleTabs };
      limited.forEach((tab) => {
        newSingleTabs[tab.id] = { ...tab, parentId: newComparisonTabId };
      });

      const newComparisonTabs = { ...state.comparisonTabs };
      newComparisonTabs[newComparisonTabId] = {
        id: newComparisonTabId,
        children: childrenIds,
        activeSlotIndex: 0,
      };

      return {
        singleTabs: newSingleTabs,
        comparisonTabs: newComparisonTabs,
        tabOrder: [...state.tabOrder, newComparisonTabId],
        activeTabId: newComparisonTabId,
      };
    });
  },
});
