import { STORAGE_KEY } from "../constants";
import type { PersistedSessionV1, TabStoreState } from "./types";

export function parseSession(): PersistedSessionV1 | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedSessionV1;
    if (!parsed || parsed.version !== 1) return null;

    if (
      !parsed.tabOrder ||
      !parsed.activeTabId ||
      !parsed.singleTabs ||
      !parsed.comparisonTabs
    ) {
      console.error("Invalid session format: missing required fields");
      return null;
    }

    return parsed;
  } catch {
    console.error("Failed to parse session from localStorage");
    return null;
  }
}

export function saveSession(state: TabStoreState) {
  if (typeof window === "undefined") return;

  try {
    const singleTabs: PersistedSessionV1["singleTabs"] = {};
    for (const [id, tab] of Object.entries(state.singleTabs)) {
      singleTabs[id] = {
        parentId: tab.parentId,
        directory: tab.directory,
        currentIndex: tab.currentIndex,
        zoom: tab.zoom,
        panOffset: tab.panOffset,
      };
    }

    const data: PersistedSessionV1 = {
      version: 1,
      tabOrder: state.tabOrder,
      activeTabId: state.activeTabId,
      comparisonTabs: state.comparisonTabs,
      singleTabs,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    console.error("Failed to save session to localStorage");
  }
}

export function reducedToSingleTabs(
  reduced: PersistedSessionV1["singleTabs"],
): TabStoreState["singleTabs"] {
  return Object.fromEntries(
    Object.entries(reduced).map(([id, tab]) => [
      id,
      {
        ...tab,
        id,
        imageList: [],
      },
    ]),
  );
}
