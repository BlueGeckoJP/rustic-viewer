import type { StateCreator } from "zustand";
import type { TabStoreState } from "../types";

export const createTabOrderActions: StateCreator<
  TabStoreState,
  [],
  [],
  Pick<TabStoreState, "reorderTab">
> = (set) => ({
  reorderTab: (fromIndex, toIndex) => {
    set((state) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= state.tabOrder.length ||
        toIndex > state.tabOrder.length
      )
        return state;

      const order = [...state.tabOrder];
      const [moved] = order.splice(fromIndex, 1);
      order.splice(toIndex, 0, moved);
      return { ...state, tabOrder: order };
    });
  },
});
