import { useEffect, useRef, useState } from "react";
import { Link, useFetcher } from "react-router";

import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";
import { COMMENT_MAX, FEEDBACK_CATEGORIES, type FeedbackErrors } from "~/lib/data/discussion";

export type ActionReply = { ok: boolean; message?: string; fieldErrors?: FeedbackErrors };

/** For people who aren't signed in: reading is open to everyone, writing needs an account. */
export function SignInPrompt({ slug }: { slug: string }) {
  const next = encodeURIComponent(`/c/${slug}#feedback`);
  return (
    <div className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
      <p className="text-sm">Sign in to leave feedback or reply. You&apos;ll come straight back here.</p>
      <div className="flex gap-2">
        <Button asChild className="min-h-11">
          <Link to={`/sign-in?next=${next}`}>Sign in</Link>
        </Button>
        <Button asChild variant="outline" className="min-h-11">
          <Link to="/sign-up">Create an account</Link>
        </Button>
      </div>
    </div>
  );
}

/** Feedback for the person who made it: what it's about, an optional line of the code, and the message. */
export function FeedbackForm({ lineCount }: { lineCount: number }) {
  const fetcher = useFetcher<ActionReply>();
  const [category, setCategory] = useState("");
  const [body, setBody] = useState("");
  const [line, setLine] = useState("");
  const [posted, setPosted] = useState(false);
  const wasSubmitting = useRef(false);
  const errors = fetcher.data && !fetcher.data.ok ? (fetcher.data.fieldErrors ?? {}) : {};
  const generic = fetcher.data && !fetcher.data.ok && !fetcher.data.fieldErrors ? fetcher.data.message : null;
  const busy = fetcher.state !== "idle";

  // After a successful post the form empties (what was typed is kept if it failed).
  useEffect(() => {
    if (fetcher.state === "submitting") wasSubmitting.current = true;
    if (fetcher.state === "idle" && wasSubmitting.current && fetcher.data) {
      wasSubmitting.current = false;
      if (fetcher.data.ok) {
        setCategory("");
        setBody("");
        setLine("");
        setPosted(true);
      } else {
        const first = (["category", "body", "line"] as const).find((k) => fetcher.data?.fieldErrors?.[k]);
        if (first) document.getElementById(`fb-${first}`)?.focus();
      }
    }
  }, [fetcher.state, fetcher.data]);

  return (
    <fetcher.Form method="post" noValidate className="bg-card grid gap-4 rounded-xl border p-4" onSubmit={() => setPosted(false)}>
      <input type="hidden" name="intent" value="feedback" />
      <div className="grid gap-1">
        <h3 className="text-base font-semibold">Leave feedback</h3>
        <p className="text-muted-foreground text-sm">Be specific and kind. The person who made this will see it.</p>
      </div>

      <Field data-invalid={!!errors.category}>
        <FieldLabel htmlFor="fb-category">What is it about?</FieldLabel>
        <Select name="category" value={category || undefined} onValueChange={setCategory}>
          <SelectTrigger id="fb-category" size="lg" className="w-full sm:max-w-xs" aria-required="true" aria-invalid={!!errors.category} aria-describedby={errors.category ? "fb-category-error" : undefined}>
            <SelectValue placeholder="Choose one" />
          </SelectTrigger>
          <SelectContent>
            {FEEDBACK_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && <FieldError id="fb-category-error">{errors.category}</FieldError>}
      </Field>

      <Field data-invalid={!!errors.body}>
        <FieldLabel htmlFor="fb-body">Your feedback</FieldLabel>
        <Textarea
          id="fb-body"
          name="body"
          rows={4}
          value={body}
          aria-required="true"
          aria-invalid={!!errors.body}
          aria-describedby={`fb-count${errors.body ? " fb-body-error" : ""}`}
          onChange={(e) => setBody(e.target.value)}
        />
        <FieldDescription id="fb-count" className={body.trim().length > COMMENT_MAX ? "text-destructive" : undefined}>
          {body.trim().length.toLocaleString("en")}/{COMMENT_MAX.toLocaleString("en")} characters
        </FieldDescription>
        {errors.body && <FieldError id="fb-body-error">{errors.body}</FieldError>}
      </Field>

      <Field data-invalid={!!errors.line}>
        <FieldLabel htmlFor="fb-line">Line of the code (optional)</FieldLabel>
        <Input
          id="fb-line"
          name="line"
          inputMode="numeric"
          value={line}
          placeholder={lineCount ? `1 to ${lineCount}` : undefined}
          className="sm:max-w-[10rem]"
          aria-invalid={!!errors.line}
          aria-describedby={errors.line ? "fb-line-error" : undefined}
          onChange={(e) => setLine(e.target.value)}
        />
        {errors.line && <FieldError id="fb-line-error">{errors.line}</FieldError>}
      </Field>

      {generic && (
        <p role="alert" className="text-destructive text-sm">
          {generic}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="min-h-11" disabled={busy}>
          {busy ? "Posting…" : "Post feedback"}
        </Button>
        <p role="status" className="text-sm">
          {posted && "Posted. Thank you!"}
        </p>
      </div>
    </fetcher.Form>
  );
}

/** A short reply under a piece of feedback. */
export function ReplyForm({ parentId, onDone }: { parentId: string; onDone: () => void }) {
  const fetcher = useFetcher<ActionReply>();
  const [body, setBody] = useState("");
  const wasSubmitting = useRef(false);
  const error = fetcher.data && !fetcher.data.ok ? (fetcher.data.fieldErrors?.body ?? fetcher.data.message) : null;
  const busy = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "submitting") wasSubmitting.current = true;
    if (fetcher.state === "idle" && wasSubmitting.current && fetcher.data) {
      wasSubmitting.current = false;
      if (fetcher.data.ok) onDone();
    }
  }, [fetcher.state, fetcher.data, onDone]);

  const id = `reply-${parentId}`;
  return (
    <fetcher.Form method="post" noValidate className="grid gap-2">
      <input type="hidden" name="intent" value="reply" />
      <input type="hidden" name="parentId" value={parentId} />
      <label htmlFor={id} className="text-sm font-medium">
        Your reply
      </label>
      <Textarea
        id={id}
        name="body"
        rows={3}
        value={body}
        autoFocus
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => setBody(e.target.value)}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" className="min-h-11" disabled={busy || !body.trim()}>
          {busy ? "Posting…" : "Post reply"}
        </Button>
        <Button type="button" variant="ghost" className="min-h-11" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </fetcher.Form>
  );
}
