import { useCallback, useEffect, useRef, useState } from "react";
import type { VerticalTabItem } from "../selectors/selectVerticalTabs";
import { useTabStore } from "../store";

export type UseTabMoveProps = {
  verticalTabs: VerticalTabItem[];
  tabBarRef: React.RefObject<HTMLDivElement | null>;
};

export type UseTabMoveReturn = {
  draggingTabId: string | null;
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

  const dragStartYRef = useRef<number | null>(null);
  const originalIndexRef = useRef<number | null>(null);
  const currentIndexRef = useRef<number | null>(null);
  const tabElements = useRef<Map<string, HTMLDivElement>>(new Map());

  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);

  const clearDraggingVisuals = useCallback(() => {
    tabElements.current.forEach((element) => {
      element.style.transform = "";
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
    dragStartYRef.current = null;
    originalIndexRef.current = null;
    currentIndexRef.current = null;
    clearDraggingVisuals();
  }, [clearDraggingVisuals, draggingTabId, reorderTab]);

  const onMouseDown = (e: React.MouseEvent, tabId: string) => {
    if (e.button !== 0) return; // Only left click

    setActiveTab(tabId);
    dragStartYRef.current = e.clientY;
    originalIndexRef.current = tabOrder.indexOf(tabId);
    currentIndexRef.current = originalIndexRef.current;

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

      const barElem = tabBarRef.current;
      if (!barElem) return;

      const rect = barElem.getBoundingClientRect();
      const isInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (!isInside) return;

      endDrag();
    },
    [draggingTabId, endDrag, tabBarRef],
  );

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      const barElem = tabBarRef.current;
      const draggingElem = tabElements.current.get(draggingTabId || "");
      if (!draggingElem || !barElem) return;

      const dragStartY = dragStartYRef.current;
      const delta = e.clientY - (dragStartY || 0);

      const draggingElement = tabElements.current.get(draggingTabId || "");
      if (draggingElement) {
        draggingElement.style.transform = `translateY(${delta}px)`;
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

      const firstTabBelowCursor = dstMidpointsY.findIndex((t) => t.midY > e.clientY);
      const targetIndex = firstTabBelowCursor === -1 ? dstMidpointsY.length - 1 : firstTabBelowCursor;
      const targetTabId = dstMidpointsY[targetIndex]?.id;
      const toIndex = tabOrder.indexOf(targetTabId);
      currentIndexRef.current = toIndex;
    },
    [draggingTabId, tabBarRef, verticalTabs, tabOrder],
  );

  useEffect(() => {
    if (!draggingTabId) return;
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
    onMouseDown,
    registerTab,
  };
};

export default useTabMove;
