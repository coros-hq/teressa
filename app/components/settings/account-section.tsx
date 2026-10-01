import { useState } from "react";
import { useRevalidator } from "react-router";

import { Button } from "~/components/ui/button";
import type { AccountInfo } from "~/lib/data/settings.server";

import { ConnectedAccounts } from "./connected-accounts";
import { DeleteAccountZone } from "./delete-account-dialog";
import { EmailChangeDialog } from "./email-change-dialog";
import { PasswordForm } from "./password-form";
import { Deferred, SectionCard } from "./section";
import { SessionsCard } from "./sessions-card";

type Info = { account: AccountInfo; username: string | null };

export function AccountSection({ info }: { info: Promise<Info> }) {
  return (
    <Deferred resolve={info} rows={2}>
      {(i) => <AccountCards info={i} />}
    </Deferred>
  );
}

function AccountCards({ info }: { info: Info }) {
  const { account } = info;
  const revalidator = useRevalidator();
  const refresh = () => revalidator.revalidate();
  const [emailOpen, setEmailOpen] = useState(false);

  return (
    <>
      <SectionCard
        id="email"
        title="Email"
        description="The address you sign in with, and where we send account emails."
        footer={
          <Button type="button" variant="outline" className="min-h-11" onClick={() => setEmailOpen(true)}>
            Change email
          </Button>
        }
      >
        <p className="text-sm font-medium break-all">{account.email}</p>
        {account.pendingEmail && (
          <p role="status" className="bg-muted rounded-lg p-3 text-sm">
            <span className="font-medium">Waiting for confirmation.</span> We sent a link to{" "}
            <span className="break-all">{account.pendingEmail}</span>. Your email changes after you open it.
          </p>
        )}
      </SectionCard>
      <EmailChangeDialog open={emailOpen} onOpenChange={setEmailOpen} currentEmail={account.email} onSent={refresh} />

      <PasswordForm hasPassword={account.hasPassword} onChanged={refresh} />
      <ConnectedAccounts identities={account.identities} onChanged={refresh} />
      <SessionsCard />
      <DeleteAccountZone username={info.username} />
    </>
  );
}
