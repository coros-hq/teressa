import { Link } from "react-router";

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { authorLabel, galleryHref, type GalleryItem } from "~/lib/data/gallery";
import { HAS_PUBLIC_PAGE, publicPagePath } from "~/lib/paths";
import { trackCopy } from "~/lib/copy-tracking";
import { publishLinks } from "~/lib/publish/urls";

import { AuthorLink } from "./author-link";
import { CopyInstall } from "./copy-install";
import { ViewCodeDialog } from "./view-code-dialog";
import { PreviewImage } from "./preview-image";

const EMPTY = { q: "", category: null, tag: null, sort: "newest", page: 1 } as const;

export function GalleryCard({ item, origin }: { item: GalleryItem; origin: string }) {
  const { installCommand } = publishLinks(origin, item.slug);
  const label = authorLabel(item);
  return (
    <article className="bg-card text-card-foreground ring-foreground/10 flex h-full flex-col overflow-hidden rounded-xl ring-1">
      {HAS_PUBLIC_PAGE ? (
        <Link to={publicPagePath(item.slug)} tabIndex={-1} aria-hidden="true" className="block">
          <PreviewImage light={item.previewLight} dark={item.previewDark} name={item.name} className="rounded-t-xl" />
        </Link>
      ) : (
        <PreviewImage light={item.previewLight} dark={item.previewDark} name={item.name} className="rounded-t-xl" />
      )}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="grid gap-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="min-w-0 text-base font-semibold">
              {HAS_PUBLIC_PAGE ? (
                <Link to={publicPagePath(item.slug)} className="focus-visible:ring-ring/50 -my-3 flex min-h-11 items-center rounded-sm outline-none hover:underline focus-visible:ring-3">
                  <span className="truncate">{item.name}</span>
                </Link>
              ) : (
                <span className="block truncate">{item.name}</span>
              )}
            </h2>
            <span className="text-muted-foreground shrink-0 text-sm">v{item.version}</span>
          </div>
          <p className="text-muted-foreground line-clamp-2 text-sm">{item.description}</p>
        </div>

        <ul className="-my-1.5 flex flex-wrap gap-x-1.5" aria-label="Category and tags">
          <li>
            <Link to={galleryHref(EMPTY, { category: item.category })} className="group inline-flex min-h-11 items-center outline-none">
              <span className="bg-muted group-focus-visible:ring-ring/50 rounded-md px-2 py-0.5 text-xs font-medium group-hover:underline group-focus-visible:ring-3">
                {item.category}
              </span>
            </Link>
          </li>
          {item.tags.slice(0, 3).map((t) => (
            <li key={t}>
              <Link to={galleryHref(EMPTY, { tag: t })} className="group inline-flex min-h-11 items-center outline-none">
                <span className="text-muted-foreground group-hover:text-foreground group-focus-visible:ring-ring/50 rounded-md border px-2 py-0.5 text-xs group-hover:underline group-focus-visible:ring-3">
                  {t}
                </span>
              </Link>
            </li>
          ))}
          {item.tags.length > 3 && <li className="text-muted-foreground px-1 py-0.5 text-xs">+{item.tags.length - 3}</li>}
        </ul>

        <div className="mt-auto grid gap-3 pt-1">
          <p className="text-muted-foreground flex min-w-0 items-center gap-2 text-sm">
            <Avatar className="size-6">
              {item.authorAvatarUrl && <AvatarImage src={item.authorAvatarUrl} alt="" />}
              <AvatarFallback className="text-xs">{label.replace("@", "").charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <AuthorLink authorId={item.authorId} username={item.authorUsername} className="truncate">
              {label}
            </AuthorLink>
            {item.copies > 0 && (
              <span className="shrink-0">
                · {item.copies.toLocaleString("en")} {item.copies === 1 ? "copy" : "copies"}
              </span>
            )}
            {item.commentCount > 0 && (
              <span className="shrink-0">
                · {item.commentCount.toLocaleString("en")} {item.commentCount === 1 ? "comment" : "comments"}
              </span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <CopyInstall command={installCommand} name={item.name} onCopy={() => trackCopy(item.slug)} />
            <ViewCodeDialog slug={item.slug} name={item.name} />
          </div>
        </div>
      </div>
    </article>
  );
}
