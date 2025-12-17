import { useRef, useState } from "react";

export type UseTabSelectionProps = {
  tabOrder: string[];
};

export type UseTabSelectionReturn = {
  selectedIDs: Set<string>;
  setSelectedIDs: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleSelect: (tabId: string, index: number, e: React.MouseEvent) => void;
};

const useTabSelection = ({
  tabOrder,
}: UseTabSelectionProps): UseTabSelectionReturn => {
  const [selectedIDs, setSelectedIDs] = useState<Set<string>>(new Set());
  const lastClickedIndexRef = useRef<number | null>(null);

  const toggleSelect = (tabId: string, index: number, e: React.MouseEvent) => {
    // Choose one by one
    if (e.metaKey || e.ctrlKey) {
      setSelectedIDs((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(tabId)) newSet.delete(tabId);
        else newSet.add(tabId);
        return newSet;
      });
      lastClickedIndexRef.current = index;
      return;
    }

    // Range selection
    if (e.shiftKey && lastClickedIndexRef.current != null) {
      const start = Math.min(lastClickedIndexRef.current, index);
      const end = Math.max(lastClickedIndexRef.current, index);
      const ids = tabOrder.slice(start, end + 1);
      setSelectedIDs(new Set(ids));
      return;
    }

    setSelectedIDs(new Set([tabId]));
    lastClickedIndexRef.current = index;
  };

  return { selectedIDs, setSelectedIDs, toggleSelect };
};

export default useTabSelection;
