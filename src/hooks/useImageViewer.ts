import { useEffect, useState } from "react";
import type { SingleTabState } from "../store";
import useImageBitmap from "./useImageBitmap";
import useImageNavigation, {
  type ImageNavigationReturn,
} from "./useImageNavigation";

export type UseImageViewerProps = {
  singleTab: SingleTabState | null;
};

export type ImageViewerReturn = {
  currentImage: ImageBitmap | null;
  rawPath: string;
  isLoading: boolean;
  isPanning: boolean;
  setIsPanning: (isPanning: boolean) => void;
} & ImageNavigationReturn;

const useImageViewer = ({
  singleTab,
}: UseImageViewerProps): ImageViewerReturn => {
  const [currentImage, setCurrentImage] = useState<ImageBitmap | null>(null);
  const [rawPath, setRawPath] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(
    null,
  );

  // When active single tab changes, load its current image
  useEffect(() => {
    if (
      !singleTab ||
      !singleTab.directory ||
      singleTab.imageList.length === 0
    ) {
      setCurrentImage(null);
      setRawPath("");
      return;
    }

    const path = singleTab.imageList[singleTab.currentIndex];
    setRawPath(path);
  }, [singleTab]);

  useImageBitmap({
    rawPath,
    setCurrentImage,
    setIsLoading,
  });

  const navigationHandlers = useImageNavigation({
    singleTab,
    isPanning,
    panStart,
    setIsPanning,
    setPanStart,
  });

  return {
    currentImage,
    rawPath,
    isLoading,
    isPanning,
    setIsPanning,
    ...navigationHandlers,
  };
};

export default useImageViewer;
