import { X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { cn } from "~/lib/utils";

import {
  loadSavedColors,
  parseHex,
  storeSavedColors,
  toColorValue,
  type Rgba,
} from "./color-utils";

export type ColorToken = { id: string; label: string; css: string };

const CHECKER =
  "conic-gradient(color-mix(in srgb, var(--foreground) 12%, transparent) 25%, transparent 0 50%, color-mix(in srgb, var(--foreground) 12%, transparent) 0 75%, transparent 0) 0 0 / 8px 8px";

export function Swatch({ color, className }: { color: string; className?: string }) {
  // A checkerboard shows through so transparent colors are visible.
  return (
    <span
      aria-hidden="true"
      className={cn("relative inline-block size-5 shrink-0 overflow-hidden rounded-md ring-1 ring-foreground/20", className)}
      style={{ background: CHECKER }}
    >
      <span className="absolute inset-0" style={{ background: color }} />
    </span>
  );
}

// The color picker: theme colors, the user's own color (picker, hex code, opacity), and saved colors.
// It knows nothing about what is being colored; callers say what a choice means.
export function ColorPopover({
  id,
  label,
  disabled,
  tokens,
  activeTokenId,
  custom,
  noneLabel = "Default",
  onToken,
  onCustom,
}: {
  id: string;
  label: string;
  disabled?: boolean;
  tokens: ColorToken[];
  /** Which theme color is in use, if any. */
  activeTokenId: string | null;
  /** The user's own color, if one is in use. */
  custom: Rgba | null;
  noneLabel?: string;
  /** null clears the color. */
  onToken: (id: string | null) => void;
  /** A color as "#rrggbb", or "#rrggbbaa" with transparency. */
  onCustom: (value: string) => void;
}) {
  const token = tokens.find((t) => t.id === activeTokenId);
  const currentValue = custom ? toColorValue(custom) : null;

  // Hex and opacity are typed freely, and only applied once they are a valid color.
  const [hexDraft, setHexDraft] = useState(custom?.hex ?? "#000000");
  const [alphaDraft, setAlphaDraft] = useState(String(custom?.alpha ?? 100));
  useEffect(() => {
    if (custom) {
      setHexDraft(custom.hex);
      setAlphaDraft(String(custom.alpha));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentValue]);

  const commit = (hexText: string, alphaText: string) => {
    const parsed = parseHex(hexText);
    const alpha = Number(alphaText);
    if (!parsed || !Number.isFinite(alpha) || alphaText.trim() === "") return;
    onCustom(toColorValue({ hex: parsed.hex, alpha: Math.min(100, Math.max(0, alpha)) }));
  };

  const [saved, setSaved] = useState<string[]>([]);
  useEffect(() => setSaved(loadSavedColors()), []);
  const updateSaved = (next: string[]) => {
    setSaved(next);
    storeSavedColors(next);
  };

  const shown = currentValue ?? token?.css;

  return (
    <div className="grid grid-cols-[5.5rem_1fr] items-center gap-2">
      <Label htmlFor={id} className="text-muted-foreground text-sm font-normal">
        {label}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button id={id} variant="outline" disabled={disabled} className="h-9 w-full justify-start gap-2 px-2.5 font-normal">
            <Swatch color={shown ?? "transparent"} />
            <span className="truncate">{currentValue ?? token?.label ?? noneLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="grid w-72 gap-4">
          <div className="grid gap-2">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Theme colors</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" aria-pressed={!activeTokenId && !custom} onClick={() => onToken(null)}>
                {noneLabel}
              </Button>
              {tokens.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  title={t.label}
                  aria-label={t.label}
                  aria-pressed={activeTokenId === t.id}
                  onClick={() => onToken(t.id)}
                  className={cn(
                    "focus-visible:ring-ring/50 rounded-md outline-none focus-visible:ring-3",
                    activeTokenId === t.id && "ring-ring ring-2 ring-offset-2 ring-offset-popover"
                  )}
                >
                  <Swatch color={t.css} className="size-7" />
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Your color</p>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Pick a color"
                value={parseHex(hexDraft)?.hex ?? "#000000"}
                onChange={(e) => {
                  setHexDraft(e.target.value);
                  commit(e.target.value, alphaDraft);
                }}
                className="border-input size-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
              />
              <div className="grid flex-1 gap-1">
                <Label htmlFor={`${id}-hex`} className="sr-only">
                  Hex code
                </Label>
                <Input
                  id={`${id}-hex`}
                  value={hexDraft}
                  spellCheck={false}
                  placeholder="#1a2b3c"
                  aria-invalid={!parseHex(hexDraft)}
                  className="h-9 font-mono"
                  onChange={(e) => {
                    setHexDraft(e.target.value);
                    commit(e.target.value, alphaDraft);
                  }}
                />
              </div>
              <div className="flex items-center gap-1">
                <Label htmlFor={`${id}-alpha`} className="sr-only">
                  Opacity percent
                </Label>
                <Input
                  id={`${id}-alpha`}
                  type="number"
                  min={0}
                  max={100}
                  value={alphaDraft}
                  className="h-9 w-16 px-2"
                  onChange={(e) => {
                    setAlphaDraft(e.target.value);
                    commit(hexDraft, e.target.value);
                  }}
                />
                <span aria-hidden="true" className="text-muted-foreground text-sm">
                  %
                </span>
              </div>
            </div>
            {!parseHex(hexDraft) && (
              <p role="alert" className="text-destructive text-xs">
                Enter a hex code like #1a2b3c.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">My colors</p>
              <Button
                variant="ghost"
                size="sm"
                disabled={!currentValue || saved.includes(currentValue)}
                onClick={() => currentValue && updateSaved([currentValue, ...saved])}
              >
                Save this color
              </Button>
            </div>
            {saved.length === 0 ? (
              <p className="text-muted-foreground text-xs">Colors you save show up here, ready to use anywhere.</p>
            ) : (
              <ul className="flex flex-wrap gap-2">
                {saved.map((c) => (
                  <li key={c} className="group relative">
                    <button
                      type="button"
                      title={c}
                      aria-label={`Use ${c}`}
                      aria-pressed={currentValue === c}
                      onClick={() => onCustom(c)}
                      className={cn(
                        "focus-visible:ring-ring/50 block rounded-md outline-none focus-visible:ring-3",
                        currentValue === c && "ring-ring ring-2 ring-offset-2 ring-offset-popover"
                      )}
                    >
                      <Swatch color={c} className="size-7" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${c} from My colors`}
                      onClick={() => updateSaved(saved.filter((x) => x !== c))}
                      className="bg-popover text-foreground focus-visible:ring-ring/50 absolute -top-1.5 -right-1.5 hidden size-4 place-items-center rounded-full border outline-none group-focus-within:grid group-hover:grid focus-visible:ring-2"
                    >
                      <X className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
