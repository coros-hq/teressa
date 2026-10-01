import { useEffect, useState } from "react";

import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { getStoredTheme, setTheme, watchSystemTheme, type ThemeChoice } from "~/lib/theme";
import { cn } from "~/lib/utils";

import { SectionCard } from "./section";

// Small pictures of each theme. The ".light" and ".dark" classes switch the colors just inside the
// picture, whatever the page itself is using, so each option shows what it really looks like.
function Swatch({ mode }: { mode: "light" | "dark" }) {
  return (
    <div className={cn(mode, "bg-background border-border flex h-full flex-col gap-1.5 p-2")}>
      <div className="bg-muted h-2 w-1/2 rounded-sm" />
      <div className="bg-muted h-2 w-3/4 rounded-sm" />
      <div className="bg-primary mt-auto h-3 w-1/3 rounded-sm" />
    </div>
  );
}

function Preview({ choice }: { choice: ThemeChoice }) {
  return (
    <span aria-hidden="true" className="border-border block h-20 w-full overflow-hidden rounded-lg border">
      {choice === "system" ? (
        <span className="grid h-full grid-cols-2">
          <Swatch mode="light" />
          <Swatch mode="dark" />
        </span>
      ) : (
        <Swatch mode={choice} />
      )}
    </span>
  );
}

const OPTIONS: { value: ThemeChoice; label: string; hint: string }[] = [
  { value: "light", label: "Light", hint: "Always light" },
  { value: "dark", label: "Dark", hint: "Always dark" },
  { value: "system", label: "System", hint: "Match your device" },
];

// Applies as soon as you pick one, and is remembered in this browser. There is no Save button.
export function AppearanceForm() {
  const [choice, setChoice] = useState<ThemeChoice>("system");

  useEffect(() => {
    setChoice(getStoredTheme());
    return watchSystemTheme();
  }, []);

  return (
    <SectionCard id="appearance" title="Theme" description="Choose how Teressa looks. This applies right away on this device.">
      <RadioGroup
        value={choice}
        aria-label="Theme"
        className="grid-cols-1 gap-3 sm:grid-cols-3"
        onValueChange={(v) => {
          setChoice(v as ThemeChoice);
          setTheme(v as ThemeChoice);
        }}
      >
        {OPTIONS.map((o) => (
          <Label
            key={o.value}
            htmlFor={`theme-${o.value}`}
            className={cn(
              "focus-within:ring-ring/50 grid min-h-11 cursor-pointer gap-3 rounded-xl border p-3 transition-colors focus-within:ring-3",
              choice === o.value ? "border-primary bg-muted/50" : "hover:bg-muted/40",
            )}
          >
            <Preview choice={o.value} />
            <span className="flex items-center gap-2">
              <RadioGroupItem value={o.value} id={`theme-${o.value}`} />
              <span className="grid">
                <span className="text-sm font-medium">{o.label}</span>
                <span className="text-muted-foreground text-xs font-normal">{o.hint}</span>
              </span>
            </span>
          </Label>
        ))}
      </RadioGroup>
    </SectionCard>
  );
}
