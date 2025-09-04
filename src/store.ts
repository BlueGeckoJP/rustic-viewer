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
  addTab: (directory: string | null, imageList: string[]) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  setCurrentIndex: (id: string, index: number) => void;
};

export const useTabStore = create<TabStore>((set, _get) => ({
  tabs: [],
  activeTabId: null,

  addTab: (directory, imageList) => {
    const id = uuid();
    set((state) => ({
      tabs: [...state.tabs, { id, directory, imageList, currentIndex: 0 }],
      activeTabId: id,
    }));
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
