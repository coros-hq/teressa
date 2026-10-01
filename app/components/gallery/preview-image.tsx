import { ImageOff } from "lucide-react";

import { cn } from "~/lib/utils";

// The preview picture of a component: one for light mode, one for dark, picked by the page's theme.
// Both have the same fixed size, so nothing jumps as they load, and the one not showing isn't downloaded.
export function PreviewImage({
  light,
  dark,
  name,
  className,
  eager = false,
}: {
  light: string | null;
  dark: string | null;
  name: string;
  className?: string;
  /** For the main picture on a page: load it right away instead of waiting until it scrolls into view. */
  eager?: boolean;
}) {
  if (!light && !dark) {
    return (
      <div className={cn("bg-muted text-muted-foreground grid aspect-[8/5] w-full place-items-center text-sm", className)}>
        <span className="flex items-center gap-2">
          <ImageOff aria-hidden className="size-4" />
          No preview yet
        </span>
      </div>
    );
  }
  const l = light ?? dark!;
  const d = dark ?? light!;
  const common = { alt: `Preview of ${name}`, width: 800, height: 500, decoding: "async" as const, loading: eager ? ("eager" as const) : ("lazy" as const) };
  return (
    <>
      <img src={l} {...common} className={cn("aspect-[8/5] w-full object-cover dark:hidden", className)} />
      <img src={d} {...common} className={cn("hidden aspect-[8/5] w-full object-cover dark:block", className)} />
    </>
  );
}
