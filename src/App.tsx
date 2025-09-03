import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import init, { decode_image_to_image_data } from "../src-wasm/pkg/src_wasm";
import { convertFileSrc } from "@tauri-apps/api/core";
import { readFile } from "@tauri-apps/plugin-fs";

export default function App() {
  useEffect(() => {
    init().then(() => {
      console.log("WASM module initialized");
    });
  }, []);

  // Add listener for "open-image" event from Tauri backend
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen("open-image", (event) => {
      console.log("Received event:", event.payload);
      const imagePath =
        typeof event.payload === "string"
          ? event.payload
          : String(event.payload);
      const filePath = convertFileSrc(imagePath);
      readFile(filePath).then((content) => {
        const img = decode_image_to_image_data(content);
        if (img) {
          console.log("Decoded image data:", img);
        }
      });
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  return <></>;
}
