import { create } from "zustand";
import { createChildManagementActions } from "./actions/childManagementActions";
import { createCommonActions } from "./actions/commonActions";
import { createComparisonTabActions } from "./actions/comparisonTabActions";
import { createSingleTabActions } from "./actions/singleTabActions";
import { createTabOrderActions } from "./actions/tabOrderActions";
import type { TabStoreState } from "./types";

export const useTabStore = create<TabStoreState>()((...a) => ({
  singleTabs: {},
  comparisonTabs: {},
  tabOrder: [],
  activeTabId: "",

  ...createSingleTabActions(...a),
  ...createChildManagementActions(...a),
  ...createComparisonTabActions(...a),
  ...createCommonActions(...a),
  ...createTabOrderActions(...a),
}));

export type {
  ComparisonTabState,
  SingleTabState,
  TabStoreState,
} from "./types";
