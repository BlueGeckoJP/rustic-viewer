// Type guard functions for tab types

import type { ComparisonTab, SingleTab, Tab } from "./types";

export const isSingleTab = (tab: Tab): tab is SingleTab =>
  tab.type === "single";

export const isComparisonTab = (tab: Tab): tab is ComparisonTab =>
  tab.type === "comparison";
