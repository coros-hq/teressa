import { useRef } from "react";

import {
  absBox,
  isLineKind,
  minSizeOf,
  originOf,
  resizeBox,
  withEndpoints,
  type DesignObject,
  type Handle,
} from "./design-model";

const HANDLES: { id: Handle; cursor: string; x: number; y: number }[] = [
  { id: "nw", cursor: "nwse-resize", x: 0, y: 0 },
  { id: "n", cursor: "ns-resize", x: 0.5, y: 0 },
  { id: "ne", cursor: "nesw-resize", x: 1, y: 0 },
  { id: "e", cursor: "ew-resize", x: 1, y: 0.5 },
  { id: "se", cursor: "nwse-resize", x: 1, y: 1 },
  { id: "s", cursor: "ns-resize", x: 0.5, y: 1 },
  { id: "sw", cursor: "nesw-resize", x: 0, y: 1 },
  { id: "w", cursor: "ew-resize", x: 0, y: 0.5 },
];

type Mode = Handle | "p1" | "p2";

// Outlines and handles for whatever is selected, drawn above everything on the canvas so nothing
// can clip them. One selected object gets resize handles (or end points for a line); several
// get an outline each and one around the group.
export function SelectionLayer({
  objects,
  selectedIds,
  zoom,
  onChange,
  onGesture,
}: {
  objects: DesignObject[];
  selectedIds: string[];
  zoom: number;
  onChange: (id: string, patch: Partial<DesignObject>) => void;
  /** Called with the object's id when a resize starts, and with null when it ends. */
  onGesture?: (id: string | null) => void;
}) {
  const gesture = useRef<{ id: string; mode: Mode; sx: number; sy: number; box: DesignObject } | null>(null);
  const selected = objects.filter((o) => selectedIds.includes(o.id));
  if (!selected.length) return null;

  const line = 1.5 / zoom;
  const handle = 9 / zoom;
  const single = selected.length === 1 ? selected[0] : null;

  const drag = (o: DesignObject, mode: Mode) => ({
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      gesture.current = { id: o.id, mode, sx: e.clientX, sy: e.clientY, box: o };
      onGesture?.(o.id);
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const g = gesture.current;
      if (!g || g.mode !== mode) return;
      const dx = (e.clientX - g.sx) / zoom;
      const dy = (e.clientY - g.sy) / zoom;
      const b = g.box;
      if (g.mode === "p1" || g.mode === "p2") {
        const n =
          g.mode === "p1"
            ? withEndpoints(b, b.x1! + dx, b.y1! + dy, b.x2!, b.y2!)
            : withEndpoints(b, b.x1!, b.y1!, b.x2! + dx, b.y2! + dy);
        onChange(g.id, { x1: n.x1, y1: n.y1, x2: n.x2, y2: n.y2, x: n.x, y: n.y, width: n.width, height: n.height });
      } else {
        onChange(g.id, resizeBox(b, g.mode, dx, dy, minSizeOf(b.kind)));
      }
    },
    onPointerUp: (e: React.PointerEvent) => {
      gesture.current = null;
      onGesture?.(null);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    },
    onPointerCancel: () => {
      gesture.current = null;
      onGesture?.(null);
    },
  });

  const boxes = selected.map((o) => ({ o, b: absBox(objects, o) }));
  const group = {
    x: Math.min(...boxes.map(({ b }) => b.x)),
    y: Math.min(...boxes.map(({ b }) => b.y)),
    x2: Math.max(...boxes.map(({ b }) => b.x + b.width)),
    y2: Math.max(...boxes.map(({ b }) => b.y + b.height)),
  };

  return (
    <div className="pointer-events-none absolute top-0 left-0 z-10" aria-hidden="true">
      {boxes.map(({ o, b }) =>
        isLineKind(o.kind) ? null : (
          <div
            key={o.id}
            className="absolute"
            style={{ left: b.x, top: b.y, width: b.width, height: b.height, boxShadow: `0 0 0 ${line}px var(--secondary)` }}
          />
        )
      )}

      {selected.length > 1 && (
        <div
          className="absolute"
          style={{
            left: group.x,
            top: group.y,
            width: group.x2 - group.x,
            height: group.y2 - group.y,
            outline: `${line}px dashed color-mix(in srgb, var(--secondary) 70%, transparent)`,
            outlineOffset: 4 / zoom,
          }}
        >
          <span
            className="bg-secondary text-secondary-foreground absolute top-full right-0 mt-2.5 origin-top-right rounded px-1.5 py-0.5 font-mono text-[11px] leading-none whitespace-nowrap"
            style={{ transform: `scale(${1 / zoom})` }}
          >
            {selected.length} selected
          </span>
        </div>
      )}

      {single && !isLineKind(single.kind) && single.kind !== "instance" && single.kind !== "group" && (() => {
        const b = absBox(objects, single);
        return (
          <div className="absolute" style={{ left: b.x, top: b.y, width: b.width, height: b.height }}>
            <span
              className="bg-secondary text-secondary-foreground absolute top-full right-0 mt-1.5 origin-top-right rounded px-1.5 py-0.5 font-mono text-[11px] leading-none whitespace-nowrap"
              style={{ transform: `scale(${1 / zoom})` }}
            >
              {Math.round(single.width)} × {Math.round(single.height)}
            </span>
            {HANDLES.map((h) => (
              <span
                key={h.id}
                {...drag(single, h.id)}
                data-handle={h.id}
                className="bg-background pointer-events-auto absolute"
                style={{
                  left: `${h.x * 100}%`,
                  top: `${h.y * 100}%`,
                  width: handle,
                  height: handle,
                  transform: "translate(-50%, -50%)",
                  border: `${line}px solid var(--secondary)`,
                  borderRadius: 2 / zoom,
                  cursor: h.cursor,
                }}
              />
            ))}
          </div>
        );
      })()}

      {single && isLineKind(single.kind) && (() => {
        const org = originOf(objects, single.parentId);
        return (["p1", "p2"] as const).map((p) => (
          <span
            key={p}
            {...drag(single, p)}
            data-handle={p}
            className="bg-background pointer-events-auto absolute"
            style={{
              left: (p === "p1" ? single.x1! : single.x2!) + org.x,
              top: (p === "p1" ? single.y1! : single.y2!) + org.y,
              width: handle,
              height: handle,
              transform: "translate(-50%, -50%)",
              border: `${line}px solid var(--secondary)`,
              borderRadius: "50%",
              cursor: "crosshair",
            }}
          />
        ));
      })()}
    </div>
  );
}
