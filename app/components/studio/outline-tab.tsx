import {
  ChevronRight,
  Circle,
  Component,
  Diamond,
  Frame,
  Group,
  MoveUpRight,
  Slash,
  Square,
  Type,
  type LucideIcon,
} from "lucide-react";

import { cn } from "~/lib/utils";

import { childrenOf, holdsChildren, type DesignObject, type ObjectKind } from "./design-model";
import type { JsxNodeInfo } from "./jsx-tree";

const ICONS: Record<ObjectKind, LucideIcon> = {
  frame: Frame,
  component: Component,
  instance: Diamond,
  group: Group,
  rect: Square,
  ellipse: Circle,
  line: Slash,
  arrow: MoveUpRight,
  text: Type,
};

// Everything on the canvas as a tree: frames and components with what is inside them, top layer
// first. A component that has code also lists the elements of that code.
export function OutlineTab({
  objects,
  selectedIds,
  onSelectObject,
  codeComponentId,
  nodes,
  selectedSid,
  onPickElement,
}: {
  objects: DesignObject[];
  selectedIds: string[];
  onSelectObject: (id: string, additive: boolean) => void;
  /** The component whose code elements are listed, when it has code. */
  codeComponentId: string | null;
  nodes: JsxNodeInfo[];
  selectedSid: number | null;
  onPickElement: (sid: number) => void;
}) {
  if (!objects.length) {
    return (
      <p className="text-muted-foreground p-4 text-sm">
        Frames, shapes and components you add will be listed here.
      </p>
    );
  }

  const row = (depth: number, selected: boolean, content: React.ReactNode, onClick: (e: React.MouseEvent) => void, key: string) => (
    <li key={key}>
      <button
        type="button"
        onClick={onClick}
        aria-current={selected ? "true" : undefined}
        style={{ paddingLeft: 8 + depth * 14 }}
        className={cn(
          "focus-visible:ring-ring/50 flex h-8 w-full items-center gap-2 rounded-md pr-2 text-left text-sm outline-none focus-visible:ring-3",
          selected ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
        )}
      >
        {content}
      </button>
    </li>
  );

  const layers = (parentId: string | null, depth: number): React.ReactNode[] =>
    // The top layer is listed first.
    [...childrenOf(objects, parentId)].reverse().flatMap((o) => {
      const Icon = ICONS[o.kind];
      const withCode = o.kind === "component" && o.code !== undefined;
      const items: React.ReactNode[] = [
        row(
          depth,
          selectedIds.includes(o.id),
          <>
            <Icon className={cn("size-4 shrink-0", (o.kind === "component" || o.kind === "instance") && "text-secondary")} aria-hidden="true" />
            <span className="truncate">{o.name}</span>
          </>,
          (e) => onSelectObject(o.id, e.shiftKey),
          o.id
        ),
      ];
      if (withCode && o.id === codeComponentId) {
        for (const n of nodes) {
          items.push(
            row(
              depth + 1 + n.depth,
              selectedSid === n.sid,
              <>
                <ChevronRight className="size-3 shrink-0 opacity-50" aria-hidden="true" />
                <span className="font-mono text-[13px]">{n.tag}</span>
                {n.text && <span className="truncate text-xs opacity-70">{n.text.value}</span>}
              </>,
              () => onPickElement(n.sid),
              `${o.id}:${n.sid}`
            )
          );
        }
      } else if (holdsChildren(o.kind) && !withCode) {
        items.push(...layers(o.id, depth + 1));
      }
      return items;
    });

  return (
    <ul className="grid gap-0.5 p-2" aria-label="Layers">
      {layers(null, 0)}
    </ul>
  );
}
