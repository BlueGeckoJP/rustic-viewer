import { temporal } from "zundo";
import { create } from "zustand";
import { createChildManagementActions } from "./actions/childManagementActions";
import { createCommonActions } from "./actions/commonActions";
import { createComparisonTabActions } from "./actions/comparisonTabActions";
import { createSingleTabActions } from "./actions/singleTabActions";
import { createTabOrderActions } from "./actions/tabOrderActions";
import {
  parseSession,
  reducedToSingleTabs,
  saveSession,
} from "./persistedSession";
import type { SingleTabState, TabStoreState } from "./types";

const restored = parseSession();

export const useTabStore = create<TabStoreState>()(
  temporal(
    (...a) => ({
      singleTabs: restored ? reducedToSingleTabs(restored.singleTabs) : {},
      comparisonTabs: restored ? restored.comparisonTabs : {},
      tabOrder: restored ? restored.tabOrder : [],
      activeTabId: restored ? restored.activeTabId : "",

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

if (typeof window !== "undefined") {
  let timer: number | null = null;

  useTabStore.subscribe((state) => {
    if (timer !== null) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      saveSession(state);
    }, 300);
  });

  window.addEventListener("beforeunload", () => {
    saveSession(useTabStore.getState());
  });
}

export type {
  ComparisonTabState,
  SingleTabState,
  TabStoreState,
} from "./types";
