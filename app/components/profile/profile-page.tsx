import { Globe } from "lucide-react";

import { GalleryCard } from "~/components/gallery/gallery-card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import type { ProfilePage as Data } from "~/lib/data/profile-page.server";

// lucide has no brand icons, so the GitHub mark is drawn here.
const GithubMark = () => (
  <svg aria-hidden viewBox="0 0 24 24" className="size-4 fill-current">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
);

const host = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const count = (n: number, one: string, many: string) => `${n.toLocaleString("en")} ${n === 1 ? one : many}`;

export function ProfileView({ page, origin }: { page: Data; origin: string }) {
  const { profile: p, items, totalCopies, hasMore } = page;
  const name = p.name ?? (p.username ? `@${p.username}` : "A Teressa member");
  const linkClass = "text-foreground focus-visible:ring-ring/50 -mx-1 inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm underline-offset-4 outline-none hover:underline focus-visible:ring-3";

  return (
    <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <Avatar className="size-20 shrink-0 sm:size-24">
          {p.avatarUrl && <AvatarImage src={p.avatarUrl} alt="" />}
          <AvatarFallback className="text-2xl">{name.replace("@", "").charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="grid min-w-0 gap-2">
          <div className="grid gap-0.5">
            <h1 className="text-3xl font-semibold tracking-tight break-words">{name}</h1>
            {p.username && p.name && <p className="text-muted-foreground text-base">@{p.username}</p>}
          </div>
          {p.bio && <p className="max-w-prose text-base break-words whitespace-pre-line">{p.bio}</p>}
          {(p.website || p.githubUsername) && (
            <ul className="flex flex-wrap gap-x-4">
              {p.website && (
                <li>
                  <a href={p.website} target="_blank" rel="noopener noreferrer nofollow ugc" className={linkClass}>
                    <Globe aria-hidden className="size-4" />
                    {host(p.website)}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              )}
              {p.githubUsername && (
                <li>
                  <a href={`https://github.com/${p.githubUsername}`} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    <GithubMark />
                    {p.githubUsername}
                    <span className="sr-only"> on GitHub (opens in a new tab)</span>
                  </a>
                </li>
              )}
            </ul>
          )}
          <p className="text-muted-foreground text-sm">
            {count(items.length, "component", "components")}
            {hasMore ? "+" : ""}
            {totalCopies > 0 && <> · {count(totalCopies, "copy", "copies")}</>}
          </p>
        </div>
      </header>

      <section aria-labelledby="components-title" className="grid gap-4">
        <h2 id="components-title" className="text-xl font-semibold">
          Components
        </h2>
        {items.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border border-dashed px-6 py-12 text-center text-sm">{name} hasn&apos;t published anything yet.</p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <li key={item.id}>
                <GalleryCard item={item} origin={origin} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
