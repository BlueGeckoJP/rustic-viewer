import { create } from "zustand";
import { v4 as uuid } from "uuid";

export type Tab = SingleTab | ComparisonTab;

export type SingleTab = {
  id: string;
  type: "single";
  directory: string | null;
  imageList: string[];
  currentIndex: number;
};

export type ComparisonTab = {
  id: string;
  type: "comparison";
  children: SingleTab[];
  activeSlotIndex: number;
};

type TabStore = {
  tabs: Tab[];
  activeTabId: string | null;
  // actions
  addSingleTab: (
    directory: string | null,
    imageList: string[],
    currentIndex: number
  ) => string;
  addComparisonTab: (children: SingleTab[], activeSlotIndex: number) => string;
  removeTab: (id: string) => void;
  getSingleTab: (id: string) => SingleTab | null;
  getComparisonTab: (id: string) => ComparisonTab | null;
  setCurrentIndex: (id: string, index: number) => void;
  setActiveTab: (id: string) => void;
  setActiveSlotIndex: (id: string, slotIndex: number) => void;
  updateSingleTab: (id: string, tab: Partial<SingleTab>) => void;
  updateComparisonChildren: (id: string, children: SingleTab[]) => void;
  reorderTab: (fromIndex: number, toIndex: number) => void;
};

export const isSingleTab = (tab: Tab): tab is SingleTab =>
  tab.type === "single";
export const isComparisonTab = (tab: Tab): tab is ComparisonTab =>
  tab.type === "comparison";

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [],
  activeTabId: null,

  addSingleTab: (directory, imageList, currentIndex) => {
    const id = uuid();
    set((state) => ({
      tabs: [
        ...state.tabs,
        { id, type: "single", directory, imageList, currentIndex },
      ],
      activeTabId: id,
    }));
    return id;
  },

  removeTab: (id) => {
    set((state) => {
      const tabs = state.tabs.filter((t) => t.id !== id);
      const activeTabId =
        state.activeTabId === id
          ? tabs.length > 0
            ? tabs[tabs.length - 1].id
            : null
          : state.activeTabId;
      return { tabs, activeTabId };
    });
  },

  getSingleTab: (id) => {
    const tab = get().tabs.find((t) => t.id === id && t.type === "single");
    return tab && isSingleTab(tab) ? tab : null;
  },

  getComparisonTab: (id) => {
    const tab = get().tabs.find((t) => t.id === id && t.type === "comparison");
    return tab && isComparisonTab(tab) ? tab : null;
  },

  updateSingleTab: (id, tab) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id && t.type === "single" ? { ...t, ...tab } : t
      ),
    }));
  },

  setActiveTab: (id) => {
    set({ activeTabId: id });
  },

  setCurrentIndex: (id, index) => {
    set((state) => ({
      tabs: state.tabs.map((t) => {
        if (t.type === "single") {
          return t.id === id ? { ...t, currentIndex: index } : t;
        }
        if (t.type === "comparison") {
          // only update if this comparison contains the child
          if (t.children.some((child) => child.id === id)) {
            return {
              ...t,
              children: t.children.map((child) =>
                child.id === id ? { ...child, currentIndex: index } : child
              ),
            };
          }
          return t;
        }
        return t;
      }),
    }));
  },

  addComparisonTab: (children, activeSlotIndex) => {
    const id = uuid();
    set((state) => ({
      tabs: [
        ...state.tabs,
        { id, type: "comparison", children, activeSlotIndex },
      ],
      activeTabId: id,
    }));
    return id;
  },

  setActiveSlotIndex: (id, slotIndex) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id && t.type === "comparison"
          ? { ...t, activeSlotIndex: slotIndex }
          : t
      ),
    }));
  },

  updateComparisonChildren: (id, children) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id && t.type === "comparison" ? { ...t, children } : t
      ),
    }));
  },

  reorderTab: (fromIndex, toIndex) => {
    set((state) => {
      const tabs = Array.from(state.tabs);
      const [movedTab] = tabs.splice(fromIndex, 1);
      const adjustedToIndex = fromIndex < toIndex ? toIndex - 1 : toIndex;
      tabs.splice(adjustedToIndex, 0, movedTab);
      return { tabs };
    });
  },
}));
