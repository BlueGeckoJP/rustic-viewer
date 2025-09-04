import { useTabStore } from "../store";
import { useState } from "react";

export type TabBarProps = {};

// TODO: improve UI/UX
const TabBar = (_props: TabBarProps) => {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const removeTab = useTabStore((s) => s.removeTab);
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div
      className={`absolute left-0 flex flex-col bg-gray-800 text-gray-200 shadow-lg transition-all duration-200 ${
        isOpen
          ? "top-0 bottom-0 w-64 p-4 space-y-2 overflow-y-auto"
          : "top-1/2 -translate-y-1/2 h-12 w-6 p-2"
      }`}
    >
      <button
        className="self-end mb-2 text-gray-400 hover:text-white focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? "<" : ">"}
      </button>
      {isOpen &&
        tabs.map((tab) => (
          <div
            key={tab.id}
            className={`${
              tab.id === activeTabId
                ? "bg-white text-black"
                : "bg-gray-800 text-white"
            }
                flex items-center`}
          >
            <div className="flex-1 overflow-hidden text-nowrap">
              <span
                className="cursor-pointer"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.imageList.length > 0
                  ? tab.imageList[tab.currentIndex].split("/").pop()
                  : "New Tab"}
              </span>
            </div>
            <button onClick={() => removeTab(tab.id)}>x</button>
          </div>
        ))}
    </div>
  );
};

export default TabBar;
