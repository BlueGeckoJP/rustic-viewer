import type { StateCreator } from "zustand";
import { determineDirectory, getSortedImageFiles } from "../../utils/fileUtils";
import imageCache from "../../utils/imageCache";
import type { TabStoreState } from "../types";

export const createImageActions: StateCreator<
  TabStoreState,
  [],
  [],
  Pick<TabStoreState, "openImage" | "reloadActiveImage" | "updateImageList">
> = (_set, get) => ({
  openImage: async (path: string, inNewTab?: boolean) => {
    const dir = determineDirectory(path);

    try {
      const files = await getSortedImageFiles(dir);

      const index = files.indexOf(path);
      const activeTabId = get().activeTabId;
      const currentActiveTab =
        get().singleTabs[activeTabId] ||
        get().comparisonTabs[activeTabId] ||
        null;

      if (!currentActiveTab || inNewTab) {
        const id = get().addSingleTab(files, index >= 0 ? index : 0, dir);
        get().setActiveTab(id);
      } else {
        const singleTab = get().singleTabs[activeTabId];
        const comparisonTab = get().comparisonTabs[activeTabId];

        const targetTabId =
          singleTab?.id ??
          comparisonTab?.children[comparisonTab.activeSlotIndex];

        if (targetTabId) {
          get().updateSingleTab(targetTabId, {
            directory: dir,
            imageList: files,
            currentIndex: index >= 0 ? index : 0,
          });
        }
      }
    } catch (e) {
      console.error("Failed to open image:", e);
      return;
    }
  },

  reloadActiveImage: () => {
    const tab = get().singleTabs[get().activeTabId];
    if (!tab || !tab.directory || tab.imageList.length === 0) return;

    const currentPath = tab.imageList[tab.currentIndex];
    imageCache.delete(currentPath);
    get().updateSingleTab(tab.id, { reloadTrigger: Date.now() });
  },

  updateImageList: async (tabId: string) => {
    const tab = get().singleTabs[tabId];
    if (!tab || !tab.directory) return;

    try {
      const files = await getSortedImageFiles(tab.directory);
      get().updateSingleTab(tab.id, {
        imageList: files,
        currentIndex: Math.min(tab.currentIndex, files.length - 1),
      });
    } catch (e) {
      console.error("Failed to update image list:", e);
    }
  },
});
