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
          activeTabId: state.activeTabId,
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
  const key = "__rustic_viewer_persist__";

  type Persist = {
    timer: number | null;
    unsubscribe?: () => void;
    beforeUnload?: () => void;
  };

  const g = globalThis as unknown as Record<string, Persist | undefined>;

  // Unload any previous persist handlers (HMR)
  const prev = g[key];
  if (prev?.timer != null) window.clearTimeout(prev.timer);
  prev?.unsubscribe?.();
  if (prev?.beforeUnload) {
    window.removeEventListener("beforeunload", prev.beforeUnload);
  }

  // Set up new persist handlers
  const persist: Persist = { timer: null };
  g[key] = persist;

  persist.unsubscribe = useTabStore.subscribe((state) => {
    if (persist.timer != null) window.clearTimeout(persist.timer);
    persist.timer = window.setTimeout(() => {
      persist.timer = null;
      saveSession(state);
    }, 300);
  });

  persist.beforeUnload = () => saveSession(useTabStore.getState());
  window.addEventListener("beforeunload", persist.beforeUnload);

  // Handle HMR cleanup
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      if (persist.timer != null) window.clearTimeout(persist.timer);
      persist.unsubscribe?.();
      if (persist.beforeUnload) {
        window.removeEventListener("beforeunload", persist.beforeUnload);
      }
      g[key] = undefined;
    });
  }
}

export type {
  ComparisonTabState,
  SingleTabState,
  TabStoreState,
} from "./types";
