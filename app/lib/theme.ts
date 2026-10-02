// The app's light/dark setting. It is chosen by the user, never by the device. The choice is kept in
// this browser, and applied as the `dark` class on <html> (which is what the theme's CSS reacts to).
// Light is the default until the user picks otherwise.

export type ThemeChoice = "light" | "dark";
export const THEME_KEY = "teressa-theme";
export const THEME_CHOICES: ThemeChoice[] = ["light", "dark"];

export const isThemeChoice = (v: unknown): v is ThemeChoice => THEME_CHOICES.includes(v as ThemeChoice);

export function getStoredTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return isThemeChoice(v) ? v : "light";
  } catch {
    return "light";
  }
}

export function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;
  root.classList.toggle("dark", choice === "dark");
  root.style.colorScheme = choice;
}

/** Applies a choice now and remembers it. */
export function setTheme(choice: ThemeChoice) {
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {}
  applyTheme(choice);
}

// Runs before the page is drawn, so there is no flash of the wrong theme. Kept as a plain string
// because it is written into the document head.
export const THEME_INIT_SCRIPT = `(function(){try{var d=localStorage.getItem(${JSON.stringify(THEME_KEY)})==="dark";var r=document.documentElement;if(d){r.classList.add("dark")}r.style.colorScheme=d?"dark":"light"}catch(e){}})();`;
