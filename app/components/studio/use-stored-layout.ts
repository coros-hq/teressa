import type { Layout } from "react-resizable-panels";

const KEY = "studio-layout-v1";
const PANELS = ["left", "center", "right"];

// Panel sizes are remembered in this browser. Storage can be unavailable (private windows, blocked
// site data), so every access is wrapped and the layout simply falls back to its defaults.
export function readStoredLayout(): Layout | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      PANELS.every((id) => typeof (parsed as Record<string, unknown>)[id] === "number")
    ) {
      return parsed as Layout;
    }
  } catch {}
  return undefined;
}

export function writeStoredLayout(layout: Layout) {
  try {
    localStorage.setItem(KEY, JSON.stringify(layout));
  } catch {}
}
