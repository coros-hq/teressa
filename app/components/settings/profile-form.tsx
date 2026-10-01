import { useEffect, useRef, useState } from "react";
import { useBlocker, useFetcher } from "react-router";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import type { Profile } from "~/lib/data/profile.server";
import {
  LIMITS, PROFILE_FIELDS, sameProfile, validateProfile, type ProfileErrors, type ProfileInput,
} from "~/lib/settings/validation";

import { AvatarUploader } from "./avatar-uploader";
import { ConfirmDialog, Deferred, SectionCard } from "./section";
import { UsernameField, useUsernameCheck } from "./username-field";

const toInput = (p: Profile): ProfileInput => ({
  displayName: p.displayName, username: p.username, bio: p.bio, website: p.website, githubUsername: p.githubUsername,
});
const fieldId = (name: string) => `settings-${name}`;

export function ProfileSection({ profile }: { profile: Promise<Profile> }) {
  return (
    <Deferred resolve={profile} rows={5}>
      {(p) => <ProfileForm profile={p} />}
    </Deferred>
  );
}

type SaveReply = { ok: boolean; fieldErrors?: ProfileErrors; message?: string };

export function ProfileForm({ profile }: { profile: Profile }) {
  const [values, setValues] = useState<ProfileInput>(toInput(profile));
  // What is saved. It moves forward the moment you press Save (optimistic) and goes back if that fails.
  const [saved, setSaved] = useState<ProfileInput>(toInput(profile));
  const [errors, setErrors] = useState<ProfileErrors>({});
  const fetcher = useFetcher<SaveReply>();
  const attempt = useRef<{ previous: ProfileInput } | null>(null);

  const dirty = !sameProfile(values, saved);
  const submitting = fetcher.state !== "idle";
  const username = useUsernameCheck(values.username, saved.username);
  const usernameBlocks =
    values.username.trim() !== saved.username.trim() && ["checking", "taken", "invalid", "reserved"].includes(username.state);

  const set = (key: keyof ProfileInput) => (v: string) => {
    setValues((all) => ({ ...all, [key]: v }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function save() {
    const found = validateProfile(values);
    setErrors(found);
    const first = PROFILE_FIELDS.find((f) => found[f]);
    if (first) return void document.getElementById(fieldId(first))?.focus();

    attempt.current = { previous: saved };
    setSaved(values); // optimistic
    fetcher.submit(values, { method: "post", encType: "application/json" });
  }

  // The server's answer: confirm it, or put things back and show what went wrong. Typed text is never lost.
  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data || !attempt.current) return;
    const { previous } = attempt.current;
    attempt.current = null;
    if (fetcher.data.ok) {
      toast.success("Profile saved");
      return;
    }
    setSaved(previous);
    const fieldErrors = fetcher.data.fieldErrors ?? {};
    setErrors(fieldErrors);
    const first = PROFILE_FIELDS.find((f) => fieldErrors[f]);
    if (first) document.getElementById(fieldId(first))?.focus();
    else toast.error(fetcher.data.message ?? "Couldn't save. Try again.", { action: { label: "Try again", onClick: save } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetcher.state, fetcher.data]);

  // Warn before leaving with unsaved changes, inside the app and when closing the tab.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [dirty]);

  const err = (k: keyof ProfileInput) => errors[k];
  const described = (k: keyof ProfileInput, extra?: string) => [err(k) ? `${fieldId(k)}-error` : null, extra].filter(Boolean).join(" ") || undefined;

  return (
    <>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (dirty && !submitting && !usernameBlocks) save();
        }}
      >
        <SectionCard
          id="profile"
          title="Profile"
          description="This is what other people see on your components and comments."
          footer={
            <>
              {dirty && (
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-11"
                  onClick={() => {
                    setValues(saved);
                    setErrors({});
                  }}
                >
                  Discard changes
                </Button>
              )}
              <Button type="submit" className="min-h-11" disabled={!dirty || submitting || usernameBlocks}>
                {submitting ? "Saving…" : "Save changes"}
              </Button>
            </>
          }
        >
          <AvatarUploader initialUrl={profile.avatarUrl} name={values.displayName} />

          <Field data-invalid={!!err("displayName")}>
            <FieldLabel htmlFor={fieldId("displayName")}>Display name</FieldLabel>
            <Input
              id={fieldId("displayName")}
              value={values.displayName}
              autoComplete="name"
              required
              aria-required="true"
              aria-invalid={!!err("displayName")}
              aria-describedby={described("displayName")}
              onChange={(e) => set("displayName")(e.target.value)}
            />
            {err("displayName") && <FieldError id={`${fieldId("displayName")}-error`}>{err("displayName")}</FieldError>}
          </Field>

          <UsernameField
            id={fieldId("username")}
            value={values.username}
            onChange={set("username")}
            status={username}
            error={err("username")}
          />

          <Field data-invalid={!!err("bio")}>
            <FieldLabel htmlFor={fieldId("bio")}>Bio (optional)</FieldLabel>
            <Textarea
              id={fieldId("bio")}
              value={values.bio}
              rows={3}
              aria-invalid={!!err("bio")}
              aria-describedby={described("bio", `${fieldId("bio")}-count`)}
              onChange={(e) => set("bio")(e.target.value)}
            />
            <FieldDescription id={`${fieldId("bio")}-count`} className={values.bio.length > LIMITS.bio ? "text-destructive" : undefined}>
              {values.bio.length}/{LIMITS.bio} characters
            </FieldDescription>
            {err("bio") && <FieldError id={`${fieldId("bio")}-error`}>{err("bio")}</FieldError>}
          </Field>

          <Field data-invalid={!!err("website")}>
            <FieldLabel htmlFor={fieldId("website")}>Website (optional)</FieldLabel>
            <Input
              id={fieldId("website")}
              value={values.website}
              inputMode="url"
              autoComplete="url"
              placeholder="https://example.com"
              aria-invalid={!!err("website")}
              aria-describedby={described("website")}
              onChange={(e) => set("website")(e.target.value)}
            />
            {err("website") && <FieldError id={`${fieldId("website")}-error`}>{err("website")}</FieldError>}
          </Field>

          <Field data-invalid={!!err("githubUsername")}>
            <FieldLabel htmlFor={fieldId("githubUsername")}>GitHub username (optional)</FieldLabel>
            <Input
              id={fieldId("githubUsername")}
              value={values.githubUsername}
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={!!err("githubUsername")}
              aria-describedby={described("githubUsername")}
              onChange={(e) => set("githubUsername")(e.target.value)}
            />
            {err("githubUsername") && <FieldError id={`${fieldId("githubUsername")}-error`}>{err("githubUsername")}</FieldError>}
          </Field>
        </SectionCard>
      </form>

      <ConfirmDialog
        open={blocker.state === "blocked"}
        onOpenChange={(open) => !open && blocker.reset?.()}
        title="Leave without saving?"
        description="You have changes that haven't been saved. If you leave now, they'll be lost."
        confirmLabel="Leave"
        cancelLabel="Stay"
        destructive
        onConfirm={() => blocker.proceed?.()}
      />
    </>
  );
}
