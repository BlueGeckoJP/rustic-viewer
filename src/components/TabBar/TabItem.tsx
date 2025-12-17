import type { UseTabMoveReturn } from "../../hooks/useTabMove";
import { useTabStore } from "../../store";
import { getLabel } from "../../utils/tabHelpers";
import TabRow from "./TabRow";

export type TabItemProps = {
  tabId: string;
  index: number;
  tabMove: UseTabMoveReturn;
  selectedIDs: Set<string>;
  isComp: boolean;
  active: boolean;
  expanded: boolean;
  toggleSelect: (tabId: string, index: number, e: React.MouseEvent) => void;
  setMenuOpenFor: React.Dispatch<React.SetStateAction<string | null>>;
  setMenuPos: React.Dispatch<
    React.SetStateAction<{ x: number; y: number } | null>
  >;
  toggleExpanded: (id: string) => void;
  setSelectedIDs: React.Dispatch<React.SetStateAction<Set<string>>>;
};

const TabItem = ({
  tabId,
  index,
  tabMove,
  selectedIDs,
  isComp,
  active,
  expanded,
  toggleSelect,
  setMenuOpenFor,
  setMenuPos,
  toggleExpanded,
  setSelectedIDs,
}: TabItemProps) => {
  const singleTabs = useTabStore((s) => s.singleTabs);
  const comparisonTabs = useTabStore((s) => s.comparisonTabs);
  const setActiveTab = useTabStore((s) => s.setActiveTab);

  const singleTab = singleTabs[tabId];
  const comparisonTab = comparisonTabs[tabId];

  if (!singleTab && !comparisonTab) return null;
  if (singleTab?.parentId) return null; // If the tab is a child tab (parentId !== null), early return

  const tab = singleTabs[tabId] || comparisonTabs[tabId];
  const selected = selectedIDs.has(tabId);
  const label = getLabel(tab, isComp ? "comparison" : "single");

  return (
    <div
      role="tab"
      tabIndex={0}
      aria-selected={active}
      aria-label={label}
      onMouseDown={(e) => {
        toggleSelect(tabId, index, e);
        tabMove.onTabMouseDown(e, tabId);
      }}
      onClick={(e) => {
        if (tabMove.draggingId) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        setActiveTab(tabId);
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        setActiveTab(tabId);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuOpenFor(tabId);
        setMenuPos({ x: e.clientX, y: e.clientY });
      }}
      className={`flex items-center gap-2 cursor-pointer select-none px-2 py-1 transition-colors duration-150 min-w-0 rounded-xl text-[#D3DAD9] ${
        active
          ? "shadow-md bg-[#44444E] ring-2 ring-[#715A5A]"
          : selected
            ? "bg-[#44444E]"
            : "hover:bg-[#44444E]"
      }`}
      ref={(el) => tabMove.registerTabRef(tabId, el)}
    >
      <TabRow
        isComp={isComp}
        expanded={expanded}
        label={label}
        tabId={tabId}
        toggleExpanded={toggleExpanded}
        setSelectedIDs={setSelectedIDs}
      />
    </div>
  );
};

export default TabItem;
