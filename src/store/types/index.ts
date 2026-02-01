/**
 * SingleTabState represents the state of a single image tab.
 * @remarks To determine if a SingleTab is a child of a ComparisonTab, check if parentId is not null.
 */
export type SingleTabState = {
  /** The UUID of the tab */
  id: string;
  /** The parent tab's UUID, if any */
  parentId: string | null;
  /** The directory containing the open image, if any */
  directory: string | null;
  /** List of images in the directory */
  imageList: string[];
  /** The index of the currently open image */
  currentIndex: number;
  /** Current zoom level */
  zoom: number;
  /** Current pan offset */
  panOffset: { x: number; y: number };
  /** A trigger to reload the image when its value changes */
  reloadTrigger?: number;
};

/**
 * ComparisonTabState represents the state of a comparison tab containing multiple single tabs.
 */
export type ComparisonTabState = {
  /** The UUID of the tab */
  id: string;
  /** The child tabs contained within this comparison tab (up to 4) */
  children: string[];
  /** The index of the currently active slot */
  activeSlotIndex: number;
};

/**
 * TabStoreState represents the overall state of the tab store, including single and comparison tabs.
 */
export type TabStoreState = {
  /** The single tabs in the tab store */
  singleTabs: Record<string, SingleTabState>;
  /** The comparison tabs in the tab store */
  comparisonTabs: Record<string, ComparisonTabState>;
  /** The UUID and sort order of all tabs, including the single tabs and comparison tabs */
  tabOrder: string[];
  activeTabId: string;
  addSingleTab: (
    imageList: string[],
    currentIndex: number,
    directory: string | null,
  ) => string;
  addComparisonTab: (
    childrenIds: string[],
    activeSlotIndex: number | null,
  ) => string;
  removeSingleTab: (id: string) => void;
  removeChild: (comparisonId: string, slotIndex: number) => void;
  setCurrentIndex: (id: string, index: number) => void;
  updateSingleTab: (id: string, tab: Partial<SingleTabState>) => void;
  setZoom: (id: string, zoom: number) => void;
  setPanOffset: (id: string, offset: { x: number; y: number }) => void;
  resetZoomAndPan: (id: string) => void;
  setActiveTab: (id: string) => void;
  setActiveSlotIndex: (id: string, slotIndex: number) => void;
  reorderTab: (fromIndex: number, toIndex: number) => void;
  detachToSingleTab: (comparisonId: string, slotIndex: number) => void;
  detachAllChildren: (comparisonId: string) => void;
  createComparisonFromSingleTabs: (ids: string[]) => void;
  reorderComparisonChildren: (
    comparisonId: string,
    fromIndex: number,
    toIndex: number,
  ) => void;
};
