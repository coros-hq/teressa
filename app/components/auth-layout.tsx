import { Link } from "react-router";

import {
  AuthBackdrop,
  AuthIllustration,
} from "~/components/auth-illustration/auth-illustration";
import { useMediaQuery } from "~/hooks/use-media-query";
import { cn } from "~/lib/utils";

function Logo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn(
        "inline-flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-3",
        className
      )}
    >
      <img src="/logo.svg" alt="" width={47} height={44} className="h-9 w-auto" />
      Teressa
    </Link>
  );
}

// Two-column shell: orange illustration panel on large screens, form only below that.
export function AuthLayout({
  children,
  showLaunchNote = false,
}: {
  children: React.ReactNode;
  showLaunchNote?: boolean;
}) {
  // The animation is only mounted when the panel is visible, so phones and tablets do no work for it.
  const showPanel = useMediaQuery("(min-width: 1024px)");

  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]">
      <aside className="bg-brand text-brand-foreground relative hidden flex-col justify-between gap-8 overflow-hidden p-10 lg:flex xl:p-14">
        {showPanel && <AuthBackdrop />}
        <Logo className="relative text-2xl font-bold tracking-tight focus-visible:ring-brand-foreground/70" />
        <div className="relative mx-auto flex w-full max-w-xl flex-col gap-6">
          {showPanel && <AuthIllustration />}
          <p className="text-center text-2xl font-semibold tracking-tight">
            Design UI components. Publish them. Get feedback.
          </p>
        </div>
        <p className="relative text-xl font-semibold">
          {showLaunchNote ? "Teressa hasn't launched yet" : " "}
        </p>
      </aside>
      <div className="flex min-w-0 flex-col p-6 md:p-10">
        <div className="lg:hidden">
          <Logo className="text-lg font-semibold tracking-tight focus-visible:ring-ring/50" />
        </div>
        <main className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-sm">{children}</div>
        </main>
      </div>
    </div>
  );
}
