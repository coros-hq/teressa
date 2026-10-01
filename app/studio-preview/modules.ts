// The only modules code inside the preview can import. Anything else is rejected with a clear
// message. Keep this list small: everything here is bundled into the preview runtime.
import * as React from "react";
import * as JsxRuntime from "react/jsx-runtime";
import { cn } from "cn";
import {
  ArrowRight,
  Bell,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock,
  Copy,
  Ellipsis,
  Heart,
  House,
  Info,
  Mail,
  MessageSquare,
  Minus,
  Plus,
  Search,
  Settings,
  Star,
  Trash2,
  User,
  X,
} from "lucide-react";

import * as avatar from "~/components/ui/avatar";
import * as button from "~/components/ui/button";
import * as card from "~/components/ui/card";
import * as checkbox from "~/components/ui/checkbox";
import * as input from "~/components/ui/input";
import * as label from "~/components/ui/label";
import * as separator from "~/components/ui/separator";
import * as skeleton from "~/components/ui/skeleton";
import * as tabs from "~/components/ui/tabs";

const icons = {
  ArrowRight, Bell, Calendar, Check, ChevronDown, ChevronRight, CircleAlert, Clock, Copy,
  Ellipsis, Heart, House, Info, Mail, MessageSquare, Minus, Plus, Search, Settings, Star,
  Trash2, User, X,
};

const registry: Record<string, unknown> = {
  react: React,
  "react/jsx-runtime": JsxRuntime,
  "react/jsx-dev-runtime": JsxRuntime,
  "lucide-react": icons,
  "ui/avatar": avatar,
  "ui/button": button,
  "ui/card": card,
  "ui/checkbox": checkbox,
  "ui/input": input,
  "ui/label": label,
  "ui/separator": separator,
  "ui/skeleton": skeleton,
  "ui/tabs": tabs,
  utils: { cn },
};

export const AVAILABLE_IMPORTS = [
  "react",
  "lucide-react (a set of common icons)",
  "@/components/ui/{avatar, button, card, checkbox, input, label, separator, skeleton, tabs}",
  "@/lib/utils (cn)",
];

const IMPORT_PATH: Record<string, string> = { utils: "@/lib/utils" };
const pathFor = (key: string) => IMPORT_PATH[key] ?? (key.startsWith("ui/") ? `@/components/${key}` : key);

/** What each importable module is called in an import statement, and the names it exports. For the editor's suggestions. */
export function importableModules(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [key, mod] of Object.entries(registry)) {
    if (key.startsWith("react/")) continue;
    // React's namespace carries internals and unstable names that nobody means to import.
    const names = Object.keys(mod as object).filter((n) => n !== "default" && !n.startsWith("__") && !/^(unstable|experimental)_/i.test(n));
    out[pathFor(key)] = names.sort();
  }
  return out;
}

function keyFor(spec: string): string {
  const ui = spec.match(/^(?:@|~)\/components\/ui\/([a-z-]+)$/);
  if (ui) return `ui/${ui[1]}`;
  if (spec === "@/lib/utils" || spec === "~/lib/utils") return "utils";
  return spec;
}

// `require` handed to the compiled user code.
export function requireModule(spec: string): unknown {
  const found = registry[keyFor(spec)];
  if (found === undefined) {
    throw new Error(
      `Cannot import "${spec}". You can import from: ${AVAILABLE_IMPORTS.join("; ")}.`
    );
  }
  return found;
}
