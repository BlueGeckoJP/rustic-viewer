import { MAX_ZOOM, MIN_ZOOM } from "../constants";
import { type SingleTabState, useTabStore } from "../store/tabStoreState";

export type UseImageNavigationProps = {
  singleTab: SingleTabState | null;
  isPanning: boolean;
  panStart: { x: number; y: number } | null;
  setIsPanning: (isPanning: boolean) => void;
  setPanStart: (panStart: { x: number; y: number } | null) => void;
};

export type ImageNavigationReturn = {
  onWheel: (e: React.WheelEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onDoubleClick: () => void;
};

const useImageNavigation = ({
  singleTab,
  isPanning,
  panStart,
  setIsPanning,
  setPanStart,
}: UseImageNavigationProps): ImageNavigationReturn => {
  const setZoom = useTabStore((s) => s.setZoom);
  const setPanOffset = useTabStore((s) => s.setPanOffset);
  const resetZoomAndPan = useTabStore((s) => s.resetZoomAndPan);

  const onWheel = (e: React.WheelEvent) => {
    if (!singleTab) return;
    e.preventDefault();
    const delta = -e.deltaY;
    const zoomFactor = 1 + delta * 0.001;
    const newZoom = Math.max(
      MIN_ZOOM,
      Math.min(MAX_ZOOM, singleTab.zoom * zoomFactor),
    );
    setZoom(singleTab.id, newZoom);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (!singleTab) return;
    if (e.button === 0) {
      // Left click to pan
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!singleTab || !isPanning || !panStart) return;
    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    setPanOffset(singleTab.id, {
      x: singleTab.panOffset.x + dx,
      y: singleTab.panOffset.y + dy,
    });
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const onMouseUp = () => {
    setIsPanning(false);
    setPanStart(null);
  };

  const onMouseLeave = () => {
    setIsPanning(false);
    setPanStart(null);
  };

  const onDoubleClick = () => {
    if (!singleTab) return;
    resetZoomAndPan(singleTab.id);
  };

  return {
    onWheel,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
    onDoubleClick,
  };
};

export default useImageNavigation;
