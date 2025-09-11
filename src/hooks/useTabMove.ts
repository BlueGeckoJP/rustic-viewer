import { useCallback, useEffect, useRef, useState } from "react";
import { useTabStore } from "../store";

export type UseTabMoveProps = {
  tabBarRef: React.RefObject<HTMLDivElement | null>;
  gap: number;
  isOpen: boolean;
};

export type UseTabMoveReturn = {
  registerTabRef: (id: string, element: HTMLElement | null) => void;
  onTabMouseDown: (e: React.MouseEvent, id: string) => void;
  draggingId: string | null;
};

const useTabMove = ({ tabBarRef, gap = 8, isOpen }: UseTabMoveProps) => {
  const tabRefs = useRef<Map<string, HTMLElement>>(new Map());
  const tabHeightsRef = useRef<Map<string, number>>(new Map());
  const originIndexRef = useRef<number | null>(null);
  const currentIndexRef = useRef<number | null>(null);
  const dragOffsetRef = useRef<number>(0);
  const dragStartYRef = useRef<number>(0);

  const [draggingId, setDraggingId] = useState<string | null>(null);

  const reorderTab = useTabStore((s) => s.reorderTab);
  const tabs = useTabStore((s) => s.tabs);
  const tabOrder = useTabStore((s) => s.tabOrder);
  const setActiveTab = useTabStore((s) => s.setActiveTab);

  const registerTabRef = (id: string, element: HTMLElement | null) => {
    if (element) tabRefs.current.set(id, element);
    else tabRefs.current.delete(id);
  };

  const measureTabs = useCallback(() => {
    tabRefs.current.forEach((element, id) => {
      tabHeightsRef.current.set(id, element.getBoundingClientRect().height);
    });
  }, []);

  const clearDragVisuals = () => {
    tabRefs.current.forEach((element) => {
      element.style.transform = "";
      element.style.transition = "";
      element.style.zIndex = "";
      element.style.opacity = "";
      element.style.pointerEvents = "";
    });
  };

  const endDrag = (commit: boolean) => {
    if (
      draggingId &&
      commit &&
      originIndexRef.current !== null &&
      currentIndexRef.current !== null &&
      originIndexRef.current !== currentIndexRef.current
    ) {
      reorderTab(originIndexRef.current, currentIndexRef.current);
    }
    setDraggingId(null);
    originIndexRef.current = null;
    currentIndexRef.current = null;
    dragOffsetRef.current = 0;
    clearDragVisuals();
  };

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingId) return;
      const barEl = tabBarRef.current;
      const draggedEl = tabRefs.current.get(draggingId);
      if (!barEl || !draggedEl) return;

      const startY = dragStartYRef.current;
      let delta = e.clientY - startY;

      const origIndex = originIndexRef.current!;
      const preHeights = tabOrder
        .slice(0, origIndex)
        .reduce(
          (acc, id) =>
            acc +
            (tabHeightsRef.current.get(id) || draggedEl.offsetHeight) +
            gap,
          0
        );
      const draggedHeight =
        tabHeightsRef.current.get(draggingId) || draggedEl.offsetHeight;

      const totalHeight = tabOrder.reduce(
        (acc, id) =>
          acc + (tabHeightsRef.current.get(id) || draggedEl.offsetHeight) + gap,
        -gap
      );
      const maxTop = totalHeight - draggedHeight;
      const minTop = 0;

      const currentTopRelative = preHeights + delta;
      const clampedTop = Math.min(Math.max(currentTopRelative, minTop), maxTop);
      delta = clampedTop - preHeights;

      dragOffsetRef.current = delta;
      draggedEl.style.transform = `translateY(${delta}px)`;
      draggedEl.style.zIndex = "10";
      draggedEl.style.pointerEvents = "none";
      draggedEl.style.transition = "none";
      draggedEl.style.opacity = "0.9";

      let newIndex = origIndex;
      let cumulative = 0;
      for (let i = 0; i < tabOrder.length; i++) {
        if (tabOrder[i] === draggingId) continue;
        const h =
          tabHeightsRef.current.get(tabOrder[i]) || draggedEl.offsetHeight;
        const midpoint = cumulative + h / 2;
        if (preHeights + delta + draggedHeight / 2 < midpoint) {
          newIndex = i <= origIndex ? i : i - 1;
          break;
        }
        cumulative += h + gap;
        newIndex = i + 1;
      }

      const oldIndex = origIndex;
      currentIndexRef.current = newIndex;

      tabOrder.forEach((id, idx) => {
        if (id === draggingId) return;
        const el = tabRefs.current.get(id);
        if (!el) return;
        el.style.transition = "transform 120ms";
        let translate = 0;
        if (oldIndex < newIndex) {
          if (idx > oldIndex && idx <= newIndex)
            translate = -draggedHeight - gap;
        } else if (newIndex < oldIndex) {
          if (idx >= newIndex && idx < oldIndex)
            translate = draggedHeight + gap;
        }
        el.style.transform = translate ? `translateY(${translate}px)` : "";
      });
    },
    [draggingId, tabs]
  );

  const onMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!draggingId) return;
      const barElement = tabBarRef.current;
      if (barElement) {
        const rect = barElement.getBoundingClientRect();
        const inside =
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom;
        endDrag(inside);
      } else {
        endDrag(false);
      }
    },
    [draggingId]
  );

  const onMouseLeaveWindow = useCallback(() => {
    if (draggingId) endDrag(false);
  }, [draggingId]);

  const onTabMouseDown = (e: React.MouseEvent, id: string) => {
    if (e.button !== 0) return;
    setActiveTab(id);
    dragStartYRef.current = e.clientY;
    originIndexRef.current = tabOrder.indexOf(id);
    currentIndexRef.current = originIndexRef.current;
    setDraggingId(id);
    measureTabs();
  };

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(measureTabs);
    }
  }, [isOpen, tabs, measureTabs]);

  useEffect(() => {
    if (draggingId) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("mouseleave", onMouseLeaveWindow);
      return () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        window.removeEventListener("mouseleave", onMouseLeaveWindow);
      };
    }
  }, [draggingId, onMouseMove, onMouseUp, onMouseLeaveWindow]);

  return { registerTabRef, onTabMouseDown, draggingId } as UseTabMoveReturn;
};

export default useTabMove;
