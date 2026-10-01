import { currentClass, setClass, type ClassGroup } from "./class-groups";
import { ColorPopover } from "./color-popover";
import { readArbitrary } from "./color-utils";
import type { JsxNodeInfo } from "./jsx-tree";

// Color picker for the text color and the fill of an element in the component's code. Choices are
// written as Tailwind classes: a theme class (text-primary), or the user's own color as an
// arbitrary value (text-[#ff0000]).
export function ColorControl({
  group,
  node,
  code,
  onCodeChange,
  disabled,
}: {
  group: ClassGroup;
  node: JsxNodeInfo;
  code: string;
  onCodeChange: (code: string) => void;
  disabled: boolean;
}) {
  const prefix = group.color!.prefix;
  const current = currentClass(node, group);
  const custom = readArbitrary(current, prefix);
  const token = group.options.find((o) => o.value === current);

  const apply = (cls: string | null) => {
    const next = setClass(code, node, group, cls);
    if (next !== null) onCodeChange(next);
  };

  return (
    <ColorPopover
      id={`design-${group.id}`}
      label={group.label}
      disabled={disabled}
      tokens={group.options.map((o) => ({ id: o.value, label: o.label, css: o.swatch ?? "transparent" }))}
      activeTokenId={token ? token.value : null}
      custom={custom}
      onToken={apply}
      onCustom={(value) => apply(`${prefix}-[${value}]`)}
    />
  );
}
