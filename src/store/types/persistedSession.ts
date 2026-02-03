import type { TabStoreState } from ".";
import { STORAGE_KEY } from "../../constants";
import { getSortedImageFiles } from "../../utils/fileUtils";
import {
  fromFullState,
  type ReducedSingleTabStateV1,
  type ReducedSingleTabStateV2,
  toFullState,
} from "./reducedSingleTabState";

export type PersistedSessionV1 = {
  version: 1;
  tabOrder: string[];
  activeTabId: string;
  comparisonTabs: TabStoreState["comparisonTabs"];
  singleTabs: Record<string, ReducedSingleTabStateV1>;
};

export type PersistedSessionV2 = {
  version: 2;
  tabOrder: string[];
  activeTabId: string;
  comparisonTabs: TabStoreState["comparisonTabs"];
  singleTabs: Record<string, ReducedSingleTabStateV2>;
};

export async function migrateV1ToV2(
  sessionV1: PersistedSessionV1,
): Promise<PersistedSessionV2> {
  const singleTabsV2: Record<string, ReducedSingleTabStateV2> = {};

  for (const [id, tabV1] of Object.entries(sessionV1.singleTabs)) {
    let rawPath = "";

    if (tabV1.directory) {
      try {
        const imageList = await getSortedImageFiles(tabV1.directory);
        if (
          imageList.length > 0 &&
          tabV1.currentIndex >= 0 &&
          tabV1.currentIndex < imageList.length
        ) {
          rawPath = imageList[tabV1.currentIndex];
        }
      } catch (error) {
        console.warn(
          `Failed to migrate tab ${id}: could not read directory ${tabV1.directory}`,
          error,
        );
      }
    }

    singleTabsV2[id] = {
      parentId: tabV1.parentId,
      rawPath,
      zoom: tabV1.zoom,
      panOffset: tabV1.panOffset,
    };
  }

  return {
    version: 2,
    tabOrder: sessionV1.tabOrder,
    activeTabId: sessionV1.activeTabId,
    comparisonTabs: sessionV1.comparisonTabs,
    singleTabs: singleTabsV2,
  };
}

export async function parseSession(): Promise<PersistedSessionV2 | null> {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedSessionV1 | PersistedSessionV2;

    if (!parsed || typeof parsed.version !== "number") {
      console.error("Invalid session format: missing version");
      return null;
    }

    if (parsed.version === 1) {
      console.log("Migrating session from V1 to V2");
      const migratedSession = await migrateV1ToV2(parsed);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedSession));
      return migratedSession;
    }

    if (parsed.version !== 2) {
      console.error(`Unsupported session version`);
      return null;
    }

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
  } catch (error) {
    console.error("Failed to parse session from localStorage", error);
    return null;
  }
}

export function saveSession(state: TabStoreState) {
  if (typeof window === "undefined") return;

  try {
    const singleTabs: PersistedSessionV2["singleTabs"] = {};
    for (const [id, tab] of Object.entries(state.singleTabs)) {
      const reducedState = fromFullState(tab);
      singleTabs[id] = reducedState;
    }

    const data: PersistedSessionV2 = {
      version: 2,
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
  reducedTabs: PersistedSessionV2["singleTabs"],
): Promise<TabStoreState["singleTabs"]> {
  const fullTabs: TabStoreState["singleTabs"] = {};
  for (const [id, reducedTab] of Object.entries(reducedTabs)) {
    const fullState = await toFullState(id, reducedTab);
    fullTabs[id] = fullState;
  }
  return fullTabs;
}
