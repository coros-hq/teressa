import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { Button } from "~/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/components/ui/dialog";

export type PublishedInfo = {
  slug: string;
  version: number;
  publicUrl: string;
  registryUrl: string;
  installCommand: string;
};

function CopyChip({ label, value, note }: { label: string; value: string; note?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-1.5">
      <p className="text-sm font-medium">
        {label}
        {note && <span className="bg-muted text-muted-foreground ml-2 rounded-md px-1.5 py-0.5 text-xs font-normal">{note}</span>}
      </p>
      <Button
        type="button"
        variant="outline"
        className="h-auto justify-between gap-3 py-2 text-left font-mono text-xs font-normal whitespace-normal"
        aria-label={`Copy ${label.toLowerCase()}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {}
        }}
      >
        <span className="min-w-0 break-all">{value}</span>
        {copied ? <Check /> : <Copy />}
      </Button>
      <span role="status" className="sr-only">
        {copied ? `${label} copied` : ""}
      </span>
    </div>
  );
}

export function PublishedDialog({ info, onClose }: { info: PublishedInfo | null; onClose: () => void }) {
  return (
    <Dialog open={!!info} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Published as version {info?.version}</DialogTitle>
          <DialogDescription>Your component is live. Share the link or install it with the command below.</DialogDescription>
        </DialogHeader>
        {info && (
          <div className="grid gap-4">
            <CopyChip label="Public page" value={info.publicUrl} />
            <CopyChip label="Install command" value={info.installCommand} />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Keep editing
          </Button>
          <Button asChild>
            <Link to="/overview">Back to dashboard</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
