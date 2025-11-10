import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export type ContextMenuItem = {
  id: string;
  label: string;
  disabled?: boolean;
};

type ContextMenuProps = {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onSelect: (id: string) => void;
  onClose: () => void;
};

const ContextMenu = ({ x, y, items, onSelect, onClose }: ContextMenuProps) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Keep menu within viewport
  const style: React.CSSProperties = {
    position: "fixed",
    left: x,
    top: y,
    background: "#44444E",
    color: "#D3DAD9",
    borderRadius: 6,
    boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
    padding: "6px 4px",
    zIndex: 1000,
    minWidth: 160,
  };

  return createPortal(
    <div ref={ref} style={style} role="menu" aria-label="Tab context menu">
      {items.map((it) => (
        // biome-ignore lint/a11y/useKeyWithClickEvents: Tab focus alone is sufficient for now
        <div
          key={it.id}
          role="menuitem"
          tabIndex={0}
          aria-disabled={it.disabled}
          onClick={() => !it.disabled && onSelect(it.id)}
          style={{
            padding: "4px 12px",
            cursor: it.disabled ? "not-allowed" : "pointer",
            opacity: it.disabled ? 0.5 : 1,
            borderRadius: 4,
          }}
          className="text-sm text-nowrap"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {it.label}
        </div>
      ))}
    </div>,
    document.body,
  );
};

export default ContextMenu;
