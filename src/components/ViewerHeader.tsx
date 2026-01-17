import { useCallback, useEffect, useState } from "react";
import type { SingleTabState } from "../store";
import imageCache from "../utils/imageCache";

export type ViewerHeaderProps = {
  rawPath: string;
  isLoading: boolean;
  singleTab: SingleTabState;
};

const ViewerHeader = ({ rawPath, isLoading, singleTab }: ViewerHeaderProps) => {
  const [isHighQuality, setIsHighQuality] = useState(false);

  const updateIsHighQuality = useCallback(() => {
    const cacheItem = imageCache.get(rawPath);
    const isHighQuality = cacheItem?.isHighQuality ?? false;
    setIsHighQuality(isHighQuality);
  }, [rawPath]);

  useEffect(() => {
    updateIsHighQuality();

    const interval = setInterval(() => {
      updateIsHighQuality();
    }, 1000);

    return () => clearInterval(interval);
  }, [updateIsHighQuality]);

  return (
    <div
      className={`text-xs text-[#D3DAD9] flex items-center gap-2 h-6 ${isLoading ? "bg-[#715A5A] transition-colors duration-300" : "bg-[#44444E]"}`}
    >
      <span className="truncate mx-2" title={rawPath ? rawPath : "(empty)"}>
        {rawPath ? rawPath.split("/").pop() : "(empty)"}
      </span>
      <span className="opacity-60">
        {singleTab.imageList.length <= 0
          ? "No Images"
          : `${singleTab.currentIndex + 1}/${singleTab.imageList.length}`}
      </span>

      {isHighQuality && (
        <span className="ml-2 px-1 py-0.5 text-xs font-medium text-[#D3DAD9]">
          HQ
        </span>
      )}

      {/* Loading overlay */}
      <div
        className={`ml-auto px-2 h-full flex items-center justify-center transition-opacity duration-300 ${isLoading ? "animate-loading-overlay-fade-in" : "animate-loading-overlay-fade-out pointer-events-none"}`}
      >
        <div className="flex justify-between items-center gap-3">
          {/* Loading pulse indicator */}
          <div className="relative">
            <div className="w-3 h-3 bg-[#D3DAD9] rounded-full animate-pulse"></div>
            <div className="absolute top-0 left-0 w-3 h-3 bg-[#D3DAD9] rounded-full animate-ping opacity-75"></div>
          </div>
          <div className="flex">
            <span className="text-[#D3DAD9] text-sm font-medium">
              Loading...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewerHeader;
