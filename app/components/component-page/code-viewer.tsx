import { Copy, Check } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "~/components/ui/button";
import { highlightLines } from "~/lib/highlight-code";
import { trackCopy } from "~/lib/copy-tracking";
import { normalizeImportAlias } from "~/lib/publish/dependencies";

export function CopyCode({ code, slug, name }: { code: string; slug: string; name: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="min-h-11"
        aria-label={`Copy the code of ${name}`}
        onClick={async () => {
          try {
            // The same text the install command would place in a project.
            await navigator.clipboard.writeText(normalizeImportAlias(code));
            setCopied(true);
            trackCopy(slug);
            setTimeout(() => setCopied(false), 2000);
          } catch {}
        }}
      >
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        {copied ? "Copied" : "Copy code"}
      </Button>
      <span role="status" className="sr-only">
        {copied ? `Code of ${name} copied` : ""}
      </span>
    </>
  );
}

// The code, with line numbers you can link to (#L12). Feedback can point at a line, and the line it
// points at is highlighted when you follow that link. The code is shown as plain text, never run.
export function CodeViewer({ code, slug, name }: { code: string; slug: string; name: string }) {
  const lines = useMemo(() => highlightLines(code.replace(/\n$/, "")), [code]);
  return (
    <section aria-labelledby="code-title" className="bg-card text-card-foreground ring-foreground/10 overflow-hidden rounded-xl ring-1">
      <div className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-b px-4 py-1">
        <h2 id="code-title" className="text-base font-semibold">
          Code
        </h2>
        <CopyCode code={code} slug={slug} name={name} />
      </div>
      <div className="max-h-[32rem] overflow-auto" role="region" aria-label={`Code of ${name}`} tabIndex={0}>
        <ol className="min-w-max py-3 font-mono text-[13px] leading-6">
          {lines.map((line, i) => (
            <li key={i} id={`L${i + 1}`} className="target:bg-secondary/15 grid grid-cols-[3.5rem_1fr] pr-4">
              <a href={`#L${i + 1}`} aria-label={`Line ${i + 1}`} className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 pr-3 text-right outline-none select-none focus-visible:ring-2">
                {i + 1}
              </a>
              <code className="whitespace-pre">
                {line.length ? line.map((tok, j) => <span key={j} className={tok.className}>{tok.text}</span>) : " "}
              </code>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
