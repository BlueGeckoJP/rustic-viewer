import { create } from "zustand";
import { v4 as uuid } from "uuid";

export type Tab = {
  id: string;
  directory: string | null;
  imageList: string[];
  currentIndex: number;
};

type TabStore = {
  tabs: Tab[];
  activeTabId: string | null;
  // actions
  addTab: (directory: string | null, imageList: string[]) => string;
  removeTab: (id: string) => void;
  getTab: (id: string) => Tab | null;
  updateTab: (id: string, tab: Partial<Tab>) => void;
  setActiveTab: (id: string) => void;
  setCurrentIndex: (id: string, index: number) => void;
};

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: [],
  activeTabId: null,

  addTab: (directory, imageList) => {
    const id = uuid();
    set((state) => ({
      tabs: [...state.tabs, { id, directory, imageList, currentIndex: 0 }],
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

  getTab: (id) => {
    const tab = get().tabs.find((t) => t.id === id);
    return tab || null;
  },

  updateTab: (id, tab) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, ...tab } : t)),
    }));
  },

  setActiveTab: (id) => {
    set({ activeTabId: id });
  },

  setCurrentIndex: (id, index) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, currentIndex: index } : t
      ),
    }));
  },
}));
