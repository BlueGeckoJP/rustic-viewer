import type {
  ComparisonTabState,
  SingleTabState,
} from "../store/tabStoreState";

export const getLabel = (
  tab: SingleTabState | ComparisonTabState,
  type: "single" | "comparison",
) => {
  if (type === "comparison")
    return `Compare (${(tab as ComparisonTabState).children.length})`;

  const singleTab = tab as SingleTabState;
  const imagePath = singleTab.imageList[singleTab.currentIndex];
  return imagePath?.split("/").pop() || "New Tab";
};
