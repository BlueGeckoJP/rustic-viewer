import { v4 as uuid } from "uuid";
import type { StateCreator } from "zustand";
import type { SingleTabState, TabStoreState } from "../types";

export const createSingleTabActions: StateCreator<
  TabStoreState,
  [],
  [],
  Pick<
    TabStoreState,
    | "addSingleTab"
    | "updateSingleTab"
    | "setCurrentIndex"
    | "setZoom"
    | "setPanOffset"
    | "resetZoomAndPan"
  >
> = (set) => ({
  addSingleTab: (imageList, currentIndex, directory) => {
    const id = uuid();
    const tab: SingleTabState = {
      id,
      parentId: null,
      directory,
      imageList,
      currentIndex,
      zoom: 1.0,
      panOffset: { x: 0, y: 0 },
    };
    set((state) => {
      const newSingleTabs = { ...state.singleTabs };
      newSingleTabs[id] = tab;
      return {
        singleTabs: newSingleTabs,
        tabOrder: [...state.tabOrder, id],
        activeTabId: id,
      };
    });
    return id;
  },

  updateSingleTab: (id, patch) => {
    set((state) => {
      const existing = state.singleTabs[id];
      if (!existing) return state;
      const updated = { ...existing, ...patch };
      const newSingleTabs = { ...state.singleTabs };
      newSingleTabs[id] = updated;
      return { singleTabs: newSingleTabs };
    });
  },

  setCurrentIndex: (id, index) => {
    set((state) => {
      const tab = state.singleTabs[id];
      if (!tab) return state;
      return {
        singleTabs: {
          ...state.singleTabs,
          [id]: { ...tab, currentIndex: index },
        },
      };
    });
  },

  setZoom: (id, zoom) => {
    set((state) => {
      const tab = state.singleTabs[id];
      if (!tab) return state;
      return {
        singleTabs: {
          ...state.singleTabs,
          [id]: { ...tab, zoom },
        },
      };
    });
  },

  setPanOffset: (id, offset) => {
    set((state) => {
      const tab = state.singleTabs[id];
      if (!tab) return state;
      return {
        singleTabs: {
          ...state.singleTabs,
          [id]: { ...tab, panOffset: offset },
        },
      };
    });
  },

  resetZoomAndPan: (id) => {
    set((state) => {
      const tab = state.singleTabs[id];
      if (!tab) return state;
      return {
        singleTabs: {
          ...state.singleTabs,
          [id]: {
            ...tab,
            zoom: 1.0,
            panOffset: { x: 0, y: 0 },
          },
        },
      };
    });
  },
});
