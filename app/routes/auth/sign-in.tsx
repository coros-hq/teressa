import { Form, Link, data, redirect, useNavigation } from "react-router";

import type { Route } from "./+types/sign-in";
import { safeNextPath } from "~/lib/safe-redirect";
import { getUser } from "~/lib/supabase/server";

import { AuthHeader } from "~/components/auth-header";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Separator } from "~/components/ui/separator";

export function meta() {
  return [{ title: "Sign in" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { user, headers } = await getUser(request);
  if (user)
    throw redirect(
      safeNextPath(new URL(request.url).searchParams.get("next")),
      { headers },
    );
  return {
    notice:
      new URL(request.url).searchParams.get("notice") === "confirm-failed",
  };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const { supabase, headers } = await getUser(request);
  const { error } = await supabase.auth.signInWithPassword({
    email: String(form.get("email")),
    password: String(form.get("password")),
  });
  if (error) return data({ error: error.message }, { status: 400 });
  // Back to the page they were on (for example a component they wanted to comment on), if there was one.
  return redirect(safeNextPath(new URL(request.url).searchParams.get("next")), {
    headers,
  });
}

export default function SignIn({
  actionData,
  loaderData,
}: Route.ComponentProps) {
  const pending = useNavigation().state === "submitting";
  const error = actionData?.error;
  return (
    <>
      <AuthHeader
        title="Welcome back"
        description="Enter your credentials to sign in to your account."
      />
      {loaderData?.notice && (
        <p
          role="status"
          className="bg-muted text-muted-foreground mb-4 rounded-md px-3 py-2 text-sm"
        >
          That confirmation link didn&apos;t work. It may have been used
          already, so try signing in. If that fails, create the account again.
        </p>
      )}
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
          <Field>
            <div className="flex items-center">
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Link
                to="/forgot-password"
                className="ml-auto text-sm underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          {error && <FieldError>{error}</FieldError>}
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-muted-foreground text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link to="/sign-up" className="text-foreground underline">
              Sign up
            </Link>
          </p>
          <Separator />
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link to="/explore">Explore</Link>
          </Button>
        </FieldGroup>
      </Form>
    </>
  );
}
