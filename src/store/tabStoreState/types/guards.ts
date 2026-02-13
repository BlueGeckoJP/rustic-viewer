import type {
  ChildSingleTabState,
  IndependentSingleTabState,
  SingleTabState,
} from ".";

export const isChildSingleTabState = (
  tab: SingleTabState | null | undefined,
): tab is ChildSingleTabState => {
  return tab != null && tab.parentId !== null;
};

export const isIndependentSingleTabState = (
  tab: SingleTabState | null | undefined,
): tab is IndependentSingleTabState => {
  return tab != null && tab.parentId === null;
};
