import { useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { postJson } from "~/lib/settings/client";
import { useReturnFocus } from "./section";
import { validateEmailAddress } from "~/lib/settings/validation";

export function EmailChangeDialog({
  open,
  onOpenChange,
  currentEmail,
  onSent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentEmail: string;
  onSent: () => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const returnFocus = useReturnFocus(open);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const problem = validateEmailAddress(email);
    if (problem) return setError(problem);
    setPending(true);
    setError(null);
    const result = await postJson("/api/settings/account", { intent: "change-email", email });
    setPending(false);
    if (!result.ok) return setError(result.fieldErrors?.email ?? result.message ?? "Something went wrong. Try again.");
    toast.success("Check your inbox for a confirmation link");
    setEmail("");
    onOpenChange(false);
    onSent();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent {...returnFocus}>
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Change your email</DialogTitle>
            <DialogDescription>
              We&apos;ll send a confirmation link. Your email only changes after you open it, and until then you keep
              signing in with {currentEmail}.
            </DialogDescription>
          </DialogHeader>
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="new-email">New email address</FieldLabel>
            <Input
              id="new-email"
              type="email"
              autoComplete="email"
              value={email}
              required
              aria-required="true"
              aria-invalid={!!error}
              aria-describedby={error ? "new-email-error" : undefined}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
            />
            {error && <FieldError id="new-email-error">{error}</FieldError>}
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" className="min-h-11" disabled={pending} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="min-h-11" disabled={pending || !email.trim()}>
              {pending ? "Sending…" : "Send confirmation link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
