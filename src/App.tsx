import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";

export default function App() {
  // Add listener for "open-image" event from Tauri backend
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen("open-image", (event) => {
      console.log("Received event:", event.payload);
      const imagePath =
        typeof event.payload === "string"
          ? event.payload
          : String(event.payload);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  return <></>;
}
