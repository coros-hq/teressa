import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "~/components/ui/button";

import { CanvasControls } from "./canvas-controls";
import { CanvasObject } from "./canvas-object";
import { LivePreview } from "./live-preview";
import { MeasureLayer } from "./measure-layer";
import { SelectionLayer } from "./selection-layer";
import { CanvasToolbar, type Tool } from "./canvas-toolbar";
import {
  absBox,
  adoptingFrame,
  boundsOf,
  canCreateComponent,
  canGroup,
  outerGroup,
  translateObjects,
  childrenOf,
  defaultsFor,
  descendantIds,
  leafIds,
  placeInFrame,
  removeObjects,
  reparent,
  withInstanceGeometry,
  FRAME_PRESETS,
  isLineKind,
  KIND_LABEL,
  MIN_SIZE,
  newId,
  withEndpoints,
  type Box,
  type DesignObject,
  type ObjectKind,
} from "./design-model";
import type { PreviewStatus } from "./preview-frame";
import { MIN_ZOOM, useCanvasTransform } from "./use-canvas-transform";

const FIT_PADDING = 64;
const GAP = 80;
const ZOOM_STEP = 1.25;

type ElementSelection = { objectId: string; sid: number; tag: string };

// The workspace: a dot-grid canvas you can pan and zoom, where you add frames and shapes, select
// them, move them and resize them, and turn finished designs into components. A component's code
// preview stays sandboxed: all pointer input is handled here (a transparent layer sits over it),
// and the preview is only asked "what is at this point?".
export function Canvas({
  objects: rawObjects,
  onObjectsChange,
  onCommit,
  selectedIds,
  onSelectObjects,
  previews,
  theme,
  selectedElement,
  onSelectElement,
  onCreateComponent,
  onCreateInstance,
  onDuplicate,
  onGroup,
  onUngroup,
  focusRequest,
}: {
  objects: DesignObject[];
  /** `key` marks a stream of changes (like a drag) that should be a single undo step. */
  onObjectsChange: (update: (objects: DesignObject[]) => DesignObject[], key?: string) => void;
  /** Ends a drag or resize, so the next change is a new undo step. */
  onCommit: () => void;
  selectedIds: string[];
  onSelectObjects: (ids: string[]) => void;
  /** Each component's code, with an id added to every element, by component id. */
  previews: Record<string, string>;
  theme: "light" | "dark";
  selectedElement: ElementSelection | null;
  /** Called with the picked element inside a component, or with nulls to clear it. */
  onSelectElement: (objectId: string | null, sid: number | null) => void;
  onCreateComponent: () => void;
  onCreateInstance: (componentId: string) => void;
  onDuplicate: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  /** Bring this object into view. Change `nonce` to do it again. */
  focusRequest: { id: string; nonce: number } | null;
}) {
  // Instances take their main component's size and look.
  const objects = withInstanceGeometry(rawObjects);
  const [statuses, setStatuses] = useState<Record<string, PreviewStatus>>({});
  const [restartKey, setRestartKey] = useState(0);

  const area = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const { view, setView, zoomAt, panBy } = useCanvasTransform();
  const [tool, setTool] = useState<Tool>("select");

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The world's origin starts at the middle of the canvas.
  const started = useRef(false);
  useEffect(() => {
    if (size.w && !started.current) {
      started.current = true;
      setView({ zoom: 1, x: size.w / 2, y: size.h / 2 });
    }
  }, [size.w, size.h, setView]);

  // Bring a box into view: as large as fits, never above 100%.
  const fitTo = useCallback(
    (box: Box) => {
      if (!size.w) return;
      const zoom = Math.min(
        1,
        Math.max(MIN_ZOOM, Math.min((size.w - FIT_PADDING * 2) / box.width, (size.h - FIT_PADDING * 2) / box.height))
      );
      setView({
        zoom,
        x: size.w / 2 - (box.x + box.width / 2) * zoom,
        y: size.h / 2 - (box.y + box.height / 2) * zoom,
      });
    },
    [size.w, size.h, setView]
  );

  const topLevel = objects.filter((o) => !o.parentId);
  const fitAll = () => {
    const b = boundsOf(topLevel);
    if (b) fitTo(b);
    else setView({ zoom: 1, x: size.w / 2, y: size.h / 2 });
  };

  useEffect(() => {
    if (!focusRequest) return;
    const o = objects.find((x) => x.id === focusRequest.id);
    if (o) fitTo(absBox(objects, o));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest?.nonce]);

  // ---- adding things ---------------------------------------------------------------------------
  // `nest`: objects you draw go into the frame they are drawn on. Presets and the component don't.
  const addObject = (o: Omit<DesignObject, "id"> & { id?: string }, focus: boolean, nest = false): string => {
    const made = { ...defaultsFor(o.kind), ...o, id: newId() } as DesignObject;
    const obj = nest ? placeInFrame(objects, made) : made;
    onObjectsChange((all) => [...all, obj]);
    onSelectObjects([obj.id]);
    onSelectElement(null, null);
    setTool("select");
    if (focus) fitTo(obj);
    area.current?.focus({ preventScroll: true });
    return obj.id;
  };

  // New objects land beside the existing ones, or in the middle of an empty canvas.
  const nextPosition = (width: number, height: number) => {
    const b = boundsOf(topLevel);
    return b ? { x: b.x + b.width + GAP, y: b.y } : { x: -width / 2, y: -height / 2 };
  };

  const nameFor = (kind: ObjectKind) => `${KIND_LABEL[kind]} ${objects.filter((o) => o.kind === kind).length + 1}`;
  // A text object that was just placed opens for typing right away.
  const [justPlaced, setJustPlaced] = useState<string | null>(null);
  useEffect(() => {
    if (justPlaced) setJustPlaced(null);
  }, [justPlaced]);
  const addPreset = (p: (typeof FRAME_PRESETS)[number]) =>
    addObject(
      { kind: "frame", name: p.label, width: p.width, height: p.height, ...nextPosition(p.width, p.height) },
      true
    );
  const updateObject = (id: string, patch: Partial<DesignObject>) =>
    onObjectsChange((all) => all.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  // Resizing streams many changes; they are one undo step.
  const resizeObject = (id: string, patch: Partial<DesignObject>) =>
    onObjectsChange((all) => all.map((o) => (o.id === id ? { ...o, ...patch } : o)), `g:resize:${id}`);

  const removeSelected = () => {
    if (!selectedIds.length) return;
    // Anything inside goes too, and instances of a deleted component become plain frames.
    onObjectsChange((all) => removeObjects(all, selectedIds));
    onSelectObjects([]);
    onSelectElement(null, null);
  };

  // ---- moving: everything selected moves together; dropping on a frame adopts, off it releases ---
  // What is being moved or resized right now: the measurement lines follow it.
  const [measuring, setMeasuring] = useState<string[] | null>(null);
  const moveRef = useRef<{
    origin: Record<string, DesignObject>;
    /** What is dropped into frames: the selected objects (a group counts as one). */
    ids: string[];
    /** What actually moves: those objects, or a group's members. */
    leaves: string[];
    prevSelection: string[];
    pressed: string;
  } | null>(null);

  // Clicking something inside a group selects the whole group. Once you are inside it (something in
  // the group is selected), clicks pick single members.
  const selectTarget = (id: string) => {
    const g = outerGroup(objects, id);
    if (!g) return id;
    const inside = descendantIds(objects, g.id);
    return selectedIds.some((s) => s === id || inside.has(s)) ? id : g.id;
  };
  // Double-click goes inside the group and selects just that member.
  const drill = (id: string): boolean => {
    const g = outerGroup(objects, id);
    if (!g) return false;
    const inside = descendantIds(objects, g.id);
    if (selectedIds.some((s) => inside.has(s))) return false;
    onSelectObjects([id]);
    return true;
  };

  const beginMove = (clicked: string, additive: boolean) => {
    const id = selectTarget(clicked);
    area.current?.focus({ preventScroll: true });
    const next = additive
      ? selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
      : selectedIds.includes(id)
        ? selectedIds
        : [id];
    onSelectObjects(next);
    onSelectElement(null, null);
    // Objects inside a selected frame already travel with it.
    const set = new Set(next);
    const ids = next.filter((i) => {
      for (let p = objects.find((o) => o.id === i)?.parentId; p; p = objects.find((o) => o.id === p)?.parentId) {
        if (set.has(p)) return false;
      }
      return true;
    });
    const moving = additive && !next.includes(id) ? [] : ids;
    const leaves = moving.flatMap((i) => leafIds(objects, i));
    moveRef.current = {
      origin: Object.fromEntries(objects.filter((o) => leaves.includes(o.id)).map((o) => [o.id, o])),
      ids: moving,
      leaves,
      prevSelection: selectedIds,
      pressed: id,
    };
  };

  const moveBy = (dx: number, dy: number) => {
    const m = moveRef.current;
    if (!m || !m.ids.length) return;
    setMeasuring((cur) => cur ?? m.ids);
    onObjectsChange((all) =>
      all.map((o) => {
        const s = m.origin[o.id];
        if (!s || !m.leaves.includes(o.id)) return o;
        return {
          ...o,
          x: s.x + dx,
          y: s.y + dy,
          ...(s.x1 !== undefined ? { x1: s.x1 + dx, y1: s.y1! + dy, x2: s.x2! + dx, y2: s.y2! + dy } : {}),
        };
      })
, "g:move");
  };

  const endMove = (moved: boolean, additive: boolean) => {
    const m = moveRef.current;
    moveRef.current = null;
    setMeasuring(null);
    if (!m) {
      onCommit();
      return;
    }
    if (!moved) {
      // A plain click on one of several selected objects narrows the selection to it.
      if (!additive && m.prevSelection.length > 1 && m.prevSelection.includes(m.pressed)) onSelectObjects([m.pressed]);
      return;
    }
    onObjectsChange((all) => {
      let next = all;
      for (const id of m.ids) {
        const o = next.find((x) => x.id === id);
        if (!o) continue;
        const exclude = new Set([id, ...descendantIds(next, id)]);
        next = reparent(next, id, adoptingFrame(next, o, exclude)?.id ?? null);
      }
      return next;
    }, "g:move");
    onCommit();
  };

  const nudge = (dx: number, dy: number) =>
    onObjectsChange((all) => translateObjects(all, selectedIds, dx, dy), "nudge");

  // ---- wheel: Ctrl/Cmd + scroll zooms, plain scroll (or two fingers) pans ----------------------
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        // One mouse-wheel notch is about a third more (or less); trackpad pinches are smoother.
        const delta = Math.max(-100, Math.min(100, e.deltaY));
        zoomAt(e.clientX - rect.left, e.clientY - rect.top, (z) => z * Math.exp(-delta * 0.003));
      } else {
        panBy(-e.deltaX, -e.deltaY);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt, panBy]);

  // ---- pan (Space+drag, middle button) and drawing a frame with the Frame tool ------------------
  const [spaceDown, setSpaceDown] = useState(false);
  const [panning, setPanning] = useState(false);
  const drag = useRef<
    | { kind: "pan"; x: number; y: number }
    | { kind: "draw"; tool: Tool; x0: number; y0: number }
    | { kind: "marquee"; x0: number; y0: number; additive: boolean }
    | null
  >(null);
  const [marquee, setMarquee] = useState<Box | null>(null);
  const [draft, setDraft] = useState<{ tool: Tool; x0: number; y0: number; x1: number; y1: number } | null>(null);
  // The browser sends a click after a drag ends; it must not count as "clicked the empty canvas".
  const swallowClick = useRef(false);

  const worldOf = (e: { clientX: number; clientY: number }) => {
    const r = area.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left - view.x) / view.zoom, y: (e.clientY - r.top - view.y) / view.zoom };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    swallowClick.current = false;
    area.current?.focus({ preventScroll: true });
    if (e.button === 1 || (e.button === 0 && spaceDown)) {
      e.preventDefault();
      drag.current = { kind: "pan", x: e.clientX, y: e.clientY };
      setPanning(true);
      area.current?.setPointerCapture(e.pointerId);
    } else if (e.button === 0 && tool === "select" && e.target === e.currentTarget) {
      // Drag on empty canvas to select what the box touches.
      const { x, y } = worldOf(e);
      drag.current = { kind: "marquee", x0: x, y0: y, additive: e.shiftKey };
      setMarquee({ x, y, width: 0, height: 0 });
      area.current?.setPointerCapture(e.pointerId);
    } else if (e.button === 0 && tool === "text") {
      // Text is placed with a click, then typed straight away.
      const { x, y } = worldOf(e);
      swallowClick.current = true;
      const id = addObject(
        { kind: "text", name: nameFor("text"), x, y, width: 200, height: 32 },
        false,
        true
      );
      // Open it for typing just after the browser has finished moving focus for this click.
      window.setTimeout(() => setJustPlaced(id), 30);
    } else if (e.button === 0 && tool !== "select") {
      const { x, y } = worldOf(e);
      drag.current = { kind: "draw", tool, x0: x, y0: y };
      setDraft({ tool, x0: x, y0: y, x1: x, y1: y });
      area.current?.setPointerCapture(e.pointerId);
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (d.kind === "pan") {
      panBy(e.clientX - d.x, e.clientY - d.y);
      drag.current = { ...d, x: e.clientX, y: e.clientY };
    } else if (d.kind === "marquee") {
      const { x, y } = worldOf(e);
      setMarquee({ x: Math.min(d.x0, x), y: Math.min(d.y0, y), width: Math.abs(x - d.x0), height: Math.abs(y - d.y0) });
    } else {
      let { x, y } = worldOf(e);
      if (e.shiftKey) {
        // Shift keeps squares and circles even, and lines at 45 degree steps.
        const dx = x - d.x0;
        const dy = y - d.y0;
        if (isLineKind(d.tool as ObjectKind)) {
          const step = Math.PI / 4;
          const ang = Math.round(Math.atan2(dy, dx) / step) * step;
          const len = Math.hypot(dx, dy);
          x = d.x0 + Math.cos(ang) * len;
          y = d.y0 + Math.sin(ang) * len;
        } else {
          const m = Math.max(Math.abs(dx), Math.abs(dy));
          x = d.x0 + Math.sign(dx || 1) * m;
          y = d.y0 + Math.sign(dy || 1) * m;
        }
      }
      setDraft({ tool: d.tool, x0: d.x0, y0: d.y0, x1: x, y1: y });
    }
  };
  const endDrag = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    swallowClick.current = true;
    setPanning(false);
    if (area.current?.hasPointerCapture(e.pointerId)) area.current.releasePointerCapture(e.pointerId);
    if (d.kind === "marquee" && marquee) {
      const hits =
        marquee.width < 3 && marquee.height < 3
          ? []
          : topLevel
              .filter((o) => {
                const b = absBox(objects, o);
                return b.x <= marquee.x + marquee.width && b.x + b.width >= marquee.x && b.y <= marquee.y + marquee.height && b.y + b.height >= marquee.y;
              })
              .map((o) => o.id);
      onSelectObjects(d.additive ? [...new Set([...selectedIds, ...hits])] : hits);
      onSelectElement(null, null);
      setMarquee(null);
    }
    if (d.kind === "draw" && draft) {
      const box = { x: Math.min(draft.x0, draft.x1), y: Math.min(draft.y0, draft.y1), width: Math.abs(draft.x1 - draft.x0), height: Math.abs(draft.y1 - draft.y0) };
      const kind = d.tool as ObjectKind;
      if (kind === "frame") {
        // A click without dragging draws nothing.
        if (box.width >= MIN_SIZE && box.height >= MIN_SIZE) addObject({ kind, name: nameFor(kind), ...box }, false, true);
      } else if (kind === "rect" || kind === "ellipse") {
        // A plain click drops a default-size shape.
        const tiny = box.width < 6 && box.height < 6;
        addObject(
          { kind, name: nameFor(kind), ...(tiny ? { x: draft.x0, y: draft.y0, width: 100, height: 100 } : box) },
          false,
          true
        );
      } else if (kind === "line" || kind === "arrow") {
        if (Math.hypot(draft.x1 - draft.x0, draft.y1 - draft.y0) >= 6) {
          addObject(
            withEndpoints({ id: "", kind, name: nameFor(kind), x: 0, y: 0, width: 0, height: 0 }, draft.x0, draft.y0, draft.x1, draft.y1),
            false,
            true
          );
        }
      }
      setDraft(null);
    }
  };

  // ---- keyboard: zoom shortcuts, tools, delete. Only while the canvas itself has focus ----------
  const zoomCenter = (to: number | ((z: number) => number)) => zoomAt(size.w / 2, size.h / 2, to);
  const onKeyDown = (e: React.KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey;
    const onCanvas = e.target === e.currentTarget;
    if (mod && (e.key === "+" || e.key === "=")) {
      e.preventDefault();
      zoomCenter((z) => z * ZOOM_STEP);
    } else if (mod && (e.key === "-" || e.key === "_")) {
      e.preventDefault();
      zoomCenter((z) => z / ZOOM_STEP);
    } else if (mod && e.key === "0") {
      e.preventDefault();
      zoomCenter(1);
    } else if (mod && e.altKey && e.code === "KeyK") {
      // Create component from the selection
      e.preventDefault();
      if (canMakeComponent) onCreateComponent();
    } else if (mod && onCanvas && (e.key === "g" || e.key === "G")) {
      // Ctrl/Cmd+G groups the selection, and with Shift it ungroups.
      e.preventDefault();
      if (e.shiftKey) onUngroup();
      else onGroup();
    } else if (mod && onCanvas && (e.key === "d" || e.key === "D")) {
      e.preventDefault();
      onDuplicate();
    } else if (mod && onCanvas && (e.key === "a" || e.key === "A")) {
      e.preventDefault();
      onSelectObjects(topLevel.map((o) => o.id));
      onSelectElement(null, null);
    } else if (!onCanvas || mod || e.altKey) {
      return;
    } else if (e.key.startsWith("Arrow") && selectedIds.length) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      nudge(e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0, e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0);
    } else if (e.key === " ") {
      e.preventDefault();
      setSpaceDown(true);
    } else if (e.key === "Escape") {
      onSelectObjects([]);
      onSelectElement(null, null);
      setTool("select");
    } else if (e.key === "v" || e.key === "V") {
      setTool("select");
    } else if (e.key === "f" || e.key === "F") {
      setTool("frame");
    } else if (e.key === "r" || e.key === "R") {
      setTool("rect");
    } else if (e.key === "o" || e.key === "O") {
      setTool("ellipse");
    } else if (e.key === "l" || e.key === "L") {
      setTool("line");
    } else if (e.key === "a" || e.key === "A") {
      setTool("arrow");
    } else if (e.key === "t" || e.key === "T") {
      setTool("text");
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      removeSelected();
    }
  };
  const onKeyUp = (e: React.KeyboardEvent) => {
    if (e.key === " ") setSpaceDown(false);
  };

  const cursor = panning ? "grabbing" : spaceDown ? "grab" : tool === "select" ? "default" : tool === "text" ? "text" : "crosshair";
  const outline = 1.5 / view.zoom;

  const canPick = tool === "select" && !spaceDown && !panning;
  const componentCode = (main: DesignObject) => (main.code !== undefined ? previews[main.id] : undefined);

  // Draws the objects inside a frame or component. `readOnly` is for what an instance shows of its
  // main component: the same layers, drawn without any interaction.
  const renderObjects = (parentId: string | null, readOnly = false): React.ReactNode =>
    childrenOf(objects, parentId).map((o) => {
      // A component with code shows its live preview instead of its layers. An instance shows its
      // main component's.
      const main = o.kind === "instance" ? objects.find((m) => m.id === o.componentId) : o;
      const code = main && main.kind === "component" ? componentCode(main) : undefined;
      const interactive = !readOnly && o.kind === "component";
      return (
        <CanvasObject
          key={o.id}
          obj={o}
          selected={selectedIds.includes(o.id)}
          topLevel={parentId === null}
          zoom={view.zoom}
          tool={tool}
          panMode={spaceDown || panning}
          readOnly={readOnly}
          autoEdit={justPlaced === o.id}
          onMoveStart={(additive) => beginMove(o.id, additive)}
          onMoveBy={moveBy}
          onMoveEnd={endMove}
          onChange={(patch) => updateObject(o.id, patch)}
          onDrill={() => drill(o.id)}
          nested={
            o.kind === "instance"
              ? code === undefined && main
                ? renderObjects(main.id, true)
                : undefined
              : o.kind === "frame" || o.kind === "group" || (o.kind === "component" && code === undefined)
                ? renderObjects(o.id, readOnly)
                : undefined
          }
        >
          {code !== undefined && (
            <LivePreview
              objectId={o.id}
              code={code}
              theme={theme}
              zoom={view.zoom}
              restartKey={restartKey}
              interactive={interactive}
              canPick={canPick}
              selectedSid={selectedElement?.objectId === o.id ? selectedElement.sid : null}
              selectedTag={selectedElement?.objectId === o.id ? selectedElement.tag : null}
              cursor={cursor}
              onStatus={(id, st) => setStatuses((all) => (all[id]?.kind === st.kind && st.kind !== "error" ? all : { ...all, [id]: st }))}
              onPick={(id, sid) => {
                onSelectObjects([id]);
                onSelectElement(sid === null ? null : id, sid);
              }}
            />
          )}
        </CanvasObject>
      );
    });

  // The component whose preview the messages below are about.
  const activeId =
    selectedElement?.objectId ??
    (selectedIds.length === 1 && objects.find((o) => o.id === selectedIds[0])?.kind === "component" ? selectedIds[0] : null);
  const activeStatus = activeId ? statuses[activeId] : undefined;

  const selectedObject = selectedIds.length === 1 ? objects.find((o) => o.id === selectedIds[0]) : undefined;
  const canMakeComponent = canCreateComponent(objects, selectedIds);
  const canMakeInstance = selectedObject?.kind === "component";

  return (
    <main
      aria-label="Canvas"
      ref={area}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={() => setSpaceDown(false)}
      onClick={(e) => {
        if (swallowClick.current) {
          swallowClick.current = false;
          return;
        }
        if (e.target === e.currentTarget && tool === "select") {
          onSelectObjects([]);
          onSelectElement(null, null);
        }
      }}
      className="focus-visible:ring-ring/50 relative h-full min-h-0 min-w-0 touch-none overflow-hidden outline-none focus-visible:ring-3 focus-visible:ring-inset"
      style={{
        cursor,
        backgroundColor: "color-mix(in srgb, var(--muted) 45%, var(--background))",
        backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)",
        backgroundSize: `${16 * view.zoom}px ${16 * view.zoom}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
      }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}
      >
        {renderObjects(null)}
        <SelectionLayer
          objects={objects}
          selectedIds={selectedIds}
          zoom={view.zoom}
          onChange={resizeObject}
          onGesture={(id) => {
            setMeasuring(id ? [id] : null);
            if (!id) onCommit();
          }}
        />
        {measuring && <MeasureLayer objects={objects} ids={measuring} zoom={view.zoom} />}
        {marquee && (
          <div
            className="pointer-events-none absolute"
            style={{
              left: marquee.x,
              top: marquee.y,
              width: marquee.width,
              height: marquee.height,
              border: `${outline}px solid var(--secondary)`,
              background: "color-mix(in srgb, var(--secondary) 10%, transparent)",
            }}
          />
        )}

        {/* The shape being drawn. */}
        {draft && (draft.tool === "line" || draft.tool === "arrow") && (
          <svg className="pointer-events-none absolute top-0 left-0 overflow-visible" width={1} height={1} aria-hidden="true">
            <line x1={draft.x0} y1={draft.y0} x2={draft.x1} y2={draft.y1} stroke="var(--secondary)" strokeWidth={outline * 1.5} strokeLinecap="round" />
          </svg>
        )}
        {draft && draft.tool !== "line" && draft.tool !== "arrow" && (
          <div
            className="pointer-events-none absolute"
            style={{
              left: Math.min(draft.x0, draft.x1),
              top: Math.min(draft.y0, draft.y1),
              width: Math.abs(draft.x1 - draft.x0),
              height: Math.abs(draft.y1 - draft.y0),
              boxShadow: `0 0 0 ${outline}px var(--secondary)`,
              background: "color-mix(in srgb, var(--secondary) 8%, transparent)",
              borderRadius: draft.tool === "ellipse" ? "50%" : undefined,
            }}
          >
            <span
              className="bg-secondary text-secondary-foreground absolute top-full right-0 mt-1.5 origin-top-right rounded px-1.5 py-0.5 font-mono text-[11px] leading-none whitespace-nowrap"
              style={{ transform: `scale(${1 / view.zoom})` }}
            >
              {Math.round(Math.abs(draft.x1 - draft.x0))} × {Math.round(Math.abs(draft.y1 - draft.y0))}
            </span>
          </div>
        )}
      </div>

      {objects.length === 0 && !draft && tool === "select" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
          <div
            className="pointer-events-auto grid max-w-md justify-items-center gap-4 text-center"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="grid gap-1">
              <p className="text-lg font-semibold">Your canvas is empty</p>
              <p className="text-muted-foreground text-sm">
                Add a frame for a screen size, or pick a tool above to draw a frame or a shape. When a
                design is finished, select it and turn it into a component.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {FRAME_PRESETS.map((p) => (
                <Button key={p.id} variant="outline" onClick={() => addPreset(p)}>
                  {p.label}
                  <span className="text-muted-foreground font-mono text-xs">{p.width}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Messages stay a readable size and sit above the canvas, whatever the zoom. */}
      {activeStatus?.kind === "error" && (
        <div
          role="alert"
          className="bg-card absolute inset-x-4 top-16 z-20 max-h-[45%] overflow-auto rounded-lg border p-4 shadow-md"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <p className="text-destructive text-sm font-semibold">
            {activeStatus.phase === "compile" ? "This code can't be compiled" : "This component hit an error"}
          </p>
          <pre className="mt-2 font-mono text-[13px] leading-relaxed break-words whitespace-pre-wrap">
            {activeStatus.message}
          </pre>
          <p className="text-muted-foreground mt-2 text-xs">
            The last working version stays visible until this is fixed.
          </p>
        </div>
      )}
      {activeStatus?.kind === "stalled" && (
        <div
          role="alert"
          className="bg-card absolute inset-x-4 top-16 z-20 flex items-center justify-between gap-3 rounded-lg border p-4 shadow-md"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-medium">The preview stopped responding.</p>
          <Button size="sm" onClick={() => setRestartKey((n) => n + 1)}>
            Restart preview
          </Button>
        </div>
      )}

      <CanvasToolbar
        tool={tool}
        onTool={setTool}
        onAddPreset={addPreset}
        canCreateComponent={canMakeComponent}
        onCreateComponent={onCreateComponent}
        canCreateInstance={canMakeInstance}
        onCreateInstance={() => selectedObject && onCreateInstance(selectedObject.id)}
        canGroup={canGroup(objects, selectedIds)}
        onGroup={onGroup}
        canUngroup={selectedObject?.kind === "group"}
        onUngroup={onUngroup}
      />
      <CanvasControls
        zoom={view.zoom}
        onZoomOut={() => zoomCenter((z) => z / ZOOM_STEP)}
        onZoomIn={() => zoomCenter((z) => z * ZOOM_STEP)}
        onReset={() => zoomCenter(1)}
        onFit={fitAll}
      />
      <span className="sr-only" aria-live="polite">
        {selectedElement
          ? `Selected ${selectedElement.tag}`
          : selectedIds.length
            ? `${selectedIds.length} selected`
            : ""}
      </span>
    </main>
  );
}
