// Main store combining all actions and state

import { create } from "zustand";
import { createChildManagementActions } from "./actions/childManagementActions";
import { createCommonActions } from "./actions/commonActions";
import { createComparisonTabActions } from "./actions/comparisonTabActions";
import { createSingleTabActions } from "./actions/singleTabActions";
import { createTabOrderActions } from "./actions/tabOrderActions";
import type { TabStore } from "./types";

export const useTabStore = create<TabStore>()((...a) => ({
  // Initial state
  tabs: new Map(),
  tabOrder: [],
  activeTabId: null,

  // Combine all action slices
  ...createSingleTabActions(...a),
  ...createComparisonTabActions(...a),
  ...createTabOrderActions(...a),
  ...createChildManagementActions(...a),
  ...createCommonActions(...a),
}));

export { isComparisonTab, isSingleTab } from "./guards";
export { getAllTabsArray } from "./selectors";
// Re-export types, guards, and selectors for convenience
export type { ComparisonTab, SingleTab, Tab, TabStore } from "./types";
