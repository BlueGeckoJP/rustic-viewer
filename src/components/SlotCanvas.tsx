import { useEffect, useRef, useState } from "react";
import { decodeImageFromPath } from "../utils/imageDecoder";
import ImageCanvas from "./ImageCanvas";

export type SlotCanvasProps = { rawPath: string };

// Shared worker now encapsulated by decodeImageFromPath utility
const SlotCanvas: React.FC<SlotCanvasProps> = ({ rawPath }) => {
  const [imgData, setImgData] = useState<ImageData | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let alive = true;
    decodeImageFromPath(rawPath)
      .then((img) => {
        if (alive) setImgData(img);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [rawPath]);

  return (
    <ImageCanvas
      image={imgData}
      className="max-w-full max-h-full"
      onInitCanvas={(c) => {
        canvasRef.current = c;
      }}
    />
  );
};

export default SlotCanvas;
