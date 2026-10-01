import { useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { postJson } from "~/lib/settings/client";

import { ConfirmDialog, SectionCard } from "./section";

const LABELS: Record<string, string> = { email: "Email and password", github: "GitHub" };
const label = (p: string) => LABELS[p] ?? p.charAt(0).toUpperCase() + p.slice(1);

export function ConnectedAccounts({ identities, onChanged }: { identities: { id: string; provider: string }[]; onChanged: () => void }) {
  const [target, setTarget] = useState<{ id: string; provider: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasGithub = identities.some((i) => i.provider === "github");
  const onlyOne = identities.length < 2;

  async function connectGithub() {
    setConnecting(true);
    const result = await postJson("/api/settings/account", { intent: "link-github" });
    if (result.ok && typeof result.url === "string") return void window.location.assign(result.url);
    setConnecting(false);
    toast.error(result.message ?? "We couldn't connect GitHub. Try again.");
  }

  async function disconnect() {
    if (!target) return;
    setPending(true);
    setError(null);
    const result = await postJson("/api/settings/account", { intent: "unlink", identityId: target.id });
    setPending(false);
    if (!result.ok) return setError(result.message ?? "We couldn't disconnect that account. Try again.");
    toast.success(`${label(target.provider)} disconnected`);
    setTarget(null);
    onChanged();
  }

  return (
    <>
      <SectionCard id="connected" title="Connected accounts" description="The ways you can sign in to Teressa.">
        <ul className="divide-y">
          {identities.map((i) => (
            <li key={i.id} className="flex min-h-11 flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
              <span className="grid">
                <span className="text-sm font-medium">{label(i.provider)}</span>
                <span className="text-muted-foreground text-sm">Connected</span>
              </span>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={onlyOne}
                aria-describedby={onlyOne ? "unlink-reason" : undefined}
                onClick={() => setTarget(i)}
              >
                Disconnect
              </Button>
            </li>
          ))}
        </ul>
        {onlyOne && (
          <p id="unlink-reason" className="text-muted-foreground text-sm">
            This is your only way to sign in, so it can&apos;t be disconnected. Connect another one first.
          </p>
        )}
        {!hasGithub && (
          <div>
            <Button type="button" variant="outline" className="min-h-11" disabled={connecting} onClick={() => void connectGithub()}>
              {connecting ? "Connecting…" : "Connect GitHub"}
            </Button>
          </div>
        )}
      </SectionCard>

      <ConfirmDialog
        open={!!target}
        onOpenChange={(o) => !o && setTarget(null)}
        title={`Disconnect ${target ? label(target.provider) : ""}?`}
        description="You won't be able to sign in with it any more. You can connect it again later."
        confirmLabel="Disconnect"
        destructive
        pending={pending}
        error={error}
        onConfirm={() => void disconnect()}
      />
    </>
  );
}
