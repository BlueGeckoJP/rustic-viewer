import { useTabStore } from "../store";
import { useRef, useState } from "react";

export type TabBarProps = {};

// Modern vertical tab bar — styled like browser tabs but stacked vertically.
const TabBar = (_props: TabBarProps) => {
  const tabBarRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLElement>>(new Map());
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const removeTab = useTabStore((s) => s.removeTab);
  const [isOpen, setIsOpen] = useState(true);

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
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 cursor-pointer select-none px-2 transition-colors duration-150 min-w-0 ${
                  active
                    ? "bg-gradient-to-r bg-[#715A5A] text-[#D3DAD9] rounded-xl shadow-md"
                    : "text-[#D3DAD9] hover:bg-[#44444E] hover:text-[#D3DAD9] rounded-xl"
                }`}
                ref={(el) => {
                  if (el) tabRefs.current.set(tab.id, el);
                  else tabRefs.current.delete(tab.id);
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
