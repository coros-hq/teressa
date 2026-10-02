import { Moon, Sun } from "lucide-react";

import { Button } from "~/components/ui/button";
import { setTheme } from "~/lib/theme";

// Switches between light and dark. Both icons are always rendered and the `dark` class on <html>
// decides which one shows, so server and browser output match and there is no flash.
export function ThemeToggle({ className }: { className?: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      aria-label="Toggle theme"
      onClick={() => setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark")}
    >
      <Sun className="size-4 dark:hidden" />
      <Moon className="hidden size-4 dark:block" />
    </Button>
  );
}
