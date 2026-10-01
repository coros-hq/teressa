import { Form, Link, data, useNavigation } from "react-router";

import type { Route } from "./+types/forgot-password";
import { getUser } from "~/lib/supabase/server";

import { AuthHeader } from "~/components/auth-header";
import { Button } from "~/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";

export function meta() {
  return [{ title: "Forgot password" }];
}

export async function action({ request }: Route.ActionArgs) {
  const email = String((await request.formData()).get("email"));
  const { supabase } = await getUser(request);
  const origin = new URL(request.url).origin;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });
  // Don't reveal whether an account exists: only real failures (rate limits, outages) are shown.
  if (error) return data({ error: error.message, sentTo: null }, { status: 400 });
  return data({ error: null, sentTo: email });
}

export default function ForgotPassword({ actionData }: Route.ComponentProps) {
  const pending = useNavigation().state === "submitting";
  const sentTo = actionData?.sentTo;

  if (sentTo) {
    return (
      <>
        <AuthHeader
          title="Check your email"
          description={`If an account exists for ${sentTo}, we've sent a link to reset your password.`}
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
        title="Forgot your password?"
        description="Enter your email and we'll send you a link to reset it."
      />
      <Form method="post">
        <FieldGroup>
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
          {actionData?.error && <FieldError>{actionData.error}</FieldError>}
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Sending…" : "Send reset link"}
          </Button>
          <p className="text-muted-foreground text-center text-sm">
            Remembered it?{" "}
            <Link to="/sign-in" className="text-foreground underline">
              Back to sign in
            </Link>
          </p>
        </FieldGroup>
      </Form>
    </>
  );
}
