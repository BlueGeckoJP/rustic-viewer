import type { SingleTabState } from "../store/tabStoreState";

export type ViewerControlsProps = {
  singleTab: SingleTabState;
  setCurrentIndex: (tabId: string, index: number) => void;
};

const ViewerControls = ({
  singleTab,
  setCurrentIndex,
}: ViewerControlsProps) => {
  return (
    <div className="absolute bottom-1 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
      <button
        className="px-2 py-1 bg-[#44444E] rounded text-xs hover:bg-[#555]"
        onClick={(e) => {
          e.stopPropagation();
          const next =
            (singleTab.currentIndex - 1 + singleTab.imageList.length) %
            singleTab.imageList.length;
          setCurrentIndex(singleTab.id, next);
        }}
        type="button"
      >
        ◀
      </button>
      <button
        className="px-2 py-1 bg-[#44444E] rounded text-xs hover:bg-[#555]"
        onClick={(e) => {
          e.stopPropagation();
          const next =
            (singleTab.currentIndex + 1) % singleTab.imageList.length;
          setCurrentIndex(singleTab.id, next);
        }}
        type="button"
      >
        ▶
      </button>
    </div>
  );
};

export default ViewerControls;
