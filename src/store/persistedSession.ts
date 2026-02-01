import { STORAGE_KEY } from "../constants";
import type { PersistedSessionV1, TabStoreState } from "./types";
import { ReducedSingleTabState } from "./types/reducedSingleTabState";

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
      const reducedState = ReducedSingleTabState.fromFullState(tab);
      singleTabs[id] = reducedState;
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

export async function reducedToSingleTabs(
  reducedTabs: PersistedSessionV1["singleTabs"],
): Promise<TabStoreState["singleTabs"]> {
  const fullTabs: TabStoreState["singleTabs"] = {};
  for (const [id, reducedTab] of Object.entries(reducedTabs)) {
    const fullState = await ReducedSingleTabState.toFullState(id, reducedTab);
    fullTabs[id] = fullState;
  }
  return fullTabs;
}
