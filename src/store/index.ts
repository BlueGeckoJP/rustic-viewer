import { temporal } from "zundo";
import { create } from "zustand";
import { createChildManagementActions } from "./actions/childManagementActions";
import { createCommonActions } from "./actions/commonActions";
import { createComparisonTabActions } from "./actions/comparisonTabActions";
import { createSingleTabActions } from "./actions/singleTabActions";
import { createTabOrderActions } from "./actions/tabOrderActions";
import type { SingleTabState, TabStoreState } from "./types";

export const useTabStore = create<TabStoreState>()(
  temporal(
    (...a) => ({
      singleTabs: {},
      comparisonTabs: {},
      tabOrder: [],
      activeTabId: "",

      ...createSingleTabActions(...a),
      ...createChildManagementActions(...a),
      ...createComparisonTabActions(...a),
      ...createCommonActions(...a),
      ...createTabOrderActions(...a),
    }),
    {
      limit: 100,
      partialize: (state) => {
        const partialSingleTabs: SingleTabState[] = Object.fromEntries(
          Object.entries(state.singleTabs).map(([id, tab]) => [
            [id],
            {
              ...tab,
              zoom: 1,
              panOffset: { x: 0, y: 0 },
            },
          ]),
        );

        return {
          singleTabs: partialSingleTabs,
          comparisonTabs: state.comparisonTabs,
          tabOrder: state.tabOrder,
        };
      },
      equality: (a, b) => {
        return (
          JSON.stringify(a.singleTabs) === JSON.stringify(b.singleTabs) &&
          a.comparisonTabs === b.comparisonTabs &&
          a.tabOrder === b.tabOrder
        );
      },
    },
  ),
);

export type {
  ComparisonTabState,
  SingleTabState,
  TabStoreState,
} from "./types";
