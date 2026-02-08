import { useEffect } from "react";
import { type SingleTabState, useTabStore } from "../store/tabStoreState";

export type UseViewHotkeysProps = {
  singleTab: SingleTabState | null;
};

const useViewHotkeys = ({ singleTab }: UseViewHotkeysProps) => {
  const setCurrentIndex = useTabStore((s) => s.setCurrentIndex);
  const resetZoomAndPan = useTabStore((s) => s.resetZoomAndPan);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!singleTab) return;
      const { imageList, currentIndex } = singleTab;
      if (imageList.length === 0) return;

      if (e.key === "ArrowRight") {
        const next = (currentIndex + 1) % imageList.length;
        setCurrentIndex(singleTab.id, next);
      } else if (e.key === "ArrowLeft") {
        const prev = (currentIndex - 1 + imageList.length) % imageList.length;
        setCurrentIndex(singleTab.id, prev);
      } else if (e.key === "0" && (e.ctrlKey || e.metaKey)) {
        // Reset zoom & pan
        e.preventDefault();
        resetZoomAndPan(singleTab.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [singleTab, resetZoomAndPan, setCurrentIndex]);
};

export default useViewHotkeys;
