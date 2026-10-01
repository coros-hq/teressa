import { Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";

type Result = { ok: boolean; message?: string };

/** The trash button on a component's card, with a confirmation before anything is removed. */
export function DeleteComponent({ id, name, published }: { id: string; name: string; published: boolean }) {
  const fetcher = useFetcher<Result>();
  const [open, setOpen] = useState(false);
  const pending = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    if (fetcher.data.ok) {
      setOpen(false);
      toast.success(`Deleted “${name}”`);
    } else {
      toast.error(fetcher.data.message ?? "That component couldn't be deleted.");
    }
  }, [fetcher.state, fetcher.data, name]);

  return (
    <AlertDialog open={open} onOpenChange={(o) => (pending ? undefined : setOpen(o))}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive absolute top-1.5 right-1.5 size-11"
          aria-label={`Delete ${name}`}
        >
          <Trash2 aria-hidden />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {published
              ? "This removes it from the gallery for everyone, along with its versions and all the feedback on it. The install command will stop working for anyone using it. This can't be undone."
              : "This draft and its design will be permanently deleted. This can't be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11" disabled={pending}>
            Cancel
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            className="min-h-11 !bg-destructive !text-white hover:!bg-destructive/90"
            disabled={pending}
            onClick={() => fetcher.submit({ intent: "delete", id }, { method: "post" })}
          >
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
