export type SingleTabState = {
  id: string;
  parentId: string | null;
  directory: string | null;
  imageList: string[];
  currentIndex: number;
  zoom: number;
  panOffset: { x: number; y: number };
};

export type ComparisonTabState = {
  id: string;
  children: string[];
  activeSlotIndex: number;
};

export type TabStoreState = {
  singleTabs: Record<string, SingleTabState>;
  comparisonTabs: Record<string, ComparisonTabState>;
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
};
