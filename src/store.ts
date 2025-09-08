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
  children: SingleTab[]; // The original single tabs are moved here (not duplicated)
  activeSlotIndex: number;
  // Future: layoutMode?: 'auto' | 'row' | 'grid2x2';
  // Future: sync?: { zoom?: boolean; pan?: boolean };
};

export const isSingleTab = (tab: Tab): tab is SingleTab =>
  tab.type === "single";
export const isComparisonTab = (tab: Tab): tab is ComparisonTab =>
  tab.type === "comparison";

type TabStore = {
  tabs: Tab[];
  activeTabId: string | null;
  addSingleTab: (
    directory: string | null,
    imageList: string[],
    currentIndex: number
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
  updateComparisonChildren: (id: string, children: SingleTab[]) => void;
  reorderTab: (fromIndex: number, toIndex: number) => void;
  // --- New child management APIs (Level 2) ---
  reorderComparisonChildren: (
    comparisonId: string,
    fromIndex: number,
    toIndex: number
  ) => void;
  detachChildToTopLevel: (
    comparisonId: string,
    childId: string,
    insertAfterParent?: boolean
  ) => void;
  removeChildFromComparison: (
    comparisonId: string,
    childId: string
  ) => void;
  detachAllChildren: (comparisonId: string) => void;
};

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

  // Move selected single tabs into a new comparison tab
  createComparisonFromSingleIds: (ids) => {
    const uniq = Array.from(new Set(ids));
    if (uniq.length < 2) return null;

    set((state) => {
      // Preserve the order they appear in the current tab list
      const orderedSingles: SingleTab[] = [];
      const remaining: Tab[] = [];
      state.tabs.forEach((t) => {
        if (t.type === "single" && uniq.includes(t.id)) {
          orderedSingles.push(t);
        } else {
          remaining.push(t);
        }
      });

      if (orderedSingles.length < 2) {
        return {}; // Nothing to do
      }

      // Limit to 4
      const limited = orderedSingles.slice(0, 4);

      // Find the first index where one of the selected tabs appeared
      const firstIndexInOld = state.tabs.findIndex(
        (t) => t.type === "single" && uniq.includes(t.id)
      );

      const comparisonId = uuid();
      const comparison: ComparisonTab = {
        id: comparisonId,
        type: "comparison",
        children: limited,
        activeSlotIndex: 0,
      };

      // Insert the comparison tab where the first selected single tab was
      const newTabs: Tab[] = [];
      let inserted = false;
      for (let i = 0; i < state.tabs.length; i++) {
        if (i === firstIndexInOld) {
          newTabs.push(comparison);
          inserted = true;
        }
        const t = state.tabs[i];
        // Skip moved singles
        if (t.type === "single" && uniq.includes(t.id)) continue;
        newTabs.push(t);
      }
      if (!inserted) {
        newTabs.push(comparison);
      }

      return {
        tabs: newTabs,
        activeTabId: comparisonId,
      };
    });

    return null;
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
          // Update only if one of its children matches
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
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= state.tabs.length ||
        toIndex > state.tabs.length
      ) {
        return {} as any;
      }
      const tabs = [...state.tabs];
      const [moved] = tabs.splice(fromIndex, 1);
      tabs.splice(toIndex, 0, moved);
      return { tabs };
    });
  },

  // --- New child management implementations ---
  reorderComparisonChildren: (comparisonId, fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    set((state) => ({
      tabs: state.tabs.map((t) => {
        if (t.id === comparisonId && t.type === "comparison") {
          if (
            fromIndex < 0 ||
            toIndex < 0 ||
            fromIndex >= t.children.length ||
            toIndex >= t.children.length
          ) {
            return t;
          }
          const children = [...t.children];
          const [moved] = children.splice(fromIndex, 1);
          children.splice(toIndex, 0, moved);
          let newActive = t.activeSlotIndex;
          if (t.activeSlotIndex === fromIndex) newActive = toIndex;
          else if (
            fromIndex < t.activeSlotIndex &&
            toIndex >= t.activeSlotIndex
          )
            newActive = t.activeSlotIndex - 1;
          else if (
            fromIndex > t.activeSlotIndex &&
            toIndex <= t.activeSlotIndex
          )
            newActive = t.activeSlotIndex + 1;
          return { ...t, children, activeSlotIndex: newActive };
        }
        return t;
      }),
    }));
  },

  detachChildToTopLevel: (comparisonId, childId, insertAfterParent = true) => {
    set((state) => {
      const tabs = [...state.tabs];
      const compIndex = tabs.findIndex(
        (t) => t.id === comparisonId && t.type === "comparison"
      );
      if (compIndex < 0) return {} as any;
      const comp = tabs[compIndex] as ComparisonTab;
      const childIdx = comp.children.findIndex((c) => c.id === childId);
      if (childIdx < 0) return {} as any;
      const child = comp.children[childIdx];

      const newChildren = comp.children.filter((c) => c.id !== childId);

      // Insert new top-level single tab after parent or at end
      const insertIndex = insertAfterParent
        ? compIndex + 1
        : tabs.length;
      tabs.splice(insertIndex, 0, child);

      // If only 0 or 1 child left, decide policy
      if (newChildren.length === 1) {
        // Promote remaining single as its own tab and remove comparison
        const remaining = newChildren[0];
        tabs.splice(compIndex, 1, remaining);
        return {
          tabs,
          activeTabId: remaining.id,
        };
      } else if (newChildren.length === 0) {
        // Remove comparison entirely
        tabs.splice(compIndex, 1);
        return { tabs };
      } else {
        tabs[compIndex] = {
          ...comp,
          children: newChildren,
          activeSlotIndex: Math.min(
            comp.activeSlotIndex >= childIdx
              ? comp.activeSlotIndex - 1
              : comp.activeSlotIndex,
            newChildren.length - 1
          ),
        };
      }
      return { tabs };
    });
  },

  removeChildFromComparison: (comparisonId, childId) => {
    set((state) => {
      const tabs = [...state.tabs];
      const compIndex = tabs.findIndex(
        (t) => t.id === comparisonId && t.type === "comparison"
      );
      if (compIndex < 0) return {} as any;
      const comp = tabs[compIndex] as ComparisonTab;
      const newChildren = comp.children.filter((c) => c.id !== childId);
      if (newChildren.length === 1) {
        const remaining = newChildren[0];
        tabs.splice(compIndex, 1, remaining);
        return { tabs, activeTabId: remaining.id };
      } else if (newChildren.length === 0) {
        tabs.splice(compIndex, 1);
        return { tabs };
      } else {
        tabs[compIndex] = {
          ...comp,
          children: newChildren,
          activeSlotIndex: Math.min(
            comp.activeSlotIndex >= newChildren.length
              ? newChildren.length - 1
              : comp.activeSlotIndex,
            newChildren.length - 1
          ),
        };
      }
      return { tabs };
    });
  },

  detachAllChildren: (comparisonId) => {
    set((state) => {
      const tabs = [...state.tabs];
      const compIndex = tabs.findIndex(
        (t) => t.id === comparisonId && t.type === "comparison"
      );
      if (compIndex < 0) return {} as any;
      const comp = tabs[compIndex] as ComparisonTab;
      // Replace comparison with its children preserving order
      tabs.splice(compIndex, 1, ...comp.children);
      return { tabs, activeTabId: comp.children[0]?.id || null };
    });
  },
}));
