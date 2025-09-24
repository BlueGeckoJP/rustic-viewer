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
  // children stored in insertion-ordered Map keyed by child id
  children: Map<string, SingleTab>;
  // ordering for children (explicit order kept – Map preserves insertion but this stays authoritative)
  childrenOrder: string[];
  activeSlotIndex: number;
  // Future: layoutMode?: 'auto' | 'row' | 'grid2x2';
  // Future: sync?: { zoom?: boolean; pan?: boolean };
};

export const isSingleTab = (tab: Tab): tab is SingleTab =>
  tab.type === "single";
export const isComparisonTab = (tab: Tab): tab is ComparisonTab =>
  tab.type === "comparison";

// Convenience selector helpers (non-breaking additions)
export const getAllTabsArray = (tabs: Map<string, Tab>): Tab[] =>
  Array.from(tabs.values());

// Helper: centralize the logic for updating a comparison tab after its children change
// Works with the store's map-based tabs and childrenOrder representation.
function normalizeComparisonAfterChildrenChangeMap(
  tabs: Map<string, Tab>,
  tabOrder: string[],
  comparisonId: string,
  comp: ComparisonTab,
  newChildren: Map<string, SingleTab>,
  newChildrenOrder: string[],
  removedChildIndex?: number,
): { tabs: Map<string, Tab>; tabOrder: string[]; activeTabId?: string } {
  const outTabs = new Map(tabs);
  const outOrder = [...tabOrder];

  if (newChildrenOrder.length === 1) {
    const remainingId = newChildrenOrder[0];
    const remaining = newChildren.get(remainingId);
    if (!remaining) return { tabs: outTabs, tabOrder: outOrder };
    // Replace comparison with remaining single
    outTabs.delete(comparisonId);
    outTabs.set(remainingId, remaining);
    const idx = outOrder.indexOf(comparisonId);
    if (idx >= 0) outOrder.splice(idx, 1, remainingId);
    else outOrder.push(remainingId);
    return { tabs: outTabs, tabOrder: outOrder, activeTabId: remainingId };
  } else if (newChildrenOrder.length === 0) {
    // Remove comparison entirely
    outTabs.delete(comparisonId);
    const filtered = outOrder.filter((tid) => tid !== comparisonId);
    return { tabs: outTabs, tabOrder: filtered };
  } else {
    const adjustedActive = Math.min(
      comp.activeSlotIndex >= (removedChildIndex ?? 0)
        ? comp.activeSlotIndex - 1
        : comp.activeSlotIndex,
      newChildrenOrder.length - 1,
    );
    const newComp: ComparisonTab = {
      ...comp,
      children: new Map(newChildren),
      childrenOrder: [...newChildrenOrder],
      activeSlotIndex: adjustedActive,
    };
    outTabs.set(comparisonId, newComp);
    return { tabs: outTabs, tabOrder: outOrder };
  }
}

type TabStore = {
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

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: new Map(),
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
    set((state) => {
      const newTabs = new Map(state.tabs);
      newTabs.set(id, tab);
      return {
        tabs: newTabs,
        tabOrder: [...state.tabOrder, id],
        activeTabId: id,
      };
    });
    return id;
  },

  addComparisonTab: (children, activeSlotIndex) => {
    const id = uuid();
    const childrenMap = new Map<string, SingleTab>();
    const childrenOrder: string[] = [];
    children.forEach((c) => {
      childrenMap.set(c.id, c);
      childrenOrder.push(c.id);
    });
    const tab: ComparisonTab = {
      id,
      type: "comparison",
      children: childrenMap,
      childrenOrder,
      activeSlotIndex,
    };
    set((state) => {
      const newTabs = new Map(state.tabs);
      newTabs.set(id, tab);
      return {
        tabs: newTabs,
        tabOrder: [...state.tabOrder, id],
        activeTabId: id,
      };
    });
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
        const t = state.tabs.get(tid);
        if (t && t.type === "single" && uniq.includes(t.id)) {
          orderedSingles.push(t);
        } else if (t) {
          remainingOrder.push(tid);
        }
      });

      if (orderedSingles.length < 2) return state;

      const limited = orderedSingles.slice(0, 4);

      const comparisonId = uuid();
      const childrenMap = new Map<string, SingleTab>();
      const childrenOrder: string[] = [];
      limited.forEach((c) => {
        childrenMap.set(c.id, c);
        childrenOrder.push(c.id);
      });

      const comparison: ComparisonTab = {
        id: comparisonId,
        type: "comparison",
        children: childrenMap,
        childrenOrder,
        activeSlotIndex: 0,
      };

      const firstIndexInOld = state.tabOrder.findIndex((tid) => {
        const t = state.tabs.get(tid);
        return t?.type === "single" && uniq.includes(t.id);
      });

      const newTabs = new Map(state.tabs);
      limited.map((c) => newTabs.delete(c.id));

      const newOrder: string[] = [];
      let inserted = false;
      for (let i = 0; i < state.tabOrder.length; i++) {
        if (i === firstIndexInOld) {
          newTabs.set(comparisonId, comparison);
          newOrder.push(comparisonId);
          inserted = true;
        }
        const tid = state.tabOrder[i];
        const t = state.tabs.get(tid);
        if (t?.type === "single" && uniq.includes(t.id)) continue;
        newOrder.push(tid);
      }
      if (!inserted) {
        newTabs.set(comparisonId, comparison);
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
      const newTabs = new Map(state.tabs);
      newTabs.delete(id);
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
    const t = get().tabs.get(id);
    return t && isSingleTab(t) ? t : null;
  },

  getComparisonTab: (id) => {
    const t = get().tabs.get(id);
    return t && isComparisonTab(t) ? t : null;
  },

  updateSingleTab: (id, patch) => {
    set((state) => {
      const existing = state.tabs.get(id);
      if (!existing || existing.type !== "single") return state;
      const updated = { ...existing, ...patch } as SingleTab;
      const newTabs = new Map(state.tabs);
      newTabs.set(id, updated);
      return { tabs: newTabs };
    });
  },

  setActiveTab: (id) => {
    set({ activeTabId: id });
  },

  setCurrentIndex: (id, index) => {
    set((state) => {
      const currentTabs = state.tabs;
      const direct = currentTabs.get(id);
      if (direct && direct.type === "single") {
        const newTabs = new Map(currentTabs);
        newTabs.set(id, { ...direct, currentIndex: index });
        return { tabs: newTabs };
      }
      // search comparisons for child
      for (const tid of state.tabOrder) {
        const tab = currentTabs.get(tid);
        if (tab && tab.type === "comparison" && tab.children.has(id)) {
          const child = tab.children.get(id);
          if (!child) return state;
          const newChild = { ...child, currentIndex: index };
          const newChildren = new Map(tab.children);
          newChildren.set(id, newChild);
          const newTabs = new Map(currentTabs);
          newTabs.set(tid, { ...tab, children: newChildren });
          return { tabs: newTabs };
        }
      }
      return state;
    });
  },

  setActiveSlotIndex: (id, slotIndex) => {
    set((state) => {
      const tab = state.tabs.get(id);
      if (!tab || tab.type !== "comparison") return state;
      const newTabs = new Map(state.tabs);
      newTabs.set(id, { ...tab, activeSlotIndex: slotIndex });
      return { tabs: newTabs };
    });
  },

  updateComparisonChildren: (id, children) => {
    set((state) => {
      const tab = state.tabs.get(id);
      if (!tab || tab.type !== "comparison") return state;
      const childrenOrder = tab.childrenOrder.filter((cid) =>
        children.has(cid),
      );
      // ensure order includes any new ids in insertion order
      for (const key of children.keys()) {
        if (!childrenOrder.includes(key)) childrenOrder.push(key);
      }
      const newTabs = new Map(state.tabs);
      newTabs.set(id, { ...tab, children: new Map(children), childrenOrder });
      return { tabs: newTabs };
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
        return state;
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
      const comp = state.tabs.get(comparisonId);
      if (!comp || comp.type !== "comparison") return state;
      const order = [...comp.childrenOrder];
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= order.length ||
        toIndex >= order.length
      )
        return state;
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
      const newTabs = new Map(state.tabs);
      newTabs.set(comparisonId, newComp);
      return { tabs: newTabs };
    });
  },

  detachChildToTopLevel: (comparisonId, childId, insertAfterParent = true) => {
    set((state) => {
      const comp = state.tabs.get(comparisonId);
      if (!comp || comp.type !== "comparison") return state;
      const childIndex = comp.childrenOrder.indexOf(childId);
      if (childIndex < 0) return state;
      const child = comp.children.get(childId);
      if (!child) return state;

      const newChildrenOrder = comp.childrenOrder.filter(
        (cid) => cid !== childId,
      );
      const newChildren = new Map(comp.children);
      newChildren.delete(childId);

      const newTabs = new Map(state.tabs);
      // Insert child as top-level tab at position
      const insertPos = insertAfterParent
        ? state.tabOrder.indexOf(comparisonId) + 1
        : state.tabOrder.length;
      const newOrder = [...state.tabOrder];
      newOrder.splice(insertPos, 0, childId);
      newTabs.set(childId, child);

      return normalizeComparisonAfterChildrenChangeMap(
        newTabs,
        newOrder,
        comparisonId,
        comp,
        newChildren,
        newChildrenOrder,
        childIndex,
      );
    });
  },

  removeChildFromComparison: (comparisonId, childId) => {
    set((state) => {
      const comp = state.tabs.get(comparisonId);
      if (!comp || comp.type !== "comparison") return state;
      const childIndex = comp.childrenOrder.findIndex((cid) => cid === childId);
      if (childIndex < 0) return state;
      const newChildrenOrder = comp.childrenOrder.filter(
        (cid) => cid !== childId,
      );
      const newChildren = new Map(comp.children);
      newChildren.delete(childId);
      const newTabs = new Map(state.tabs);
      const newOrder = [...state.tabOrder];

      return normalizeComparisonAfterChildrenChangeMap(
        newTabs,
        newOrder,
        comparisonId,
        comp,
        newChildren,
        newChildrenOrder,
        childIndex,
      );
    });
  },

  detachAllChildren: (comparisonId) => {
    set((state) => {
      const comp = state.tabs.get(comparisonId);
      if (!comp || comp.type !== "comparison") return state;
      const newTabs = new Map(state.tabs);
      newTabs.delete(comparisonId);
      const newOrder = [...state.tabOrder];
      const compIndex = newOrder.indexOf(comparisonId);
      if (compIndex < 0) return state;
      // insert children ids at compIndex in order
      newOrder.splice(compIndex, 1, ...comp.childrenOrder);
      // add children to map
      comp.childrenOrder.forEach((cid) => {
        const child = comp.children.get(cid);
        if (!child) return;
        newTabs.set(cid, child);
      });
      return {
        tabs: newTabs,
        tabOrder: newOrder,
        activeTabId: comp.childrenOrder[0] || null,
      };
    });
  },
}));
