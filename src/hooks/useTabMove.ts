import { useCallback, useEffect, useRef, useState } from "react";
import { useTabStore } from "../store";

export type UseTabMoveReturn = {
  draggingTabId: string | null;
  dropTargetTabId: string | null;
  onMouseDown: (e: React.MouseEvent, tabId: string) => void;
  registerTab: (tabId: string, element: HTMLDivElement | null) => void;
};

const useTabMove = (): UseTabMoveReturn => {
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const reorderTab = useTabStore((s) => s.reorderTab);
  const tabOrder = useTabStore((s) => s.tabOrder);

  const originalIndexRef = useRef<number | null>(null);
  const currentIndexRef = useRef<number | null>(null);
  const initialMouseYRef = useRef<number | null>(null);
  const tabElements = useRef<Map<string, HTMLDivElement>>(new Map());

  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);
  const [dropTargetTabId, setDropTargetTabId] = useState<string | null>(null);

  const clearDraggingVisuals = useCallback(() => {
    tabElements.current.forEach((element) => {
      element.style.position = "";
      element.style.top = "";
      element.style.width = "";
      element.style.zIndex = "";
      element.style.opacity = "";
    });
  }, []);

  const updateDraggingVisuals = useCallback(
    (top: number) => {
      if (!draggingTabId) return;

      const draggingElement = tabElements.current.get(draggingTabId);
      if (!draggingElement) return;

      draggingElement.style.width = `${draggingElement.offsetWidth}px`;
      draggingElement.style.position = "fixed";
      draggingElement.style.top = `${top - draggingElement.offsetHeight / 2}px`;
      draggingElement.style.zIndex = "1000";
      draggingElement.style.opacity = "0.9";
    },
    [draggingTabId],
  );

  const endDrag = useCallback(() => {
    if (
      draggingTabId &&
      originalIndexRef.current !== null &&
      currentIndexRef.current !== null &&
      originalIndexRef.current !== currentIndexRef.current
    ) {
      reorderTab(originalIndexRef.current, currentIndexRef.current);
    }

    setDraggingTabId(null);
    setDropTargetTabId(null);
    originalIndexRef.current = null;
    currentIndexRef.current = null;
    clearDraggingVisuals();
  }, [clearDraggingVisuals, draggingTabId, reorderTab]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      if (e.button !== 0) return; // Only left click

      setActiveTab(tabId);
      originalIndexRef.current = tabOrder.indexOf(tabId);
      currentIndexRef.current = originalIndexRef.current;
      initialMouseYRef.current = e.clientY;

      setDraggingTabId(tabId);
      setDropTargetTabId(tabId);
    },
    [setActiveTab, tabOrder],
  );

  const registerTab = useCallback(
    (tabId: string, element: HTMLDivElement | null) => {
      if (element) {
        tabElements.current.set(tabId, element);
      } else {
        tabElements.current.delete(tabId);
      }
    },
    [],
  );

  const onMouseUp = useCallback(
    (e: MouseEvent) => {
      if (e.button !== 0) return; // Only left click
      if (!draggingTabId) return;

      endDrag();
    },
    [draggingTabId, endDrag],
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      const draggingElem = tabElements.current.get(draggingTabId || "");
      if (!draggingElem) return;

      updateDraggingVisuals(e.clientY);

      const originalIndex = originalIndexRef.current;
      if (originalIndex === null) return;

      const dstMidpointsY = Array.from(tabElements.current.entries())
        .filter(([id]) => id !== draggingTabId)
        .map(([id, elem]) => {
          const r = elem.getBoundingClientRect();
          return { id: id, midY: r.top + r.height / 2 };
        });

      const firstTabBelowCursor = dstMidpointsY.findIndex(
        (t) => t.midY > e.clientY,
      );
      if (firstTabBelowCursor === -1) {
        // If the cursor is below all tabs, add to the end
        setDropTargetTabId(null);
        currentIndexRef.current = tabOrder.length - 1;
      } else {
        // If the cursor is above one of the tabs, insert before it
        const targetTabId = dstMidpointsY[firstTabBelowCursor].id;
        setDropTargetTabId(targetTabId);

        let toIndex = tabOrder.indexOf(targetTabId);
        // If moving top to bottom, we need to adjust the index
        if (
          originalIndexRef.current !== null &&
          originalIndexRef.current < toIndex
        ) {
          toIndex -= 1;
        }
        currentIndexRef.current = toIndex;
      }
    },
    [draggingTabId, tabOrder, updateDraggingVisuals],
  );

  useEffect(() => {
    if (!draggingTabId) return;

    const initialMouseY = initialMouseYRef.current;
    if (initialMouseY !== null) updateDraggingVisuals(initialMouseY);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [draggingTabId, onMouseMove, onMouseUp, updateDraggingVisuals]);

  return {
    draggingTabId,
    dropTargetTabId,
    onMouseDown,
    registerTab,
  };
};

export default useTabMove;
