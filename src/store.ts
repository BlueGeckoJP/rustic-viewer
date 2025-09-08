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
  // children stored as a map keyed by child id
  children: Record<string, SingleTab>;
  // ordering for children
  childrenOrder: string[];
  activeSlotIndex: number;
  // Future: layoutMode?: 'auto' | 'row' | 'grid2x2';
  // Future: sync?: { zoom?: boolean; pan?: boolean };
};

export const isSingleTab = (tab: Tab): tab is SingleTab =>
  tab.type === "single";
export const isComparisonTab = (tab: Tab): tab is ComparisonTab =>
  tab.type === "comparison";

// Helper: centralize the logic for updating a comparison tab after its children change
// Works with the store's map-based tabs and childrenOrder representation.
function normalizeComparisonAfterChildrenChangeMap(
  tabs: Record<string, Tab>,
  tabOrder: string[],
  comparisonId: string,
  comp: ComparisonTab,
  newChildren: Record<string, SingleTab>,
  newChildrenOrder: string[],
  removedChildIndex?: number
): { tabs: Record<string, Tab>; tabOrder: string[]; activeTabId?: string } {
  const outTabs = { ...tabs };
  const outOrder = [...tabOrder];

  if (newChildrenOrder.length === 1) {
    const remainingId = newChildrenOrder[0];
    const remaining = newChildren[remainingId];
    // Replace comparison with remaining single
    delete outTabs[comparisonId];
    outTabs[remainingId] = remaining;
    const idx = outOrder.indexOf(comparisonId);
    if (idx >= 0) outOrder.splice(idx, 1, remainingId);
    else outOrder.push(remainingId);
    return { tabs: outTabs, tabOrder: outOrder, activeTabId: remainingId };
  } else if (newChildrenOrder.length === 0) {
    // Remove comparison entirely
    delete outTabs[comparisonId];
    const filtered = outOrder.filter((tid) => tid !== comparisonId);
    return { tabs: outTabs, tabOrder: filtered };
  } else {
    const adjustedActive = Math.min(
      comp.activeSlotIndex >= (removedChildIndex ?? 0)
        ? comp.activeSlotIndex - 1
        : comp.activeSlotIndex,
      newChildrenOrder.length - 1
    );
    const newComp: ComparisonTab = {
      ...comp,
      children: { ...newChildren },
      childrenOrder: [...newChildrenOrder],
      activeSlotIndex: adjustedActive,
    };
    outTabs[comparisonId] = newComp;
    return { tabs: outTabs, tabOrder: outOrder };
  }
}

type TabStore = {
  // tabs keyed by id
  tabs: Record<string, Tab>;
  // ordering for top-level tabs
  tabOrder: string[];
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
  updateComparisonChildren: (
    id: string,
    children: Record<string, SingleTab>
  ) => void;
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
  removeChildFromComparison: (comparisonId: string, childId: string) => void;
  detachAllChildren: (comparisonId: string) => void;
};

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: {},
  tabOrder: [],
  activeTabId: null,

  addSingleTab: (directory, imageList, currentIndex) => {
    const id = uuid();
    const tab: SingleTab = {
      id,
      type: "single",
      directory,
      imageList,
      currentIndex,
    };
    set((state) => ({
      tabs: { ...state.tabs, [id]: tab },
      tabOrder: [...state.tabOrder, id],
      activeTabId: id,
    }));
    return id;
  },

  addComparisonTab: (children, activeSlotIndex) => {
    const id = uuid();
    const childrenMap: Record<string, SingleTab> = {};
    const childrenOrder: string[] = [];
    children.forEach((c) => {
      childrenMap[c.id] = c;
      childrenOrder.push(c.id);
    });
    const tab: ComparisonTab = {
      id,
      type: "comparison",
      children: childrenMap,
      childrenOrder,
      activeSlotIndex,
    };
    set((state) => ({
      tabs: { ...state.tabs, [id]: tab },
      tabOrder: [...state.tabOrder, id],
      activeTabId: id,
    }));
    return id;
  },

  // Move selected single tabs into a new comparison tab
  createComparisonFromSingleIds: (ids) => {
    const uniq = Array.from(new Set(ids));
    if (uniq.length < 2) return null;

    set((state) => {
      // Preserve order according to tabOrder
      const orderedSingles: SingleTab[] = [];
      const remainingOrder: string[] = [];
      state.tabOrder.forEach((tid) => {
        const t = state.tabs[tid];
        if (t && t.type === "single" && uniq.includes(t.id)) {
          orderedSingles.push(t);
        } else if (t) {
          remainingOrder.push(tid);
        }
      });

      if (orderedSingles.length < 2) return {} as any;

      const limited = orderedSingles.slice(0, 4);

      const comparisonId = uuid();
      const childrenMap: Record<string, SingleTab> = {};
      const childrenOrder: string[] = [];
      limited.forEach((c) => {
        childrenMap[c.id] = c;
        childrenOrder.push(c.id);
      });

      const comparison: ComparisonTab = {
        id: comparisonId,
        type: "comparison",
        children: childrenMap,
        childrenOrder,
        activeSlotIndex: 0,
      };

      // Find the first index in tabOrder where one of the selected singles appeared
      const firstIndexInOld = state.tabOrder.findIndex((tid) => {
        const t = state.tabs[tid];
        return t?.type === "single" && uniq.includes(t.id);
      });

      // Build new tabs map and order: remove moved singles, insert comparison at firstIndexInOld
      const newTabs = { ...state.tabs };
      // delete moved singles
      limited.forEach((c) => delete newTabs[c.id]);

      const newOrder: string[] = [];
      let inserted = false;
      for (let i = 0; i < state.tabOrder.length; i++) {
        if (i === firstIndexInOld) {
          newTabs[comparisonId] = comparison;
          newOrder.push(comparisonId);
          inserted = true;
        }
        const tid = state.tabOrder[i];
        const t = state.tabs[tid];
        if (t?.type === "single" && uniq.includes(t.id)) continue; // skip moved
        newOrder.push(tid);
      }
      if (!inserted) {
        newTabs[comparisonId] = comparison;
        newOrder.push(comparisonId);
      }

      return {
        tabs: newTabs,
        tabOrder: newOrder,
        activeTabId: comparisonId,
      };
    });

    return null;
  },

  removeTab: (id) => {
    set((state) => {
      const newTabs = { ...state.tabs };
      delete newTabs[id];
      const newOrder = state.tabOrder.filter((tid) => tid !== id);
      const activeTabId =
        state.activeTabId === id
          ? newOrder.length > 0
            ? newOrder[newOrder.length - 1]
            : null
          : state.activeTabId;
      return { tabs: newTabs, tabOrder: newOrder, activeTabId };
    });
  },

  getSingleTab: (id) => {
    const t = get().tabs[id];
    return t && isSingleTab(t) ? t : null;
  },

  getComparisonTab: (id) => {
    const t = get().tabs[id];
    return t && isComparisonTab(t) ? t : null;
  },

  updateSingleTab: (id, patch) => {
    set((state) => {
      const existing = state.tabs[id];
      if (!existing || existing.type !== "single") return {} as any;
      const updated = { ...existing, ...patch } as SingleTab;
      return { tabs: { ...state.tabs, [id]: updated } };
    });
  },

  setActiveTab: (id) => {
    set({ activeTabId: id });
  },

  setCurrentIndex: (id, index) => {
    set((state) => {
      const tabs = { ...state.tabs };
      const t = tabs[id];
      if (t && t.type === "single") {
        tabs[id] = { ...t, currentIndex: index };
        return { tabs };
      }
      // search comparisons for child
      for (const tid of state.tabOrder) {
        const tab = tabs[tid];
        if (tab && tab.type === "comparison") {
          if (tab.children[id]) {
            const child = tab.children[id];
            const newChild = { ...child, currentIndex: index };
            const newChildren = { ...tab.children, [id]: newChild };
            tabs[tid] = { ...tab, children: newChildren };
            return { tabs };
          }
        }
      }
      return {} as any;
    });
  },

  setActiveSlotIndex: (id, slotIndex) => {
    set((state) => {
      const tab = state.tabs[id];
      if (!tab || tab.type !== "comparison") return {} as any;
      return {
        tabs: { ...state.tabs, [id]: { ...tab, activeSlotIndex: slotIndex } },
      };
    });
  },

  updateComparisonChildren: (id, children) => {
    set((state) => {
      const tab = state.tabs[id];
      if (!tab || tab.type !== "comparison") return {} as any;
      const childrenOrder = Object.keys(children);
      const childrenMap: Record<string, SingleTab> = { ...children };
      return {
        tabs: {
          ...state.tabs,
          [id]: { ...tab, children: childrenMap, childrenOrder },
        },
      };
    });
  },

  reorderTab: (fromIndex, toIndex) => {
    set((state) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= state.tabOrder.length ||
        toIndex > state.tabOrder.length
      ) {
        return {} as any;
      }
      const order = [...state.tabOrder];
      const [moved] = order.splice(fromIndex, 1);
      order.splice(toIndex, 0, moved);
      return { tabOrder: order };
    });
  },

  // --- New child management implementations ---
  reorderComparisonChildren: (comparisonId, fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    set((state) => {
      const comp = state.tabs[comparisonId];
      if (!comp || comp.type !== "comparison") return {} as any;
      const order = [...comp.childrenOrder];
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= order.length ||
        toIndex >= order.length
      )
        return {} as any;
      const [moved] = order.splice(fromIndex, 1);
      order.splice(toIndex, 0, moved);
      let newActive = comp.activeSlotIndex;
      if (comp.activeSlotIndex === fromIndex) newActive = toIndex;
      else if (
        fromIndex < comp.activeSlotIndex &&
        toIndex >= comp.activeSlotIndex
      )
        newActive = comp.activeSlotIndex - 1;
      else if (
        fromIndex > comp.activeSlotIndex &&
        toIndex <= comp.activeSlotIndex
      )
        newActive = comp.activeSlotIndex + 1;
      const newComp: ComparisonTab = {
        ...comp,
        childrenOrder: order,
        activeSlotIndex: newActive,
      };
      return { tabs: { ...state.tabs, [comparisonId]: newComp } };
    });
  },

  detachChildToTopLevel: (comparisonId, childId, insertAfterParent = true) => {
    set((state) => {
      const comp = state.tabs[comparisonId];
      if (!comp || comp.type !== "comparison") return {} as any;
      const childIndex = comp.childrenOrder.findIndex((cid) => cid === childId);
      if (childIndex < 0) return {} as any;
      const child = comp.children[childId];

      const newChildrenOrder = comp.childrenOrder.filter((cid) => cid !== childId);
      const newChildren = { ...comp.children };
      delete newChildren[childId];

      const newTabs = { ...state.tabs };
      // Insert child as top-level tab at position
      const insertPos = insertAfterParent
        ? state.tabOrder.indexOf(comparisonId) + 1
        : state.tabOrder.length;
      const newOrder = [...state.tabOrder];
      newOrder.splice(insertPos, 0, childId);
      newTabs[childId] = child;

      return normalizeComparisonAfterChildrenChangeMap(
        newTabs,
        newOrder,
        comparisonId,
        comp,
        newChildren,
        newChildrenOrder,
        childIndex
      );
    });
  },

  removeChildFromComparison: (comparisonId, childId) => {
    set((state) => {
      const comp = state.tabs[comparisonId];
      if (!comp || comp.type !== "comparison") return {} as any;
      const childIndex = comp.childrenOrder.findIndex((cid) => cid === childId);
      if (childIndex < 0) return {} as any;
      const newChildrenOrder = comp.childrenOrder.filter((cid) => cid !== childId);
      const newChildren = { ...comp.children };
      delete newChildren[childId];
      const newTabs = { ...state.tabs };
      const newOrder = [...state.tabOrder];

      return normalizeComparisonAfterChildrenChangeMap(
        newTabs,
        newOrder,
        comparisonId,
        comp,
        newChildren,
        newChildrenOrder,
        childIndex
      );
    });
  },

  detachAllChildren: (comparisonId) => {
    set((state) => {
      const comp = state.tabs[comparisonId];
      if (!comp || comp.type !== "comparison") return {} as any;
      const newTabs = { ...state.tabs };
      delete newTabs[comparisonId];
      const newOrder = [...state.tabOrder];
      const compIndex = newOrder.indexOf(comparisonId);
      if (compIndex < 0) return {} as any;
      // insert children ids at compIndex in order
      newOrder.splice(compIndex, 1, ...comp.childrenOrder);
      // add children to map
      comp.childrenOrder.forEach((cid) => {
        newTabs[cid] = comp.children[cid];
      });
      return {
        tabs: newTabs,
        tabOrder: newOrder,
        activeTabId: comp.childrenOrder[0] || null,
      };
    });
  },
}));
