// Type definitions for the tab store

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
  // children stored in insertion-ordered Map keyed by child id
  children: Map<string, SingleTab>;
  // ordering for children (explicit order kept – Map preserves insertion but this stays authoritative)
  childrenOrder: string[];
  activeSlotIndex: number;
  // Future: layoutMode?: 'auto' | 'row' | 'grid2x2';
  // Future: sync?: { zoom?: boolean; pan?: boolean };
};

export type TabStore = {
  // tabs keyed by id
  tabs: Map<string, Tab>;
  // ordering for top-level tabs
  tabOrder: string[];
  activeTabId: string | null;
  addSingleTab: (
    directory: string | null,
    imageList: string[],
    currentIndex: number,
  ) => string;
  addComparisonTab: (children: SingleTab[], activeSlotIndex: number) => string;
  // Creates a comparison tab by moving the selected single tabs into it
  createComparisonFromSingleIds: (ids: string[]) => string | null;
  removeTab: (id: string) => void;
  getSingleTab: (id: string) => SingleTab | null;
  getComparisonTab: (id: string) => ComparisonTab | null;
  setCurrentIndex: (id: string, index: number) => void;
  updateSingleTab: (id: string, tab: Partial<SingleTab>) => void;
  setActiveTab: (id: string) => void;
  setActiveSlotIndex: (id: string, slotIndex: number) => void;
  updateComparisonChildren: (
    id: string,
    children: Map<string, SingleTab>,
  ) => void;
  reorderTab: (fromIndex: number, toIndex: number) => void;
  // --- New child management APIs (Level 2) ---
  reorderComparisonChildren: (
    comparisonId: string,
    fromIndex: number,
    toIndex: number,
  ) => void;
  detachChildToTopLevel: (
    comparisonId: string,
    childId: string,
    insertAfterParent?: boolean,
  ) => void;
  removeChildFromComparison: (comparisonId: string, childId: string) => void;
  detachAllChildren: (comparisonId: string) => void;
};
