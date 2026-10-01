// Custom colors are stored in the code as Tailwind arbitrary values, like `bg-[#1a2b3c]` or, with
// transparency, `bg-[#1a2b3c80]`.

export type Rgba = { hex: string; alpha: number }; // hex is "#rrggbb", alpha is 0-100

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Accepts "abc", "#abc", "#aabbcc" or "#aabbccdd". Returns the color, or null if it isn't valid. */
export function parseHex(input: string): Rgba | null {
  const m = HEX.exec(input.trim());
  if (!m) return null;
  let h = m[1].toLowerCase();
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const alpha = h.length === 8 ? Math.round((parseInt(h.slice(6), 16) / 255) * 100) : 100;
  return { hex: `#${h.slice(0, 6)}`, alpha };
}

/** "#rrggbb" plus an opacity from 0 to 100, written the way Tailwind reads it. */
export function toColorValue({ hex, alpha }: Rgba): string {
  if (alpha >= 100) return hex;
  const a = Math.round((Math.min(100, Math.max(0, alpha)) / 100) * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}

/** Reads `text-[#ff0000]` (for prefix "text") back into a color. */
export function readArbitrary(cls: string | null, prefix: string): Rgba | null {
  if (!cls) return null;
  const m = new RegExp(`^${prefix}-\\[(#[0-9a-fA-F]{3,8})\\]$`).exec(cls);
  return m ? parseHex(m[1]) : null;
}

// ---- "My colors": the user's saved colors, remembered in this browser -----------------------
const KEY = "studio-colors-v1";
const MAX = 24;

export function loadSavedColors(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === "string" && !!parseHex(c)) : [];
  } catch {
    return [];
  }
}

export function storeSavedColors(colors: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(colors.slice(0, MAX)));
  } catch {}
}
