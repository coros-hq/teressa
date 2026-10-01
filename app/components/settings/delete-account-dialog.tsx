import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { postJson } from "~/lib/settings/client";
import { confirmationMatches, confirmationTarget } from "~/lib/settings/validation";

import { cn } from "~/lib/utils";

import { DESTRUCTIVE_SOLID, useReturnFocus } from "./section";

type Choice = "keep" | "delete";

// The danger zone: a clearly separate block at the bottom of Account. Deleting needs the username
// typed in (checked again on the server), and the person decides what happens to what they published.
export function DeleteAccountZone({ username }: { username: string | null }) {
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<Choice>("keep");
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const target = confirmationTarget(username);
  const ready = confirmationMatches(typed, username);
  const returnFocus = useReturnFocus(open);

  async function remove() {
    setPending(true);
    setError(null);
    const result = await postJson("/api/settings/delete-account", { confirmation: typed, keepPublished: choice === "keep" });
    if (result.ok) return void window.location.assign(typeof result.redirectTo === "string" ? result.redirectTo : "/");
    setPending(false);
    setError(result.message ?? "Something went wrong. Try again.");
  }

  return (
    <section aria-labelledby="danger-title" className="border-destructive/40 rounded-xl border p-4">
      <h2 id="danger-title" className="text-destructive text-base font-semibold">
        Delete account
      </h2>
      <p className="text-muted-foreground mt-1 text-sm">
        Permanently delete your account and the data tied to it. This can&apos;t be undone.
      </p>
      <Button type="button" variant="destructive" className={cn("mt-4 min-h-11", DESTRUCTIVE_SOLID)} onClick={() => setOpen(true)}>
        Delete account…
      </Button>

      <Dialog
        open={open}
        onOpenChange={(o) => {
          if (pending) return;
          setOpen(o);
          if (!o) {
            setTyped("");
            setError(null);
          }
        }}
      >
        <DialogContent className="max-h-[90svh] overflow-y-auto" {...returnFocus}>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently deletes your profile, your drafts, your comments and your email preferences, and removes your
              avatar. You&apos;ll be signed out. It can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>

          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">What should happen to the components you published?</legend>
            <RadioGroup value={choice} onValueChange={(v) => setChoice(v as Choice)} aria-label="Published components">
              <Label htmlFor="del-keep" className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal">
                <RadioGroupItem value="keep" id="del-keep" className="mt-0.5" />
                <span className="grid gap-0.5">
                  <span className="text-sm font-medium">Keep them as &quot;Deleted user&quot;</span>
                  <span className="text-muted-foreground text-sm">
                    They stay online and keep working for anyone who installed or linked to them. Nobody can edit them.
                  </span>
                </span>
              </Label>
              <Label htmlFor="del-delete" className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal">
                <RadioGroupItem value="delete" id="del-delete" className="mt-0.5" />
                <span className="grid gap-0.5">
                  <span className="text-sm font-medium">Delete them too</span>
                  <span className="text-muted-foreground text-sm">
                    They&apos;re removed, along with their comments. Links and install commands stop working. Copies people
                    already made are unaffected.
                  </span>
                </span>
              </Label>
            </RadioGroup>
          </fieldset>

          <Field>
            <FieldLabel htmlFor="del-confirm">
              Type <span className="font-mono font-semibold">{target}</span> to confirm
            </FieldLabel>
            <Input id="del-confirm" value={typed} autoComplete="off" autoCapitalize="none" spellCheck={false} onChange={(e) => setTyped(e.target.value)} />
          </Field>

          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" className={cn("min-h-11", DESTRUCTIVE_SOLID)} disabled={!ready || pending} onClick={() => void remove()}>
              {pending ? "Deleting…" : error ? "Try again" : "Delete my account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
