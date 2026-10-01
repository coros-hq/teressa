import { Component as ComponentIcon, Diamond } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "~/lib/utils";

import type { Tool } from "./canvas-toolbar";
import { boxShadowCss, isContainer, isLineKind, textShadowCss, type DesignObject } from "./design-model";

// One thing on the canvas: a frame, the live component, or a shape. It draws itself (and the objects
// nested inside it), and handles moving, renaming and editing text. Selection outlines and resize
// handles live in the selection layer, so a frame's edge never clips them.
export function CanvasObject({
  obj,
  selected,
  topLevel,
  zoom,
  tool,
  panMode,
  autoEdit = false,
  onMoveStart,
  onMoveBy,
  onMoveEnd,
  onChange,
  onDrill,
  readOnly = false,
  children,
  nested,
}: {
  obj: DesignObject;
  selected: boolean;
  /** Only objects on the canvas itself get a name label above them. */
  topLevel: boolean;
  zoom: number;
  tool: Tool;
  /** Space is held or the middle button is used: let the canvas pan instead. */
  panMode: boolean;
  /** Open a text object for typing as soon as it appears. */
  autoEdit?: boolean;
  onMoveStart: (additive: boolean) => void;
  onMoveBy: (dx: number, dy: number) => void;
  onMoveEnd: (moved: boolean, additive: boolean) => void;
  onChange: (patch: Partial<DesignObject>) => void;
  /** Double-click on something inside a group: go inside and select just that. Returns true if it did. */
  onDrill?: () => boolean;
  /** Draws it without any interaction: for what an instance shows of its main component. */
  readOnly?: boolean;
  /** The live preview, for a component that has code. */
  children?: React.ReactNode;
  /** The objects that sit inside this frame. */
  nested?: React.ReactNode;
}) {
  const gesture = useRef<{ sx: number; sy: number; moved: boolean } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [editingText, setEditingText] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (autoEdit && obj.kind === "text") {
      setDraft(obj.text ?? "");
      setEditingText(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEdit]);

  const isGroup = obj.kind === "group";
  const isLine = isLineKind(obj.kind);
  const isBox = isContainer(obj.kind) || obj.kind === "instance";
  const hasLabel = !readOnly && topLevel && isBox;
  const hasCode = obj.kind === "component" && obj.code !== undefined;
  const opacity = (obj.opacity ?? 100) / 100;
  const canMove = tool === "select" && !panMode && !readOnly;

  const move = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0 || !canMove) return;
      e.stopPropagation();
      e.preventDefault();
      onMoveStart(e.shiftKey);
      gesture.current = { sx: e.clientX, sy: e.clientY, moved: false };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const g = gesture.current;
      if (!g) return;
      const dx = (e.clientX - g.sx) / zoom;
      const dy = (e.clientY - g.sy) / zoom;
      if (!g.moved && Math.abs(e.clientX - g.sx) + Math.abs(e.clientY - g.sy) < 3) return;
      g.moved = true;
      onMoveBy(dx, dy);
    },
    onPointerUp: (e: React.PointerEvent) => {
      const g = gesture.current;
      if (!g) return;
      gesture.current = null;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      onMoveEnd(g.moved, e.shiftKey);
    },
    onPointerCancel: () => {
      if (gesture.current) onMoveEnd(gesture.current.moved, false);
      gesture.current = null;
    },
  };

  // Double-click drills into a group; anything else that reacts to double-click is handled below.
  const drill = {
    onDoubleClick: (e: React.MouseEvent) => {
      e.stopPropagation();
      onDrill?.();
    },
  };

  const saveName = () => {
    const next = draft.trim();
    if (next) onChange({ name: next });
    setRenaming(false);
  };
  const saveText = () => {
    onChange({ text: draft });
    setEditingText(false);
  };

  // ---- the drawing of each kind ---------------------------------------------------------------
  let body: React.ReactNode;
  if (isBox) {
    // A component with code shows its live preview, and its body is left for picking elements.
    const transparent = obj.fill === null;
    body = (
      <div
        className={cn("absolute inset-0 overflow-hidden", !transparent && "border", obj.kind === "frame" && "rounded-sm")}
        style={{
          background: transparent ? "transparent" : (obj.fill ?? "var(--background)"),
          borderRadius: obj.radius ?? (obj.kind === "frame" ? 2 : undefined),
          boxShadow: obj.shadow ? boxShadowCss(obj.shadow) : undefined,
          opacity,
        }}
        {...(hasCode ? {} : { ...move, ...drill })}
      >
        {children}
        {nested}
      </div>
    );
  } else if (isGroup) {
    // A group draws nothing itself: only its members, positioned in the space around it.
    body = <div style={{ opacity }}>{nested}</div>;
  } else if (obj.kind === "rect" || obj.kind === "ellipse") {
    body = (
      <div
        className="absolute inset-0"
        style={{
          background: obj.fill ?? "transparent",
          border: obj.stroke ? `${obj.strokeWidth ?? 1}px solid ${obj.stroke}` : undefined,
          borderRadius: obj.kind === "ellipse" ? "50%" : (obj.radius ?? 0),
          boxShadow: obj.shadow ? boxShadowCss(obj.shadow) : undefined,
          boxSizing: "border-box",
          opacity,
          cursor: canMove ? "move" : undefined,
        }}
        {...move}
        {...drill}
      />
    );
  } else if (obj.kind === "text") {
    const textStyle = {
      color: obj.fill ?? "var(--foreground)",
      fontSize: obj.fontSize ?? 24,
      fontWeight: obj.fontWeight ?? 500,
      lineHeight: 1.25,
      textAlign: obj.textAlign ?? "left",
    } as const;
    const justify = { top: "flex-start", middle: "center", bottom: "flex-end" }[obj.verticalAlign ?? "top"];
    body = editingText ? (
      <textarea
        autoFocus
        value={draft}
        aria-label="Text"
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={saveText}
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            saveText();
          }
          if (e.key === "Escape") setEditingText(false);
        }}
        className="border-ring absolute inset-0 resize-none border bg-transparent p-0 outline-none"
        style={textStyle}
      />
    ) : (
      <div
        className="absolute inset-0 select-none"
        {...move}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (tool !== "select" || onDrill?.()) return;
          setDraft(obj.text ?? "");
          setEditingText(true);
        }}
        style={{
          ...textStyle,
          display: "flex",
          flexDirection: "column",
          justifyContent: justify,
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          textShadow: obj.shadow ? textShadowCss(obj.shadow) : undefined,
          opacity,
          cursor: canMove ? "move" : undefined,
        }}
      >
        <div>{obj.text}</div>
      </div>
    );
  } else {
    // line or arrow
    const x1 = (obj.x1 ?? obj.x) - obj.x;
    const y1 = (obj.y1 ?? obj.y) - obj.y;
    const x2 = (obj.x2 ?? obj.x + obj.width) - obj.x;
    const y2 = (obj.y2 ?? obj.y + obj.height) - obj.y;
    const sw = obj.strokeWidth ?? 2;
    const stroke = obj.stroke ?? "var(--foreground)";
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const head = 8 + sw * 2;
    const bx = x2 - Math.cos(angle) * head;
    const by = y2 - Math.sin(angle) * head;
    const px = -Math.sin(angle) * head * 0.5;
    const py = Math.cos(angle) * head * 0.5;
    const isArrow = obj.kind === "arrow" && Math.hypot(x2 - x1, y2 - y1) > head;
    body = (
      <svg
        className="absolute top-0 left-0 overflow-visible"
        width={Math.max(obj.width, 1)}
        height={Math.max(obj.height, 1)}
        style={{
          opacity,
          pointerEvents: "none",
          filter: obj.shadow ? `drop-shadow(${obj.shadow.x}px ${obj.shadow.y}px ${obj.shadow.blur}px ${obj.shadow.color})` : undefined,
        }}
        aria-hidden="true"
      >
        <line x1={x1} y1={y1} x2={isArrow ? bx : x2} y2={isArrow ? by : y2} stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        {isArrow && <polygon points={`${x2},${y2} ${bx + px},${by + py} ${bx - px},${by - py}`} fill={stroke} />}
        {/* A wider invisible line so thin lines are easy to grab. */}
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="transparent"
          strokeWidth={Math.max(14 / zoom, sw)}
          style={{ pointerEvents: "stroke", cursor: canMove ? "move" : undefined }}
          {...move}
          {...drill}
        />
      </svg>
    );
  }

  return (
    <div
      className="absolute"
      data-object-id={readOnly ? undefined : obj.id}
      data-kind={obj.kind}
      data-parent={readOnly ? undefined : (obj.parentId ?? undefined)}
      // A line's box is only a bounding box, so it must not catch clicks meant for what is beneath.
      style={{
        left: isGroup ? 0 : obj.x,
        top: isGroup ? 0 : obj.y,
        width: isGroup ? 0 : obj.width,
        height: isGroup ? 0 : obj.height,
        pointerEvents: isLine || readOnly ? "none" : undefined,
      }}
    >
      {hasLabel && (
        <div
          className="absolute bottom-full left-0 origin-bottom-left pb-1"
          style={{ transform: `scale(${1 / zoom})`, width: obj.width * zoom, maxWidth: obj.width * zoom }}
        >
          {renaming ? (
            <input
              autoFocus
              value={draft}
              aria-label="Name"
              maxLength={60}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              onBlur={saveName}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") saveName();
                if (e.key === "Escape") setRenaming(false);
              }}
              className="border-ring bg-background h-6 w-40 rounded border px-1.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          ) : (
            <span
              {...move}
              onDoubleClick={() => {
                setDraft(obj.name);
                setRenaming(true);
              }}
              title="Drag to move. Double-click to rename"
              className={cn(
                "inline-flex max-w-full cursor-grab items-center gap-1 truncate rounded px-1 text-xs font-medium select-none",
                selected || obj.kind !== "frame" ? "text-secondary" : "text-muted-foreground"
              )}
              style={{ pointerEvents: "auto" }}
            >
              {obj.kind === "component" && <ComponentIcon className="size-3 shrink-0" aria-label="Component" />}
              {obj.kind === "instance" && <Diamond className="size-3 shrink-0" aria-label="Instance" />}
              <span className="truncate">{obj.name}</span>
            </span>
          )}
        </div>
      )}
      {body}
    </div>
  );
}
