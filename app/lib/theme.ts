// The app's light/dark setting. The choice is kept in this browser, and applied as the `dark` class
// on <html> (which is what the theme's CSS reacts to). "system" follows the device and updates live.

export type ThemeChoice = "light" | "dark" | "system";
export const THEME_KEY = "teressa-theme";
export const THEME_CHOICES: ThemeChoice[] = ["light", "dark", "system"];

export const isThemeChoice = (v: unknown): v is ThemeChoice => THEME_CHOICES.includes(v as ThemeChoice);

/** Whether the page should be dark, for a choice and the device's preference. */
export const resolveTheme = (choice: ThemeChoice, systemPrefersDark: boolean): "light" | "dark" =>
  choice === "system" ? (systemPrefersDark ? "dark" : "light") : choice;

export function getStoredTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return isThemeChoice(v) ? v : "system";
  } catch {
    return "system";
  }
}

const systemQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

export function applyTheme(choice: ThemeChoice) {
  const theme = resolveTheme(choice, systemQuery().matches);
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

/** Applies a choice now and remembers it. */
export function setTheme(choice: ThemeChoice) {
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {}
  applyTheme(choice);
}

/** Keeps "system" in step with the device. Returns a function that stops listening. */
export function watchSystemTheme(): () => void {
  const q = systemQuery();
  const onChange = () => {
    if (getStoredTheme() === "system") applyTheme("system");
  };
  q.addEventListener("change", onChange);
  return () => q.removeEventListener("change", onChange);
}

// Runs before the page is drawn, so there is no flash of the wrong theme. Kept as a plain string
// because it is written into the document head.
export const THEME_INIT_SCRIPT = `(function(){try{var c=localStorage.getItem(${JSON.stringify(THEME_KEY)});var d=c==="dark"||((c!=="light")&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;if(d){r.classList.add("dark")}r.style.colorScheme=d?"dark":"light"}catch(e){}})();`;
