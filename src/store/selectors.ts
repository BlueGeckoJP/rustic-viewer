// Selector helper functions for accessing tab data

import type { Tab } from "./types";

// Convenience selector helpers (non-breaking additions)
export const getAllTabsArray = (tabs: Map<string, Tab>): Tab[] =>
  Array.from(tabs.values());
