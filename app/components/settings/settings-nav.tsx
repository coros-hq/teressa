import { NavLink } from "react-router";

import { cn } from "~/lib/utils";

const SECTIONS = [
  { to: "/settings/profile", label: "Profile" },
  { to: "/settings/account", label: "Account" },
  { to: "/settings/appearance", label: "Appearance" },
  { to: "/settings/notifications", label: "Notifications" },
];

// A vertical list beside the form on wide screens; a row of tabs you can scroll sideways on small
// ones. The current section is marked aria-current="page" (NavLink does it).
export function SettingsNav() {
  return (
    <nav
      aria-label="Settings sections"
      className="-mx-4 overflow-x-auto border-b px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:overflow-visible lg:border-b-0 lg:px-0"
    >
      <ul className="flex gap-1 lg:flex-col">
        {SECTIONS.map((s) => (
          <li key={s.to} className="shrink-0">
            <NavLink
              to={s.to}
              className={({ isActive }) =>
                cn(
                  "focus-visible:ring-ring/50 flex min-h-11 items-center rounded-lg px-3 text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-3",
                  isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )
              }
            >
              {s.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
