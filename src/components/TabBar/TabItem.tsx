import type { UseTabMoveReturn } from "../../hooks/useTabMove";
import type { VerticalTabItem } from "../../selectors/selectVerticalTabs";
import { useTabStore } from "../../store";
import { getLabel } from "../../utils/tabHelpers";
import TabRow from "./TabRow";

export type TabItemProps = {
  item: VerticalTabItem;
  expandedComparisonIds: Set<string>;
  selectedIDs: Set<string>;
  tabMove: UseTabMoveReturn;
  setSelectedIDs: React.Dispatch<React.SetStateAction<Set<string>>>;
  toggleExpanded: (id: string) => void;
  toggleSelect: (id: string, e: React.MouseEvent) => void;
  setMenuOpenFor: (id: string | null) => void;
  setMenuPos: (pos: { x: number; y: number } | null) => void;
};

const TabItem = ({
  item,
  expandedComparisonIds,
  selectedIDs,
  tabMove,
  setSelectedIDs,
  toggleExpanded,
  toggleSelect,
  setMenuOpenFor,
  setMenuPos,
}: TabItemProps) => {
  const singleTabs = useTabStore((s) => s.singleTabs);
  const comparisonTabs = useTabStore((s) => s.comparisonTabs);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const setActiveSlotIndex = useTabStore((s) => s.setActiveSlotIndex);

  const isComp = item.kind === "comparison";
  const isChild = item.kind === "single" && item.parentId !== null;
  const expanded = isComp && expandedComparisonIds.has(item.id);

  const tab = isComp ? comparisonTabs[item.id] : singleTabs[item.id];
  if (!tab) return null;

  const label = getLabel(tab, isComp ? "comparison" : "single");
  const selected = selectedIDs.has(item.id);

  const setActive = () => {
    setActiveTab(item.id);
    if (isChild && item.parentId) {
      setActiveSlotIndex(item.parentId, item.slotIndex);
    }
  };

  return (
    <div
      key={item.id}
      role="tab"
      tabIndex={0}
      aria-selected={item.active}
      aria-label={label}
      style={isChild ? { marginLeft: "1.5rem" } : {}}
      onMouseDown={(e) => {
        toggleSelect(item.id, e);
        if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
          tabMove.onMouseDown(e, item.id);
        }
      }}
      onClick={(e) => {
        if (tabMove.draggingTabId) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;

        setActive();
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;

        setActive();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuOpenFor(item.id);
        setMenuPos({ x: e.clientX, y: e.clientY });
      }}
      className={`flex items-center gap-2 cursor-pointer select-none px-2 py-1 transition-colors duration-150 min-w-0 rounded-xl text-[#D3DAD9] ${
        item.active
          ? "shadow-md bg-[#44444E] ring-2 ring-[#715A5A]"
          : selected
            ? "bg-[#44444E]"
            : "hover:bg-[#44444E]"
      }`}
      ref={(el) => tabMove.registerTab(item.id, el)}
    >
      <TabRow
        isComp={isComp}
        expanded={expanded}
        label={label}
        tabId={item.id}
        toggleExpanded={toggleExpanded}
        setSelectedIDs={setSelectedIDs}
      />
    </div>
  );
};

export default TabItem;
