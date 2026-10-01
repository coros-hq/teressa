import { useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { postJson } from "~/lib/settings/client";

import { ConfirmDialog, SectionCard } from "./section";

export function SessionsCard() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOutOthers() {
    setPending(true);
    setError(null);
    const result = await postJson("/api/settings/account", { intent: "sign-out-others" });
    setPending(false);
    if (!result.ok) return setError(result.message ?? "We couldn't sign out your other devices. Try again.");
    toast.success("Signed out of your other devices");
    setOpen(false);
  }

  return (
    <>
      <SectionCard id="sessions" title="Sessions" description="If you signed in on a device you no longer use, you can sign it out. You stay signed in here.">
        <div>
          <Button type="button" variant="outline" className="min-h-11" onClick={() => setOpen(true)}>
            Sign out of all other devices
          </Button>
        </div>
      </SectionCard>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Sign out of all other devices?"
        description="Every other browser and device will be signed out and will need your password or GitHub to sign in again. This one stays signed in."
        confirmLabel="Sign them out"
        pending={pending}
        error={error}
        onConfirm={() => void signOutOthers()}
      />
    </>
  );
}
