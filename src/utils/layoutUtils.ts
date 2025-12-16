export const getComparisonLayoutClass = (childCount: number): string => {
  const layouts: Record<number, string> = {
    2: "flex flex-row gap-2 h-full",
    3: "flex flex-row gap-2 h-full",
    4: "grid grid-cols-2 grid-rows-2 gap-2 h-full",
  };
  return layouts[childCount] || "flex flex-row gap-2 h-full";
};
