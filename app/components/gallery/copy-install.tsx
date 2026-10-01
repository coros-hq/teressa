import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "~/components/ui/button";

// Copies the command that adds a component to a project. The page has no component pages yet, so
// this is how someone takes one away from the gallery.
export function CopyInstall({ command, name, onCopy }: { command: string; name: string; onCopy?: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        aria-label={`Copy the install command for ${name}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(command);
            setCopied(true);
            onCopy?.();
            setTimeout(() => setCopied(false), 2000);
          } catch {}
        }}
      >
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        {copied ? "Copied" : "Copy install command"}
      </Button>
      <span role="status" className="sr-only">
        {copied ? `Install command for ${name} copied` : ""}
      </span>
    </>
  );
}
