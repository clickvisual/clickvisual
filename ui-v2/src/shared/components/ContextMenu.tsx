import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";

export interface ContextMenuItem {
  key: string;
  label: string;
  onSelect: () => void;
  separatorBefore?: boolean;
  hint?: string;
}

interface ContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
  ariaLabel?: string;
}

const VIEWPORT_GAP = 8;

export default function ContextMenu({
  open,
  x,
  y,
  items,
  onClose,
  ariaLabel = "节点操作"
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ x, y });

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    const menu = menuRef.current;
    if (!menu) {
      setPosition({ x, y });
      return;
    }
    const { innerWidth, innerHeight } = window;
    const rect = menu.getBoundingClientRect();
    setPosition({
      x: Math.max(VIEWPORT_GAP, Math.min(x, innerWidth - rect.width - VIEWPORT_GAP)),
      y: Math.max(VIEWPORT_GAP, Math.min(y, innerHeight - rect.height - VIEWPORT_GAP))
    });
  }, [open, x, y, items]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }
      onClose();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    function handleViewportChange() {
      onClose();
    }
    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, [onClose, open]);

  if (!open || items.length === 0) {
    return null;
  }

  return (
    <div
      ref={menuRef}
      className="cv-context-menu"
      role="menu"
      aria-label={ariaLabel}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      {items.map((item) => (
        <Fragment key={item.key}>
          {item.separatorBefore ? <div className="cv-context-menu__separator" role="separator" /> : null}
          <button
            type="button"
            role="menuitem"
            className={item.hint ? "cv-context-menu__item cv-context-menu__item--with-hint" : "cv-context-menu__item"}
            onClick={() => {
              item.onSelect();
              onClose();
            }}
          >
            <span className="cv-context-menu__label">{item.label}</span>
            {item.hint ? <span className="cv-context-menu__hint">{item.hint}</span> : null}
          </button>
        </Fragment>
      ))}
    </div>
  );
}
