import { Maximize, Minus, Plus } from "lucide-react";

import { Button } from "~/components/ui/button";

import { MAX_ZOOM, MIN_ZOOM } from "./use-canvas-transform";

// Floating zoom controls, bottom center of the canvas. All of them work with the keyboard.
export function CanvasControls({
  zoom,
  onZoomOut,
  onZoomIn,
  onReset,
  onFit,
}: {
  zoom: number;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onReset: () => void;
  onFit: () => void;
}) {
  return (
    <div
      role="group"
      aria-label="Zoom"
      className="bg-popover text-popover-foreground absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border p-1 shadow-md"
      // Keep canvas pan/selection handlers from seeing clicks on the controls.
      onPointerDown={(e) => e.stopPropagation()}
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label="Zoom out"
        disabled={zoom <= MIN_ZOOM}
        onClick={onZoomOut}
      >
        <Minus />
      </Button>
      <Button
        variant="ghost"
        aria-label={`Zoom ${Math.round(zoom * 100)} percent. Reset to 100 percent`}
        onClick={onReset}
        className="w-16 tabular-nums"
      >
        {Math.round(zoom * 100)}%
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Zoom in"
        disabled={zoom >= MAX_ZOOM}
        onClick={onZoomIn}
      >
        <Plus />
      </Button>
      <span aria-hidden="true" className="bg-border mx-1 h-5 w-px" />
      <Button variant="ghost" onClick={onFit}>
        <Maximize data-icon="inline-start" />
        Fit
      </Button>
    </div>
  );
}
