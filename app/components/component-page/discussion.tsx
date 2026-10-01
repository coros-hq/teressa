import { useMemo, useState } from "react";
import { Link, useFetcher } from "react-router";

import { AuthorLink } from "~/components/gallery/author-link";
import { ConfirmDialog } from "~/components/settings/section";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { RelativeTime } from "~/components/overview/relative-time";
import type { ComponentPage } from "~/lib/data/component-page.server";
import {
  buildThreads, categoryLabelOf, commenterLabel, countByStatus, discussionHref, filterThreads,
  type Comment, type DiscussionParams, type StatusFilter, type Thread,
} from "~/lib/data/discussion";
import { cn } from "~/lib/utils";

import { FeedbackForm, ReplyForm, SignInPrompt, type ActionReply } from "./feedback-form";

type Ctx = { slug: string; viewerId: string | null; ownerId: string | null; currentVersion: number };

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "addressed", label: "Addressed" },
];

const link = "focus-visible:ring-ring/50 inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium outline-none focus-visible:ring-3";
const tab = (active: boolean) => cn(link, active ? "bg-muted" : "text-muted-foreground hover:text-foreground");

export function Discussion({ page, viewerId, view }: { page: ComponentPage; viewerId: string | null; view: DiscussionParams }) {
  const c = page.component;
  const all = useMemo(() => buildThreads(page.comments, view.sort), [page.comments, view.sort]);
  const counts = countByStatus(all);
  const threads = filterThreads(all, view.status);
  const ctx: Ctx = { slug: c.slug, viewerId, ownerId: c.authorId, currentVersion: c.version };
  const total = page.comments.length;

  return (
    <section id="feedback" aria-labelledby="feedback-title" className="grid scroll-mt-4 gap-5">
      <div className="grid gap-1">
        <h2 id="feedback-title" className="text-xl font-semibold tracking-tight">
          Feedback{total > 0 && <span className="text-muted-foreground ml-2 text-base font-normal">{total.toLocaleString("en")}</span>}
        </h2>
        <p className="text-muted-foreground text-sm">
          A conversation between the people using this component and the person who made it.
        </p>
      </div>

      {viewerId ? <FeedbackForm lineCount={page.lineCount} /> : <SignInPrompt slug={c.slug} />}

      {all.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <nav aria-label="Filter feedback">
            <ul className="flex gap-1">
              {FILTERS.map((f) => (
                <li key={f.value}>
                  <Link to={discussionHref(c.slug, view, { status: f.value })} className={tab(view.status === f.value)} aria-current={view.status === f.value ? "true" : undefined} preventScrollReset>
                    {f.label} <span className="ml-1.5 opacity-70">{counts[f.value]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="Sort feedback">
            <ul className="flex gap-1">
              {(["newest", "oldest"] as const).map((s) => (
                <li key={s}>
                  <Link to={discussionHref(c.slug, view, { sort: s })} className={tab(view.sort === s)} aria-current={view.sort === s ? "true" : undefined} preventScrollReset>
                    {s === "newest" ? "Newest" : "Oldest"}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}

      {all.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed px-6 py-10 text-center text-sm">
          No feedback yet. Be the first to say what you think.
        </p>
      ) : threads.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed px-6 py-10 text-center text-sm">
          Nothing here. <Link to={discussionHref(c.slug, view, { status: "all" })} className="text-foreground underline underline-offset-4" preventScrollReset>Show all feedback</Link>
        </p>
      ) : (
        <ul className="grid gap-4">
          {threads.map((t) => (
            <li key={t.feedback.id}>
              <ThreadView thread={t} ctx={ctx} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Person({ c, ownerId }: { c: Comment; ownerId: string | null }) {
  const label = commenterLabel(c);
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar className="size-7">
        {c.authorAvatarUrl && <AvatarImage src={c.authorAvatarUrl} alt="" />}
        <AvatarFallback className="text-xs">{label.replace("@", "").charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <AuthorLink authorId={c.authorId} username={c.authorUsername} className="truncate text-sm font-semibold">
        {label}
      </AuthorLink>
      {/* The person who made the component is marked, so everyone can tell who's answering. */}
      {c.authorId !== null && c.authorId === ownerId && (
        <span className="bg-primary text-primary-foreground shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium" title="Made this component">
          Author
        </span>
      )}
    </span>
  );
}

function Meta({ c, ctx, feedback }: { c: Comment; ctx: Ctx; feedback: boolean }) {
  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <RelativeTime iso={c.createdAt} />
      {feedback && c.category && <span className="bg-muted text-foreground rounded-md px-2 py-0.5 text-xs font-medium">{categoryLabelOf(c.category)}</span>}
      {feedback && c.line !== null && (
        <a href={`#L${c.line}`} className="text-foreground focus-visible:ring-ring/50 rounded-sm underline underline-offset-4 outline-none focus-visible:ring-2">
          Line {c.line}
        </a>
      )}
      {feedback && c.version !== ctx.currentVersion && <span>on version {c.version}</span>}
    </div>
  );
}

function ThreadView({ thread, ctx }: { thread: Thread; ctx: Ctx }) {
  const f = thread.feedback;
  const [replying, setReplying] = useState(false);
  const isOwner = !!ctx.viewerId && ctx.viewerId === ctx.ownerId;
  const addressed = f.status === "addressed";

  return (
    <article id={`comment-${f.id}`} className="bg-card scroll-mt-4 grid gap-3 rounded-xl border p-4" aria-label={`Feedback from ${commenterLabel(f)}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Person c={f} ownerId={ctx.ownerId} />
        {/* A dot and a word, in the page's normal text color: readable in both themes. */}
        <span className="flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium">
          <span aria-hidden="true" className={cn("size-2 rounded-full", addressed ? "bg-muted-foreground" : "bg-secondary")} />
          {addressed ? "Addressed" : "Open"}
        </span>
      </div>
      <Meta c={f} ctx={ctx} feedback />
      <p className="text-sm break-words whitespace-pre-wrap">{f.body}</p>

      <div className="flex flex-wrap items-center gap-1 -ml-3">
        {ctx.viewerId && (
          <Button type="button" variant="ghost" className="min-h-11" aria-expanded={replying} onClick={() => setReplying((v) => !v)}>
            Reply
          </Button>
        )}
        {isOwner && <StatusButton commentId={f.id} next={addressed ? "open" : "addressed"} />}
        {ctx.viewerId && f.authorId === ctx.viewerId && <DeleteButton commentId={f.id} what="feedback" hasReplies={thread.replies.length > 0} />}
      </div>

      {(thread.replies.length > 0 || replying) && (
        <div className="grid gap-3 border-l-2 pl-4">
          {thread.replies.length > 0 && (
            <ul className="grid gap-3" aria-label="Replies">
              {thread.replies.map((r) => (
                <li key={r.id} id={`comment-${r.id}`} className="scroll-mt-4 grid gap-1.5">
                  <Person c={r} ownerId={ctx.ownerId} />
                  <Meta c={r} ctx={ctx} feedback={false} />
                  <p className="text-sm break-words whitespace-pre-wrap">{r.body}</p>
                  {ctx.viewerId && r.authorId === ctx.viewerId && (
                    <div className="-ml-3">
                      <DeleteButton commentId={r.id} what="reply" hasReplies={false} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {replying && <ReplyForm parentId={f.id} onDone={() => setReplying(false)} />}
        </div>
      )}
    </article>
  );
}

/** The author of the component marks feedback as dealt with, or opens it again. */
function StatusButton({ commentId, next }: { commentId: string; next: "open" | "addressed" }) {
  const fetcher = useFetcher<ActionReply>();
  const busy = fetcher.state === "submitting"; // not while the page refreshes afterwards
  const failed = fetcher.data && !fetcher.data.ok ? fetcher.data.message : null;
  return (
    <>
      <fetcher.Form method="post">
        <input type="hidden" name="intent" value="status" />
        <input type="hidden" name="commentId" value={commentId} />
        <input type="hidden" name="status" value={next} />
        <Button type="submit" variant="ghost" className="min-h-11" disabled={busy}>
          {busy ? "Saving…" : next === "addressed" ? "Mark as addressed" : "Reopen"}
        </Button>
      </fetcher.Form>
      {failed && (
        <span role="alert" className="text-destructive text-sm">
          {failed}
        </span>
      )}
    </>
  );
}

function DeleteButton({ commentId, what, hasReplies }: { commentId: string; what: "feedback" | "reply"; hasReplies: boolean }) {
  const fetcher = useFetcher<ActionReply>();
  const [open, setOpen] = useState(false);
  const busy = fetcher.state !== "idle";
  const failed = fetcher.data && !fetcher.data.ok ? fetcher.data.message : null;
  return (
    <>
      <Button type="button" variant="ghost" className="min-h-11" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete this ${what}?`}
        description={hasReplies ? "The replies under it will be deleted too. This can't be undone." : "This can't be undone."}
        confirmLabel="Delete"
        destructive
        pending={busy}
        error={failed}
        onConfirm={() => fetcher.submit({ intent: "delete", commentId }, { method: "post" })}
      />
    </>
  );
}
