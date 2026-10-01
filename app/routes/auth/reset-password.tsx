import { useState } from "react";
import { Form, Link, data, useNavigation } from "react-router";

import type { Route } from "./+types/reset-password";
import { getUser } from "~/lib/supabase/server";

import { AuthHeader } from "~/components/auth-header";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";

export function meta() {
  return [{ title: "Reset password" }];
}

// The emailed link signs the person in (see auth/confirm), so a session means a valid link.
export async function loader({ request }: Route.LoaderArgs) {
  const { user, headers } = await getUser(request);
  return data({ valid: !!user }, { headers });
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const { user, supabase, headers } = await getUser(request);
  if (!user) return data({ error: "This reset link has expired.", done: false }, { status: 401 });
  const { error } = await supabase.auth.updateUser({ password: String(form.get("password")) });
  if (error) return data({ error: error.message, done: false }, { status: 400, headers });
  return data({ error: null, done: true }, { headers });
}

export default function ResetPassword({ loaderData, actionData }: Route.ComponentProps) {
  const [mismatch, setMismatch] = useState<string>();
  const pending = useNavigation().state === "submitting";
  const error = mismatch ?? actionData?.error ?? undefined;
  const done = actionData?.done;

  if (!loaderData.valid && !done) {
    return (
      <>
        <AuthHeader
          title="Invalid reset link"
          description="This password reset link is missing or has expired. Request a new one to continue."
        />
        <Button asChild size="lg" className="w-full">
          <Link to="/forgot-password">Request a new link</Link>
        </Button>
      </>
    );
  }

  if (done) {
    return (
      <>
        <AuthHeader
          title="Password updated"
          description="Your password has been reset. You can now sign in with your new password."
        />
        <Button asChild size="lg" className="w-full">
          <Link to="/sign-in">Continue to sign in</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <AuthHeader
        title="Set a new password"
        description="Choose a strong password for your account."
      />
      <Form
        method="post"
        onSubmit={(e) => {
          const form = new FormData(e.currentTarget);
          if (form.get("password") !== form.get("confirmPassword")) {
            e.preventDefault();
            setMismatch("Passwords do not match.");
            return;
          }
          setMismatch(undefined);
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="password">New password</FieldLabel>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <FieldDescription>Must be at least 8 characters.</FieldDescription>
          </Field>
          <Field data-invalid={!!error}>
            <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!error}
              required
            />
            {error && <FieldError>{error}</FieldError>}
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Reset password"}
          </Button>
        </FieldGroup>
      </Form>
    </>
  );
}
