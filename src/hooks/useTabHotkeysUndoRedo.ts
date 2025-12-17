import { useEffect } from "react";

export type UseTabHotkeysUndoRedoProps = {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
};

const useTabHotkeysUndoRedo = ({
  canUndo,
  canRedo,
  undo,
  redo,
}: UseTabHotkeysUndoRedoProps): void => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        switch (e.shiftKey) {
          case true:
            // Redo (Ctrl/Cmd + Shift + Z)
            e.preventDefault();
            if (canRedo) redo();
            break;
          case false:
            // Undo (Ctrl/Cmd + Z)
            e.preventDefault();
            if (canUndo) undo();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canUndo, canRedo, undo, redo]);
};

export default useTabHotkeysUndoRedo;
