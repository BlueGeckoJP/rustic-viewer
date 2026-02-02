import { temporal } from "zundo";
import { create } from "zustand";
import { PERSIST_SAVE_DELAY_MS } from "../constants";
import { createChildManagementActions } from "./actions/childManagementActions";
import { createCommonActions } from "./actions/commonActions";
import { createComparisonTabActions } from "./actions/comparisonTabActions";
import { createImageActions } from "./actions/imageActions";
import { createSingleTabActions } from "./actions/singleTabActions";
import { createTabOrderActions } from "./actions/tabOrderActions";
import type { TabStoreState } from "./types";
import {
  parseSession,
  reducedToSingleTabs,
  saveSession,
} from "./types/persistedSession";

const restored = await parseSession();
const restoredSingleTabs: TabStoreState["singleTabs"] = restored
  ? await reducedToSingleTabs(restored.singleTabs)
  : {};

export const useTabStore = create<TabStoreState>()(
  temporal(
    (...a) => ({
      singleTabs: restoredSingleTabs,
      comparisonTabs: restored ? restored.comparisonTabs : {},
      tabOrder: restored ? restored.tabOrder : [],
      activeTabId: restored ? restored.activeTabId : "",

      ...createSingleTabActions(...a),
      ...createChildManagementActions(...a),
      ...createComparisonTabActions(...a),
      ...createCommonActions(...a),
      ...createTabOrderActions(...a),
      ...createImageActions(...a),
    }),
    {
      limit: 100,
      partialize: (state) => {
        return {
          singleTabs: state.singleTabs,
          comparisonTabs: state.comparisonTabs,
          tabOrder: state.tabOrder,
          activeTabId: state.activeTabId,
        };
      },
      equality: (a, b) => {
        return a.tabOrder.toString() === b.tabOrder.toString();
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
    }, PERSIST_SAVE_DELAY_MS);
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
