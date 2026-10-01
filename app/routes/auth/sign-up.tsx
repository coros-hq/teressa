import { useState } from "react";
import { Form, Link, data, redirect, useNavigation } from "react-router";

import type { Route } from "./+types/sign-up";
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
  return [{ title: "Create account" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user, headers } = await getUser(request);
  if (user) throw redirect("/overview", { headers });
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email"));
  const { supabase, headers } = await getUser(request);
  const { data: result, error } = await supabase.auth.signUp({
    email,
    password: String(form.get("password")),
    options: {
      data: { full_name: String(form.get("name")) },
      emailRedirectTo: `${new URL(request.url).origin}/auth/confirm`,
    },
  });
  if (error) return data({ error: error.message, sentTo: null }, { status: 400 });
  // With email confirmation on there is no session yet: ask them to check their inbox.
  if (!result.session) return data({ error: null, sentTo: email });
  return redirect("/overview", { headers });
}

export default function SignUp({ actionData }: Route.ComponentProps) {
  const [mismatch, setMismatch] = useState<string>();
  const pending = useNavigation().state === "submitting";
  const error = mismatch ?? actionData?.error ?? undefined;

  if (actionData?.sentTo) {
    return (
      <>
        <AuthHeader
          title="Check your email"
          description={`We've sent a confirmation link to ${actionData.sentTo}. Open it to finish creating your account.`}
        />
        <Button asChild variant="outline" size="lg" className="w-full">
          <Link to="/sign-in">Back to sign in</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <AuthHeader
        title="Create an account"
        description="Enter your details below to get started."
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
            <FieldLabel htmlFor="name">Full name</FieldLabel>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              placeholder="Jane Doe"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="password">Password</FieldLabel>
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
            {pending ? "Creating account…" : "Create account"}
          </Button>
          <p className="text-muted-foreground text-center text-sm">
            Already have an account?{" "}
            <Link to="/sign-in" className="text-foreground underline">
              Sign in
            </Link>
          </p>
        </FieldGroup>
      </Form>
    </>
  );
}
