import { useCallback, useState } from "react";

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;

export type View = { zoom: number; x: number; y: number };

const clamp = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

// Zoom and pan for the canvas. `x`/`y` place the world origin on screen; content is drawn with
// translate(x, y) scale(zoom). Zooming keeps the point under the cursor fixed.
export function useCanvasTransform() {
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 });

  const zoomAt = useCallback((cx: number, cy: number, to: number | ((z: number) => number)) => {
    setView((v) => {
      const zoom = clamp(typeof to === "function" ? to(v.zoom) : to);
      const k = zoom / v.zoom;
      return { zoom, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
    });
  }, []);

  const panBy = useCallback((dx: number, dy: number) => {
    setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  }, []);

  return { view, setView, zoomAt, panBy };
}
