import { useTabStore } from "../store";
import { useState } from "react";

export type TabBarProps = {};

// Modern vertical tab bar — styled like browser tabs but stacked vertically.
const TabBar = (_props: TabBarProps) => {
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
      className={`absolute left-0 flex flex-col bg-slate-950 text-gray-200 shadow-lg transition-all duration-200 z-20 ${
        isOpen
          ? "top-0 bottom-0 w-64 p-3 space-y-2 overflow-y-auto"
          : "top-1/2 -translate-y-1/2 h-8 w-4 p-1"
      }`}
    >
      <button
        aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        className="self-end mb-2 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-400 rounded"
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
                    ? "bg-gradient-to-r bg-slate-700 text-white rounded-xl shadow-md"
                    : "text-gray-200 hover:bg-slate-800 hover:text-white rounded-xl"
                }`}
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
                  className="ml-2 text-gray-300 hover:text-white p-1 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
