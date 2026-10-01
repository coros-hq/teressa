import { ChevronDown, Circle, Component, Copy, Frame, Group, MousePointer2, MoveUpRight, Slash, Square, Type, Ungroup } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";

import { FRAME_PRESETS } from "./design-model";

export type Tool = "select" | "frame" | "rect" | "ellipse" | "line" | "arrow" | "text";

// Floating tools at the top of the canvas.
export function CanvasToolbar({
  tool,
  onTool,
  onAddPreset,
  canCreateComponent,
  onCreateComponent,
  canCreateInstance,
  onCreateInstance,
  canGroup,
  onGroup,
  canUngroup,
  onUngroup,
}: {
  tool: Tool;
  onTool: (tool: Tool) => void;
  onAddPreset: (preset: (typeof FRAME_PRESETS)[number]) => void;
  /** Offered when the selection can become a component. */
  canCreateComponent: boolean;
  onCreateComponent: () => void;
  /** Offered when a main component is selected. */
  canCreateInstance: boolean;
  onCreateInstance: () => void;
  /** Offered when several objects are selected side by side. */
  canGroup: boolean;
  onGroup: () => void;
  /** Offered when a group is selected. */
  canUngroup: boolean;
  onUngroup: () => void;
}) {
  const toolButton = (id: Tool, label: string, shortcut: string, icon: React.ReactNode) => (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`${label} (${shortcut})`}
      title={`${label} (${shortcut})`}
      aria-pressed={tool === id}
      onClick={() => onTool(id)}
      className={cn(tool === id && "bg-secondary text-secondary-foreground hover:bg-secondary/90 hover:text-secondary-foreground")}
    >
      {icon}
    </Button>
  );

  return (
    <div
      role="toolbar"
      aria-label="Canvas tools"
      className="bg-popover text-popover-foreground absolute top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border p-1 shadow-md"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {toolButton("select", "Select", "V", <MousePointer2 />)}
      {toolButton("frame", "Frame", "F", <Frame />)}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Frame sizes" className="-ml-1 w-6">
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-52">
          <DropdownMenuLabel>Add a frame</DropdownMenuLabel>
          {FRAME_PRESETS.map((p) => (
            <DropdownMenuItem key={p.id} onSelect={() => onAddPreset(p)}>
              {p.label}
              <span className="text-muted-foreground ml-auto font-mono text-xs">
                {p.width} × {p.height}
              </span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
            Or choose the Frame tool and drag on the canvas for any size.
          </DropdownMenuLabel>
        </DropdownMenuContent>
      </DropdownMenu>
      <span aria-hidden="true" className="bg-border mx-1 h-5 w-px" />
      {toolButton("rect", "Rectangle", "R", <Square />)}
      {toolButton("ellipse", "Ellipse", "O", <Circle />)}
      {toolButton("line", "Line", "L", <Slash />)}
      {toolButton("arrow", "Arrow", "A", <MoveUpRight />)}
      {toolButton("text", "Text", "T", <Type />)}
      {(canGroup || canUngroup || canCreateComponent || canCreateInstance) && (
        <>
          <span aria-hidden="true" className="bg-border mx-1 h-5 w-px" />
          {canGroup && (
            <Button variant="ghost" onClick={onGroup} title="Group (Ctrl/Cmd+G)">
              <Group data-icon="inline-start" />
              Group
            </Button>
          )}
          {canUngroup && (
            <Button variant="ghost" onClick={onUngroup} title="Ungroup (Ctrl/Cmd+Shift+G)">
              <Ungroup data-icon="inline-start" />
              Ungroup
            </Button>
          )}
          {canCreateComponent && (
            <Button variant="ghost" onClick={onCreateComponent} title="Create component (Ctrl/Cmd+Alt+K)">
              <Component data-icon="inline-start" />
              Create component
            </Button>
          )}
          {canCreateInstance && (
            <Button variant="ghost" onClick={onCreateInstance} title="Create an instance (Ctrl/Cmd+D)">
              <Copy data-icon="inline-start" />
              Create instance
            </Button>
          )}
        </>
      )}
    </div>
  );
}
