import { Suspense, useEffect, useRef } from "react";
import { Await, useRevalidator } from "react-router";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";

// The design system's "destructive" button is pale red text on a pale red background, which is too
// faint to read comfortably (about 3.8:1). For irreversible actions we use a solid version that
// meets AA in both themes: white on the red in light mode, the page's dark color on the lighter red in dark mode.
// The "!" makes these win over the variant's own (pale) colors, including its dark-mode ones.
export const DESTRUCTIVE_SOLID =
  "bg-destructive! text-white! hover:bg-destructive/90! dark:bg-destructive! dark:text-background! dark:hover:bg-destructive/90!";

/**
 * Dialogs here are opened by ordinary buttons, so the dialog itself doesn't know which one. This
 * remembers what had focus when it opened and puts focus back there when it closes.
 */
export function useReturnFocus(open: boolean) {
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (open) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, [open]);
  return {
    onCloseAutoFocus: (e: Event) => {
      e.preventDefault();
      opener.current?.focus();
    },
  };
}

/** A settings card: title (the section's h2), a short description, the fields, and a footer for actions. */
export function SectionCard({
  id,
  title,
  description,
  children,
  footer,
  className,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className} role="group" aria-labelledby={`${id}-title`}>
      <CardHeader>
        <CardTitle>
          <h2 id={`${id}-title`} className="text-base font-semibold">
            {title}
          </h2>
        </CardTitle>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </CardHeader>
      <CardContent className="grid gap-5">{children}</CardContent>
      {footer && <CardFooter className="justify-end gap-2">{footer}</CardFooter>}
    </Card>
  );
}

// Same frame as a real card, so nothing moves when the data arrives.
export function SectionSkeleton({ rows }: { rows: number }) {
  return (
    <Card aria-hidden="true">
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </CardHeader>
      <CardContent className="grid gap-5">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="grid gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
      </CardContent>
      <CardFooter className="justify-end">
        <Skeleton className="h-10 w-24" />
      </CardFooter>
    </Card>
  );
}

export function SectionError() {
  const revalidator = useRevalidator();
  const busy = revalidator.state !== "idle";
  return (
    <Card role="alert">
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">We couldn&apos;t load this section.</p>
        <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => revalidator.revalidate()}>
          {busy ? "Trying…" : "Try again"}
        </Button>
      </CardContent>
    </Card>
  );
}

/** Shows a skeleton while a section's data loads, and an inline error with "Try again" if it can't. */
export function Deferred<T>({ resolve, rows, children }: { resolve: Promise<T>; rows: number; children: (value: T) => React.ReactNode }) {
  return (
    <Suspense fallback={<SectionSkeleton rows={rows} />}>
      <Await resolve={resolve} errorElement={<SectionError />}>
        {children}
      </Await>
    </Suspense>
  );
}

/** Asks before doing something that can't easily be undone. Focus stays inside, and returns on close. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  pending = false,
  error,
  destructive = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  pending?: boolean;
  error?: string | null;
  destructive?: boolean;
}) {
  const returnFocus = useReturnFocus(open);
  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent {...returnFocus}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <DialogFooter className={cn("gap-2")}>
          <Button variant="outline" className="min-h-11" disabled={pending} onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? "destructive" : "default"} className={cn("min-h-11", destructive && DESTRUCTIVE_SOLID)} disabled={pending} onClick={onConfirm}>
            {pending ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
