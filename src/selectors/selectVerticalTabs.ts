import type { TabStoreState } from "../store/tabStoreState";

export type VerticalTabItem =
  | {
      kind: "comparison";
      id: string;
      active: boolean;
    }
  | {
      kind: "single";
      id: string;
      active: boolean;
      parentId: string;
      slotIndex: number;
    }
  | {
      kind: "single";
      id: string;
      active: boolean;
      parentId: null;
      slotIndex?: never;
    }
  | {
      kind: "spacer";
      id: string;
      active: false;
    };

export const selectVerticalTabs = (state: TabStoreState): VerticalTabItem[] => {
  const result: VerticalTabItem[] = [];

  for (const id of state.tabOrder) {
    const comparison = state.comparisonTabs[id];
    if (comparison) {
      result.push({
        kind: "comparison",
        id,
        active: state.activeTabId === id,
      });

      comparison.children.forEach((childId, slotIndex) => {
        result.push({
          kind: "single",
          id: childId,
          active: state.activeTabId === childId,
          parentId: id,
          slotIndex,
        });
      });

      continue;
    }

    const single = state.singleTabs[id];
    if (single && single.parentId === null) {
      result.push({
        kind: "single",
        id,
        active: state.activeTabId === id,
        parentId: null,
      });
    }
  }

  return result;
};
