import { useEffect } from "react";
import loadImage from "../utils/imageLoader";

export type UseImageBitmapProps = {
  rawPath: string;
  setCurrentImage: React.Dispatch<React.SetStateAction<ImageBitmap | null>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  reloadTrigger?: number;
};

const useImageBitmap = ({
  rawPath,
  setCurrentImage,
  setIsLoading,
  reloadTrigger,
}: UseImageBitmapProps) => {
  useEffect(() => {
    if (reloadTrigger)
      console.log("Reloading image due to trigger:", reloadTrigger);

    let alive = true;

    if (rawPath === "") {
      setCurrentImage(null);
      setIsLoading(false);
      return;
    }

    // Slight delay to avoid flicker on fast loads
    const timeoutId = setTimeout(() => {
      if (alive) setIsLoading(true);
    }, 100);

    loadImage(rawPath)
      .then((img) => {
        if (alive) {
          setCurrentImage(img ?? null);
        }
      })
      .catch((e) => {
        console.error("Failed to load image:", e);
        if (alive) {
          setCurrentImage(null);
        }
      })
      .finally(() => {
        if (alive) {
          setIsLoading(false);
          // Removing alive = false causes isLoading to stay true
          alive = false;
        }
      });

    return () => {
      alive = false;
      clearTimeout(timeoutId);
    };
  }, [rawPath, setCurrentImage, setIsLoading, reloadTrigger]);
};

export default useImageBitmap;
