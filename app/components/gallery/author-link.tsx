import { Link } from "react-router";

import { publicProfilePath } from "~/lib/paths";
import { profileHandle } from "~/lib/data/profile-page";
import { cn } from "~/lib/utils";

/** A person's name, as a link to their profile. Plain text when their account no longer exists. */
export function AuthorLink({
  authorId,
  username,
  className,
  children,
}: {
  authorId: string | null;
  username: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  if (!authorId) return <span className={className}>{children}</span>;
  return (
    <Link
      to={publicProfilePath(profileHandle({ id: authorId, username }))}
      className={cn("focus-visible:ring-ring/50 rounded-sm outline-none hover:underline focus-visible:ring-2", className)}
    >
      {children}
    </Link>
  );
}
