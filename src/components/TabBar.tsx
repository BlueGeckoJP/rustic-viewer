import { useTabStore } from "../store";
import { useRef, useState, useCallback, useEffect } from "react";

export type TabBarProps = {};

// Modern vertical tab bar — styled like browser tabs but stacked vertically.
const TabBar = (_props: TabBarProps) => {
  const tabBarRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLElement>>(new Map());
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const removeTab = useTabStore((s) => s.removeTab);
  const reorderTab = useTabStore((s) => s.reorderTab);
  const [isOpen, setIsOpen] = useState(true);

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStartYRef = useRef(0); // pointer down Y
  const originIndexRef = useRef<number | null>(null);
  const currentIndexRef = useRef<number | null>(null); // provisional index while dragging
  const dragOffsetRef = useRef(0); // current translateY in px for dragged element
  const tabHeightsRef = useRef<Map<string, number>>(new Map());
  const gap = 8; // Tailwind gap-2 => 0.5rem => 8px

  const measureTabs = useCallback(() => {
    tabRefs.current.forEach((el, id) => {
      tabHeightsRef.current.set(id, el.getBoundingClientRect().height);
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      // measure after open or tabs change
      requestAnimationFrame(measureTabs);
    }
  }, [tabs, isOpen, measureTabs]);

  const clearDragVisuals = () => {
    tabRefs.current.forEach((el) => {
      el.style.transform = "";
      el.style.transition = "";
      el.style.zIndex = "";
      el.style.opacity = "";
      el.style.pointerEvents = "";
    });
  };

  const endDrag = (commit: boolean) => {
    if (
      draggingId &&
      commit &&
      originIndexRef.current != null &&
      currentIndexRef.current != null &&
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

  // Prerequisite retained information
  // draggingId: Currently dragged tab ID. Stop processing if this is falsy
  // dragStartYRef.current: clientY at the start of drag (on mousedown)
  // originIndexRef.current: Index where the tab was before the drag started
  // currentIndexRef.current: Temporary target index (visual placeholder position)
  // tabHeightsRef.current: Cache mapping each tab ID to its height (px)
  // gap: Space between tabs (8px). Fixed to match Tailwind's `gap-2`
  // tabRefs.current: For retrieving each tab's DOM element
  // dragOffsetRef.current: translateY applied to the currently dragged tab (kept accessible for other features as needed)
  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingId) return;
      const barEl = tabBarRef.current;
      const draggedEl = tabRefs.current.get(draggingId);
      if (!barEl || !draggedEl) return;

      const startY = dragStartYRef.current;
      // Distance moved up or down from the reference position
      // positive means moving down
      let delta = e.clientY - startY;

      // Clamp delta: upper limit 0 relative to initial position such that top of dragged can't go above bar top
      const origIndex = originIndexRef.current!;
      const preHeights = tabs
        .slice(0, origIndex)
        .reduce(
          (acc, t) =>
            acc +
            (tabHeightsRef.current.get(t.id) || draggedEl.offsetHeight) +
            gap,
          0
        );
      const draggedHeight =
        tabHeightsRef.current.get(draggingId) || draggedEl.offsetHeight;
      const currentTopRelative = preHeights + delta; // position from bar top candidate
      const minTop = 0; // can't go above bar

      // Compute lower limit: total height of all tabs minus dragged height
      const totalHeight = tabs.reduce(
        (acc, t) =>
          acc +
          (tabHeightsRef.current.get(t.id) || draggedEl.offsetHeight) +
          gap,
        -gap
      ); // last adds no gap
      const maxTop = totalHeight - draggedHeight; // last valid top position
      const clampedTop = Math.min(Math.max(currentTopRelative, minTop), maxTop);
      delta = clampedTop - preHeights;
      dragOffsetRef.current = delta;

      // Apply transform to dragged element
      draggedEl.style.zIndex = "10";
      draggedEl.style.pointerEvents = "none";
      draggedEl.style.transition = "none";
      draggedEl.style.transform = `translateY(${delta}px)`;
      draggedEl.style.opacity = "0.9";

      // Determine provisional index based on midpoint of dragged element
      const draggedMid = preHeights + delta + draggedHeight / 2;
      let newIndex = 0;
      let cursor = 0;
      for (let i = 0; i < tabs.length; i++) {
        const t = tabs[i];
        if (t.id === draggingId) continue; // skip original spot; will insert relative
        const h = tabHeightsRef.current.get(t.id) || draggedHeight;
        const mid = cursor + h / 2;
        // Use <= so that when exactly aligned with first tab mid, it counts as insertion before.
        if (draggedMid <= mid) {
          newIndex = i; // place before this tab
          break;
        }
        cursor += h + gap;
        newIndex = i + 1; // after last loop if not broken
      }

      const oldIndex = originIndexRef.current!;

      currentIndexRef.current = newIndex;

      // Shift other tabs visually to make space
      tabs.forEach((t, idx) => {
        if (t.id === draggingId) return;
        const el = tabRefs.current.get(t.id);
        if (!el) return;
        el.style.transition = "transform 120ms";
        let translate = 0;
        if (oldIndex < newIndex) {
          // dragging downward: items between (oldIndex+1 ... newIndex) shift up
          if (idx > oldIndex && idx <= newIndex)
            translate = -draggedHeight - gap;
        } else if (newIndex < oldIndex) {
          // dragging upward: items between (newIndex ... oldIndex-1) shift down
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
      const barEl = tabBarRef.current;
      if (barEl) {
        const rect = barEl.getBoundingClientRect();
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

  const getLabel = (tab: any) => {
    if (tab.imageList && tab.imageList.length > 0) {
      const base = tab.imageList[tab.currentIndex]?.split("/").pop();
      return base || "Untitled";
    }
    return "New Tab";
  };

  return (
    <div
      style={{
        WebkitBackdropFilter: "blur(12px)",
        backdropFilter: "blur(12px)",
      }}
      className={`absolute left-0 flex flex-col text-[#D3DAD9] shadow-lg transition-all duration-200 z-20 bg-[#37353E]/88 backdrop-blur-md ${
        isOpen
          ? "top-0 bottom-0 w-64 p-3 space-y-2 overflow-y-auto"
          : "top-1/2 -translate-y-1/2 h-8 w-4 p-1"
      }`}
      ref={tabBarRef}
    >
      <button
        aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        className="self-end mb-2 text-[#D3DAD9] hover:text-[#D3DAD9] focus:outline-none focus:ring-2 focus:ring-[#715A5A] rounded"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? "«" : "»"}
      </button>

      {/* Tab list (vertical). Keep semantics for accessibility */}
      {isOpen && (
        <div
          role="tablist"
          aria-orientation="vertical"
          className="flex flex-col gap-2"
        >
          {tabs.map((tab: any) => {
            const label = getLabel(tab);
            const active = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                role="tab"
                aria-selected={active}
                aria-label={label}
                onMouseDown={(e) => {
                  if (e.button !== 0) return; // left click only
                  setActiveTab(tab.id);
                  setDraggingId(tab.id);
                  dragStartYRef.current = e.clientY;
                  originIndexRef.current = tabs.findIndex(
                    (t) => t.id === tab.id
                  );
                  currentIndexRef.current = originIndexRef.current;
                  measureTabs();
                }}
                onClick={(e) => {
                  // Prevent click action from firing after drag (if moved significantly)
                  if (draggingId) e.preventDefault();
                }}
                className={`flex items-center gap-3 cursor-pointer select-none px-2 transition-colors duration-150 min-w-0 ${
                  active
                    ? "bg-gradient-to-r bg-[#715A5A] text-[#D3DAD9] rounded-xl shadow-md"
                    : "text-[#D3DAD9] hover:bg-[#44444E] hover:text-[#D3DAD9] rounded-xl"
                }`}
                ref={(el) => {
                  if (el) tabRefs.current.set(tab.id, el);
                  else tabRefs.current.delete(tab.id);
                }}
                style={{
                  cursor: draggingId === tab.id ? "grabbing" : "grab",
                  userSelect: "none",
                }}
              >
                <div className="flex-1 min-w-0">
                  <span className="block truncate" title={label}>
                    {label}
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTab(tab.id);
                  }}
                  aria-label={`Close ${label}`}
                  title={`Close ${label}`}
                  className="ml-2 text-[#D3DAD9] hover:text-[#D3DAD9] p-1 rounded focus:outline-none focus:ring-2 focus:ring-[#715A5A]"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TabBar;
