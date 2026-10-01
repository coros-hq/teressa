import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { AuthorLink } from "~/components/gallery/author-link";
import { CopyInstall } from "~/components/gallery/copy-install";
import { PreviewImage } from "~/components/gallery/preview-image";
import { RelativeTime } from "~/components/overview/relative-time";
import { trackCopy } from "~/lib/copy-tracking";
import type { ComponentPage } from "~/lib/data/component-page.server";
import { authorLabel, galleryHref } from "~/lib/data/gallery";
import type { DiscussionParams } from "~/lib/data/discussion";
import { publishLinks } from "~/lib/publish/urls";

import { CodeViewer, CopyCode } from "./code-viewer";
import { Discussion } from "./discussion";

const EMPTY = { q: "", category: null, tag: null, sort: "newest", page: 1 } as const;
const chip = "focus-visible:ring-ring/50 inline-flex min-h-11 items-center outline-none";

export function ComponentDetail({
  page,
  viewerId,
  view,
  origin,
}: {
  page: ComponentPage;
  viewerId: string | null;
  view: DiscussionParams;
  origin: string;
}) {
  const c = page.component;
  const author = authorLabel({ authorDeleted: c.authorId === null, authorUsername: c.authorUsername, authorName: c.authorName });
  const { installCommand } = publishLinks(origin, c.slug);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <Link
        to="/explore"
        className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 -ml-2 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-md px-2 text-sm font-medium outline-none focus-visible:ring-3"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Explore
      </Link>

      <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)] lg:items-start lg:gap-10">
        <div className="grid content-start gap-4 lg:order-1">
          <div className="grid gap-2">
            <h1 className="text-3xl font-semibold tracking-tight break-words">{c.name}</h1>
            <p className="text-muted-foreground text-base break-words">{c.description}</p>
          </div>

          <p className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="flex items-center gap-2">
              <Avatar className="size-6">
                {c.authorAvatarUrl && <AvatarImage src={c.authorAvatarUrl} alt="" />}
                <AvatarFallback className="text-xs">{author.replace("@", "").charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <AuthorLink authorId={c.authorId} username={c.authorUsername} className="text-foreground font-medium">
                {author}
              </AuthorLink>
            </span>
            <span>Version {c.version}</span>
            {c.publishedAt && <RelativeTime iso={c.publishedAt} prefix="Published " />}
            {c.copies > 0 && (
              <span>
                {c.copies.toLocaleString("en")} {c.copies === 1 ? "copy" : "copies"}
              </span>
            )}
            <span>MIT license</span>
          </p>

          <ul className="-my-1.5 flex flex-wrap gap-x-2" aria-label="Category and tags">
            <li>
              <Link to={galleryHref(EMPTY, { category: c.category })} className={`group ${chip}`}>
                <span className="bg-muted group-focus-visible:ring-ring/50 rounded-md px-2.5 py-1 text-sm font-medium group-hover:underline group-focus-visible:ring-3">{c.category}</span>
              </Link>
            </li>
            {c.tags.map((t) => (
              <li key={t}>
                <Link to={galleryHref(EMPTY, { tag: t })} className={`group ${chip}`}>
                  <span className="text-muted-foreground group-hover:text-foreground group-focus-visible:ring-ring/50 rounded-md border px-2.5 py-1 text-sm group-hover:underline group-focus-visible:ring-3">{t}</span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <CopyInstall command={installCommand} name={c.name} onCopy={() => trackCopy(c.slug)} />
              <CopyCode code={c.code} slug={c.slug} name={c.name} />
              <a href="#feedback" className="text-foreground focus-visible:ring-ring/50 inline-flex min-h-11 items-center rounded-md px-2 text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3">
                Leave feedback
              </a>
            </div>
            <p className="text-muted-foreground text-sm">Run the install command in your project, or copy the code and paste it in.</p>
          </div>
        </div>

        <div className="ring-foreground/10 overflow-hidden rounded-xl ring-1 lg:order-2">
          <PreviewImage light={c.previewLight} dark={c.previewDark} name={c.name} eager />
        </div>
      </header>

      <CodeViewer code={c.code} slug={c.slug} name={c.name} />
      <Discussion page={page} viewerId={viewerId} view={view} />
    </div>
  );
}
