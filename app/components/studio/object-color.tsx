import { ColorPopover } from "./color-popover";
import { parseHex } from "./color-utils";
import { THEME_COLORS } from "./design-model";

// Fill or stroke of a shape or frame. The value is a CSS color: a theme color (`var(--primary)`),
// the user's own (`#1a2b3c` or `#1a2b3c80`), or null for none.
export function ObjectColor({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
}) {
  const token = THEME_COLORS.find((t) => t.css === value);
  const custom = value && value.startsWith("#") ? parseHex(value) : null;
  return (
    <ColorPopover
      id={id}
      label={label}
      noneLabel="None"
      tokens={THEME_COLORS}
      activeTokenId={token ? token.id : null}
      custom={custom}
      onToken={(t) => onChange(t)}
      onCustom={(v) => onChange(v)}
    />
  );
}
