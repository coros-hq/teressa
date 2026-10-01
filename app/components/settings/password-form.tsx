import { useState } from "react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { postJson } from "~/lib/settings/client";
import { PASSWORD_MIN, validateNewPassword } from "~/lib/settings/validation";

import { SectionCard } from "./section";

type Errors = { current?: string; password?: string; confirm?: string; code?: string };

// People who sign in with email and a password change it here, and prove they know the current one.
// People who only signed in with GitHub can set one, which also lets them sign in with their email.
// If the sign-in system wants a recent sign-in first, we email a short code and ask for it.
export function PasswordForm({ hasPassword, onChanged }: { hasPassword: boolean; onChanged: () => void }) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const found: Errors = validateNewPassword(password, confirm);
    if (hasPassword && !current) found.current = "Enter your current password.";
    if (needsCode && !code.trim()) found.code = "Enter the code from your email.";
    setErrors(found);
    setFormError(null);
    const first = (["current", "password", "confirm", "code"] as const).find((k) => found[k]);
    if (first) return void document.getElementById(`pw-${first}`)?.focus();

    setPending(true);
    const result = await postJson("/api/settings/account", { intent: "change-password", current, password, confirm, nonce: needsCode ? code.trim() : undefined });
    setPending(false);

    if (result.ok) {
      toast.success(hasPassword ? "Password changed" : "Password set");
      setCurrent("");
      setPassword("");
      setConfirm("");
      setCode("");
      setNeedsCode(false);
      return onChanged();
    }
    if (result.needsReauth) {
      setNeedsCode(true);
      await postJson("/api/settings/account", { intent: "send-code" });
      return setFormError("For your security, we emailed you a code. Enter it below to finish.");
    }
    setErrors((result.fieldErrors as Errors) ?? {});
    if (!result.fieldErrors) setFormError(result.message ?? "Something went wrong. Try again.");
  }

  const d = (k: keyof Errors, extra?: string) => [errors[k] ? `pw-${k}-error` : null, extra].filter(Boolean).join(" ") || undefined;

  return (
    <form onSubmit={submit} noValidate>
      <SectionCard
        id="password"
        title={hasPassword ? "Change password" : "Set a password"}
        description={
          hasPassword
            ? "Use a password you don't use anywhere else."
            : "You sign in with GitHub. Setting a password lets you sign in with your email too."
        }
        footer={
          <Button type="submit" className="min-h-11" disabled={pending}>
            {pending ? "Saving…" : hasPassword ? "Change password" : "Set password"}
          </Button>
        }
      >
        {formError && (
          <p role="alert" className="text-sm font-medium">
            {formError}
          </p>
        )}
        {hasPassword && (
          <Field data-invalid={!!errors.current}>
            <FieldLabel htmlFor="pw-current">Current password</FieldLabel>
            <Input id="pw-current" type="password" autoComplete="current-password" value={current} aria-invalid={!!errors.current} aria-describedby={d("current")} onChange={(e) => setCurrent(e.target.value)} />
            {errors.current && <FieldError id="pw-current-error">{errors.current}</FieldError>}
          </Field>
        )}
        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="pw-password">New password</FieldLabel>
          <Input id="pw-password" type="password" autoComplete="new-password" value={password} aria-invalid={!!errors.password} aria-describedby={d("password", "pw-password-hint")} onChange={(e) => setPassword(e.target.value)} />
          <FieldDescription id="pw-password-hint">At least {PASSWORD_MIN} characters.</FieldDescription>
          {errors.password && <FieldError id="pw-password-error">{errors.password}</FieldError>}
        </Field>
        <Field data-invalid={!!errors.confirm}>
          <FieldLabel htmlFor="pw-confirm">Confirm new password</FieldLabel>
          <Input id="pw-confirm" type="password" autoComplete="new-password" value={confirm} aria-invalid={!!errors.confirm} aria-describedby={d("confirm")} onChange={(e) => setConfirm(e.target.value)} />
          {errors.confirm && <FieldError id="pw-confirm-error">{errors.confirm}</FieldError>}
        </Field>
        {needsCode && (
          <Field data-invalid={!!errors.code}>
            <FieldLabel htmlFor="pw-code">Code from your email</FieldLabel>
            <Input id="pw-code" inputMode="numeric" autoComplete="one-time-code" value={code} aria-invalid={!!errors.code} aria-describedby={d("code")} onChange={(e) => setCode(e.target.value)} />
            {errors.code && <FieldError id="pw-code-error">{errors.code}</FieldError>}
          </Field>
        )}
      </SectionCard>
    </form>
  );
}
