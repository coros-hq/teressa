import { Link, NavLink } from "react-router";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

// The shell for pages anyone can open, signed in or not. It is the same for everybody (nothing here
// depends on who is looking), so the pages inside it can be cached.
export function PublicLayout({ children, signedIn = false }: { children: React.ReactNode; signedIn?: boolean }) {
  return (
    <div className="bg-background text-foreground flex min-h-svh flex-col">
      <a
        href="#main"
        className="bg-background text-foreground focus-visible:ring-ring/50 sr-only fixed top-3 left-3 z-50 rounded-md px-3 py-2 text-sm font-medium focus:not-sr-only focus-visible:ring-3"
      >
        Skip to content
      </a>
      <header className="border-b">
        <div className="mx-auto flex min-h-16 w-full max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link to="/" className="focus-visible:ring-ring/50 inline-flex min-h-11 items-center gap-2.5 rounded-md text-lg font-bold tracking-tight outline-none focus-visible:ring-3">
              <img src="/logo.svg" alt="" width={47} height={44} className="h-8 w-auto" />
              Teressa
            </Link>
            <nav aria-label="Main">
              <NavLink
                to="/explore"
                className={({ isActive }) =>
                  cn(
                    "focus-visible:ring-ring/50 inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium outline-none focus-visible:ring-3",
                    isActive ? "bg-muted" : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                Explore
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {signedIn ? (
              <Button asChild className="min-h-11">
                <Link to="/overview">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="min-h-11">
                  <Link to="/sign-in">Sign in</Link>
                </Button>
                <Button asChild className="min-h-11">
                  <Link to="/sign-up">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="border-t">
        <p className="text-muted-foreground mx-auto w-full max-w-[1200px] px-4 py-6 text-sm sm:px-6 lg:px-8">
          Every component here is free to use under the MIT license.
        </p>
      </footer>
    </div>
  );
}
