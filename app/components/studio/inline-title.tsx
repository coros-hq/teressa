import { Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "~/lib/utils";

// Text you rename in place: click to edit, Enter to save, Escape to cancel.
export function InlineTitle({
  value,
  onChange,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  /** What is being named, for screen readers (for example "Project name"). */
  label: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) input.current?.select();
  }, [editing]);

  const save = () => {
    const next = draft.trim();
    if (next) onChange(next);
    else setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={input}
        value={draft}
        aria-label={label}
        maxLength={80}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="border-ring bg-background h-8 w-40 rounded-md border px-2 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-56"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      aria-label={`${label}: ${value}. Click to rename`}
      className={cn(
        "hover:bg-muted focus-visible:ring-ring/50 group flex h-8 max-w-40 items-center gap-1.5 rounded-md px-2 text-sm font-medium outline-none focus-visible:ring-3 sm:max-w-56",
        className
      )}
    >
      <span className="truncate">{value}</span>
      <Pencil className="text-muted-foreground size-3 shrink-0 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" />
    </button>
  );
}
