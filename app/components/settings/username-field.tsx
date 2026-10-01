import { Check, CircleAlert, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Field, FieldDescription, FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { HAS_PUBLIC_PROFILE, publicProfilePath } from "~/lib/paths";
import { validateUsername } from "~/lib/settings/validation";

export type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "reserved" | "error";

/** Checks a username as it's typed: rules first (instant), then availability after a 400ms pause. */
export function useUsernameCheck(value: string, savedValue: string) {
  const [status, setStatus] = useState<{ state: UsernameStatus; message: string }>({ state: "idle", message: "" });
  const latest = useRef(0);

  useEffect(() => {
    const u = value.trim();
    const request = ++latest.current;
    if (u === savedValue.trim()) return setStatus({ state: "idle", message: "" });
    const problem = validateUsername(u);
    if (problem) return setStatus({ state: /isn't available/.test(problem) ? "reserved" : "invalid", message: problem });

    setStatus({ state: "checking", message: "Checking…" });
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/settings/username?u=${encodeURIComponent(u)}`);
        const json = (await res.json()) as { state?: UsernameStatus; message?: string };
        if (request !== latest.current) return; // an older answer, ignored
        if (!res.ok || !json.state) return setStatus({ state: "error", message: "Couldn't check that right now. You can still try saving." });
        setStatus({ state: json.state, message: json.message ?? "" });
      } catch {
        if (request === latest.current) setStatus({ state: "error", message: "Couldn't check that right now. You can still try saving." });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [value, savedValue]);

  return status;
}

export function UsernameField({
  id,
  value,
  onChange,
  status,
  error,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  status: { state: UsernameStatus; message: string };
  /** An error from saving (for example, taken at the last moment). */
  error?: string;
}) {
  const bad = status.state === "taken" || status.state === "invalid" || status.state === "reserved";
  const shownError = error ?? (bad ? status.message : undefined);
  const live = shownError ? undefined : status.state === "available" || status.state === "checking" || status.state === "error";
  const username = value.trim();

  return (
    <Field data-invalid={!!shownError}>
      <FieldLabel htmlFor={id}>Username</FieldLabel>
      <Input
        id={id}
        value={value}
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        required
        aria-required="true"
        aria-invalid={!!shownError}
        aria-describedby={`${id}-help ${id}-status`}
        onChange={(e) => onChange(e.target.value)}
      />
      <FieldDescription id={`${id}-help`}>
        3 to 30 characters: lowercase letters, numbers, hyphens and underscores. Start with a letter.
      </FieldDescription>
      {/* Announced politely as the answer changes. Errors use the alert below instead. */}
      <p id={`${id}-status`} role="status" aria-live="polite" className="flex min-h-5 items-center gap-1.5 text-sm">
        {live && status.state === "checking" && <LoaderCircle aria-hidden className="size-4 animate-spin motion-reduce:animate-none" />}
        {live && status.state === "available" && <Check aria-hidden className="size-4" />}
        {live && status.message}
      </p>
      {shownError && (
        <FieldError id={`${id}-error`} className="flex items-center gap-1.5">
          <CircleAlert aria-hidden className="size-4 shrink-0" />
          {shownError}
        </FieldError>
      )}
      {username && !validateUsername(username) && (
        <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-sm">
          <span>
            Your public page: <span className="text-foreground font-medium break-all">{publicProfilePath(username)}</span>
          </span>
          {!HAS_PUBLIC_PROFILE && <span className="bg-muted rounded-md px-1.5 py-0.5 text-xs">Coming soon</span>}
        </p>
      )}
    </Field>
  );
}
