import { useEffect } from "react";
import loadImage from "../utils/imageLoader";

export type useImageBitmapProps = {
  rawPath: string;
  setCurrentImage: React.Dispatch<React.SetStateAction<ImageBitmap | null>>;
  setFileName: React.Dispatch<React.SetStateAction<string | null>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

const useImageBitmap = ({
  rawPath,
  setCurrentImage,
  setFileName,
  setIsLoading,
}: useImageBitmapProps) => {
  useEffect(() => {
    let alive = true;

    if (rawPath === "") {
      setCurrentImage(null);
      setFileName(null);
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
          setFileName(rawPath);
        }
      })
      .catch((e) => {
        console.error("Failed to load image:", e);
        if (alive) {
          setCurrentImage(null);
          setFileName(null);
        }
      })
      .finally(() => {
        if (alive) {
          setIsLoading(false);
        }
      });

    return () => {
      alive = false;
      clearTimeout(timeoutId);
    };
  }, [rawPath, setCurrentImage, setFileName, setIsLoading]);
};

export default useImageBitmap;
