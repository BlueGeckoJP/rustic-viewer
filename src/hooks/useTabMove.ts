import { useCallback, useEffect, useRef, useState } from "react";
import type { VerticalTabItem } from "../selectors/selectVerticalTabs";
import { useTabStore } from "../store";

export type UseTabMoveProps = {
  verticalTabs: VerticalTabItem[];
  tabBarRef: React.RefObject<HTMLDivElement | null>;
};

export type UseTabMoveReturn = {
  draggingTabId: string | null;
  dropTargetTabId: string | null;
  onMouseDown: (e: React.MouseEvent, tabId: string) => void;
  registerTab: (tabId: string, element: HTMLDivElement | null) => void;
};

const useTabMove = ({
  verticalTabs,
  tabBarRef,
}: UseTabMoveProps): UseTabMoveReturn => {
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

  const onMouseDown = (e: React.MouseEvent, tabId: string) => {
    if (e.button !== 0) return; // Only left click

    setActiveTab(tabId);
    originalIndexRef.current = tabOrder.indexOf(tabId);
    currentIndexRef.current = originalIndexRef.current;
    initialMouseYRef.current = e.clientY;

    setDraggingTabId(tabId);
  };

  const registerTab = (tabId: string, element: HTMLDivElement | null) => {
    if (element) {
      tabElements.current.set(tabId, element);
    } else {
      tabElements.current.delete(tabId);
    }
  };

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
      const barElem = tabBarRef.current;
      const draggingElem = tabElements.current.get(draggingTabId || "");
      if (!draggingElem || !barElem) return;

      const draggingElement = tabElements.current.get(draggingTabId || "");
      if (draggingElement) {
        draggingElement.style.width = `${draggingElement.offsetWidth}px`;
        draggingElement.style.position = "fixed";
        draggingElement.style.top = `${e.clientY - draggingElement.offsetHeight / 2}px`;
        draggingElement.style.zIndex = "1000";
        draggingElement.style.opacity = "0.9";
      }

      const originalIndex = originalIndexRef.current;
      if (originalIndex === null) return;

      const dstMidpointsY = verticalTabs
        .filter(
          (t, _) => t.id !== draggingTabId && tabElements.current.has(t.id),
        )
        .map((t) => {
          const elem = tabElements.current.get(t.id);
          if (!elem) return { id: t.id, midY: 0 };
          const r = elem.getBoundingClientRect();
          return { id: t.id, midY: r.top + r.height / 2 };
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
        const targetIndex = firstTabBelowCursor;
        const targetTabId = dstMidpointsY[targetIndex].id;
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
    [draggingTabId, tabBarRef, verticalTabs, tabOrder],
  );

  useEffect(() => {
    if (!draggingTabId) return;

    const draggingElement = tabElements.current.get(draggingTabId);
    const initialMouseY = initialMouseYRef.current;
    if (draggingElement && initialMouseY !== null) {
      draggingElement.style.width = `${draggingElement.offsetWidth}px`;
      draggingElement.style.position = "fixed";
      draggingElement.style.top = `${initialMouseY - draggingElement.offsetHeight / 2}px`;
      draggingElement.style.zIndex = "1000";
      draggingElement.style.opacity = "0.9";
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      endDrag();
    };
  }, [draggingTabId, endDrag, onMouseMove, onMouseUp]);

  return {
    draggingTabId,
    dropTargetTabId,
    onMouseDown,
    registerTab,
  };
};

export default useTabMove;
