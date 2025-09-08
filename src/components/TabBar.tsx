import { useTabStore } from "../store";
import React, { useRef, useState, useCallback, useEffect } from "react";
import ContextMenu, { ContextMenuItem } from "./ContextMenu";
import { isComparisonTab, isSingleTab } from "../store";

const CHILD_PREFIX = "::child::";

const TabBar = () => {
  const tabBarRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLElement>>(new Map());
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const removeTab = useTabStore((s) => s.removeTab);
  const reorderTab = useTabStore((s) => s.reorderTab);
  const createComparison = useTabStore((s) => s.createComparisonFromSingleIds);
  const addSingleTab = useTabStore((s) => s.addSingleTab);
  const detachChild = useTabStore((s) => s.detachChildToTopLevel);
  const removeChild = useTabStore((s) => s.removeChildFromComparison);
  const reorderChildren = useTabStore((s) => s.reorderComparisonChildren);
  const setActiveSlotIndex = useTabStore((s) => s.setActiveSlotIndex);
  const detachAllChildren = useTabStore((s) => s.detachAllChildren);

  const [isOpen, setIsOpen] = useState(true);
  const [expandedComparisonIds, setExpandedComparisonIds] = useState<
    Set<string>
  >(new Set());
  const toggleExpanded = (id: string) => {
    setExpandedComparisonIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const lastClickedIndexRef = useRef<number | null>(null);

  const toggleSelect = (tabId: string, index: number, e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      setSelectedIds((prev) => {
        const n = new Set(prev);
        if (n.has(tabId)) n.delete(tabId);
        else n.add(tabId);
        return n;
      });
      lastClickedIndexRef.current = index;
      return;
    }
    if (e.shiftKey && lastClickedIndexRef.current != null) {
      const start = Math.min(lastClickedIndexRef.current, index);
      const end = Math.max(lastClickedIndexRef.current, index);
      const ids = tabs.slice(start, end + 1).map((t) => t.id);
      setSelectedIds(new Set(ids));
      return;
    }
    setSelectedIds(new Set([tabId]));
    lastClickedIndexRef.current = index;
  };

  // Context menu
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  // Drag state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragStartYRef = useRef(0);
  const originIndexRef = useRef<number | null>(null);
  const currentIndexRef = useRef<number | null>(null);
  const dragOffsetRef = useRef(0);
  const tabHeightsRef = useRef<Map<string, number>>(new Map());
  const gap = 8;

  const measureTabs = useCallback(() => {
    tabRefs.current.forEach((el, id) => {
      tabHeightsRef.current.set(id, el.getBoundingClientRect().height);
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
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

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingId) return;
      const barEl = tabBarRef.current;
      const draggedEl = tabRefs.current.get(draggingId);
      if (!barEl || !draggedEl) return;

      const startY = dragStartYRef.current;
      let delta = e.clientY - startY;

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

      const totalHeight = tabs.reduce(
        (acc, t) =>
          acc +
          (tabHeightsRef.current.get(t.id) || draggedEl.offsetHeight) +
          gap,
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
      for (let i = 0; i < tabs.length; i++) {
        if (tabs[i].id === draggingId) continue;
        const h =
          tabHeightsRef.current.get(tabs[i].id) || draggedEl.offsetHeight;
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

      tabs.forEach((t, idx) => {
        if (t.id === draggingId) return;
        const el = tabRefs.current.get(t.id);
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
    if (isComparisonTab(tab)) {
      return `Compare (${tab.children.length})`;
    }
    if (isSingleTab(tab) && tab.imageList?.length > 0) {
      const base = tab.imageList[tab.currentIndex]?.split("/").pop();
      return base || "Untitled";
    }
    return "New Tab";
  };

  const isChildContext =
    (menuOpenFor && menuOpenFor.includes(CHILD_PREFIX)) || false;
  let contextItems: ContextMenuItem[] = [];
  if (!isChildContext) {
    contextItems = [
      { id: "new", label: "New Tab" },
      { id: "close", label: "Close" },
      { id: "close-others", label: "Close Others" },
      { id: "close-right", label: "Close Tabs to Right" },
    ];
    const singleSelectedCount = tabs.filter(
      (t) => t.type === "single" && selectedIds.has(t.id)
    ).length;
    if (singleSelectedCount >= 2) {
      contextItems.unshift({
        id: "create-comparison",
        label: `Create Comparison (${singleSelectedCount})`,
      });
    }
    // Add comparison-specific actions if target is a comparison
    if (menuOpenFor) {
      const target = tabs.find((t) => t.id === menuOpenFor);
      if (target && isComparisonTab(target)) {
        contextItems.push({ id: "detach-all", label: "Detach All Children" });
        contextItems.push({
          id: "toggle-expand",
          label: expandedComparisonIds.has(target.id) ? "Collapse" : "Expand",
        });
      }
    }
  } else {
    // Child menu items
    contextItems = [
      { id: "activate", label: "Activate" },
      { id: "move-up", label: "Move Up" },
      { id: "move-down", label: "Move Down" },
      { id: "detach", label: "Detach to Top" },
      { id: "remove", label: "Remove From Comparison" },
    ];
  }

  return (
    <div
      style={{
        WebkitBackdropFilter: "blur(12px)",
        backdropFilter: "blur(12px)",
      }}
      className={`absolute left-0 flex flex-col text-[#D3DAD9] shadow-md transition-all duration-200 z-20 bg-[#37353E]/88 backdrop-blur-md ${
        isOpen
          ? "top-0 bottom-0 w-64 p-3 space-y-2 overflow-y-auto"
          : "top-1/2 -translate-y-1/2 h-8 w-4 p-1 rounded-r"
      }`}
      ref={tabBarRef}
    >
      <button
        aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        className="self-end mb-2 text-[#D3DAD9]"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? "«" : "»"}
      </button>

      {isOpen && (
        <div
          role="tablist"
          aria-orientation="vertical"
          className="flex flex-col gap-2"
        >
          {tabs.map((tab, idx) => {
            const label = getLabel(tab);
            const active = tab.id === activeTabId;
            const selected = selectedIds.has(tab.id);
            const isComp = isComparisonTab(tab);
            const expanded = isComp && expandedComparisonIds.has(tab.id);
            return (
              <div key={tab.id} className="flex flex-col gap-1">
                <div
                  role="tab"
                  aria-selected={active}
                  aria-label={label}
                  onMouseDown={(e) => {
                    if (e.button !== 0) return;
                    setActiveTab(tab.id);
                    toggleSelect(tab.id, idx, e);
                    dragStartYRef.current = e.clientY;
                    originIndexRef.current = tabs.findIndex(
                      (t) => t.id === tab.id
                    );
                    currentIndexRef.current = originIndexRef.current;
                    setDraggingId(tab.id);
                    measureTabs();
                  }}
                  onClick={(e) => {
                    if (draggingId) e.preventDefault();
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpenFor(tab.id);
                    setMenuPos({ x: e.clientX, y: e.clientY });
                  }}
                  className={`flex items-center gap-2 cursor-pointer select-none px-2 transition-colors duration-150 min-w-0 rounded-xl text-[#D3DAD9] ${
                    active
                      ? "shadow-md bg-[#44444E] ring-2 ring-[#715A5A]"
                      : selected
                      ? "bg-[#44444E]"
                      : "hover:bg-[#44444E]"
                  }`}
                  ref={(el) => {
                    if (el) tabRefs.current.set(tab.id, el);
                    else tabRefs.current.delete(tab.id);
                  }}
                >
                  {isComp && (
                    <button
                      className="text-xs px-1 py-0.5 rounded hover:bg-[#555]"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpanded(tab.id);
                      }}
                      aria-label={
                        expanded ? "Collapse comparison" : "Expand comparison"
                      }
                    >
                      {expanded ? "▼" : "▶"}
                    </button>
                  )}
                  {!isComp && <span className="text-xs opacity-50">•</span>}
                  <div className="flex-1 min-w-0">
                    <span className="block truncate" title={label}>
                      {label}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeTab(tab.id);
                      setSelectedIds((prev) => {
                        if (!prev.has(tab.id)) return prev;
                        const n = new Set(prev);
                        n.delete(tab.id);
                        return n;
                      });
                    }}
                    aria-label={`Close ${label}`}
                    className="ml-1 text-[#D3DAD9] hover:text-white p-1 rounded"
                  >
                    ✕
                  </button>
                </div>
                {isComp && expanded && (
                  <div className="flex flex-col gap-1 pl-6 pr-1">
                    {tab.children.map((child, cIdx) => {
                      const file = child.imageList[child.currentIndex];
                      const childActive =
                        active && tab.activeSlotIndex === cIdx;
                      return (
                        <div
                          key={child.id}
                          className={`group flex items-center gap-2 text-xs rounded-lg px-2 py-1 cursor-pointer min-w-0 transition-colors ${
                            childActive
                              ? "bg-[#4F4E58] ring-1 ring-[#715A5A]"
                              : "hover:bg-[#44444E]"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTab(tab.id);
                            setActiveSlotIndex(tab.id, cIdx);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMenuOpenFor(
                              `${tab.id}${CHILD_PREFIX}${child.id}`
                            );
                            setMenuPos({ x: e.clientX, y: e.clientY });
                          }}
                        >
                          <span className="truncate flex-1" title={file}>
                            {file ? file.split("/").pop() : "(empty)"}
                          </span>
                          <span className="opacity-50 text-[10px]">
                            {child.currentIndex + 1}/{child.imageList.length}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {menuOpenFor && menuPos && (
        <ContextMenu
          x={menuPos.x}
          y={menuPos.y}
          items={contextItems.map((it) => ({ ...it, disabled: false }))}
          onSelect={(id) => {
            const targetId = menuOpenFor;
            if (!targetId) return;
            const childMode = targetId.includes(CHILD_PREFIX);

            if (!childMode) {
              if (id === "create-comparison") {
                const singleIds = tabs
                  .filter((t) => t.type === "single" && selectedIds.has(t.id))
                  .map((t) => t.id);
                if (singleIds.length >= 2) {
                  createComparison(singleIds);
                }
                setSelectedIds(new Set());
              } else if (id === "new") {
                addSingleTab(null, [], 0);
              } else if (id === "close") {
                removeTab(targetId);
                setSelectedIds((prev) => {
                  if (!prev.has(targetId)) return prev;
                  const n = new Set(prev);
                  n.delete(targetId);
                  return n;
                });
              } else if (id === "close-others") {
                tabs
                  .filter((t) => t.id !== targetId)
                  .forEach((t) => removeTab(t.id));
                setSelectedIds(new Set([targetId]));
                setActiveTab(targetId);
              } else if (id === "close-right") {
                const idx = tabs.findIndex((t) => t.id === targetId);
                if (idx >= 0) {
                  tabs.slice(idx + 1).forEach((t) => removeTab(t.id));
                }
              } else if (id === "detach-all") {
                detachAllChildren(targetId);
              } else if (id === "toggle-expand") {
                toggleExpanded(targetId);
              }
            } else {
              // Child actions
              const [parentId, childId] = targetId.split(CHILD_PREFIX);
              const parent = tabs.find((t) => t.id === parentId);
              if (!parent || !isComparisonTab(parent)) return;
              const childIndex = parent.children.findIndex(
                (c) => c.id === childId
              );
              if (childIndex < 0) return;

              if (id === "activate") {
                setActiveTab(parent.id);
                setActiveSlotIndex(parent.id, childIndex);
              } else if (id === "move-up") {
                if (childIndex > 0)
                  reorderChildren(parent.id, childIndex, childIndex - 1);
              } else if (id === "move-down") {
                if (childIndex < parent.children.length - 1)
                  reorderChildren(parent.id, childIndex, childIndex + 1);
              } else if (id === "detach") {
                detachChild(parent.id, childId, true);
              } else if (id === "remove") {
                removeChild(parent.id, childId);
              }
            }

            setMenuOpenFor(null);
            setMenuPos(null);
          }}
          onClose={() => {
            setMenuOpenFor(null);
            setMenuPos(null);
          }}
        />
      )}
    </div>
  );
};

export default TabBar;
