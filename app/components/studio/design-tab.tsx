import {
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Component,
  Copy,
  Group,
  Ungroup,
  Crosshair,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignJustify,
  TextAlignStart,
  Unlink,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import {
  currentClass,
  GROUPS,
  setClass,
  type ClassGroup,
} from "./class-groups";
import { ColorControl } from "./color-control";
import {
  isLineKind,
  KIND_LABEL,
  SHADOW_PRESETS,
  sameShadow,
  withEndpoints,
  type DesignObject,
  type Shadow,
} from "./design-model";
import { ObjectColor } from "./object-color";
import { setText, type JsxNodeInfo } from "./jsx-tree";

const NONE = "__none";

function ClassSelect({
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
  const current = currentClass(node, group);
  const known = current && group.options.some((o) => o.value === current);
  const id = `design-${group.id}`;

  return (
    <div className="grid grid-cols-[5.5rem_1fr] items-center gap-2">
      <Label htmlFor={id} className="text-muted-foreground text-sm font-normal">
        {group.label}
      </Label>
      <Select
        value={current ?? NONE}
        disabled={disabled}
        onValueChange={(v) => {
          const next = setClass(code, node, group, v === NONE ? null : v);
          if (next !== null) onCodeChange(next);
        }}
      >
        <SelectTrigger id={id} className="h-9 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Default</SelectItem>
          {current && !known && (
            <SelectItem value={current}>{current}</SelectItem>
          )}
          {group.options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              <span className="flex items-center gap-2">
                {o.swatch && (
                  <span
                    aria-hidden="true"
                    className="size-3.5 rounded-sm ring-1 ring-foreground/20"
                    style={{ background: o.swatch }}
                  />
                )}
                {o.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-2 border-b px-4 py-3 last:border-b-0">
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

// A number field that takes whatever you type. There are no limits and nothing is snapped back: you
// can clear it, type a minus sign or a decimal on the way to a number, and go past any range. Each
// complete number is applied as you type. Only if you leave the field empty (or half-typed) does it
// show the current value again, because an empty field isn't a number.
function NumberField({
  id,
  label,
  value,
  onChange,
  wide = false,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  /** For longer labels (a short one like X or W uses a narrow column). */
  wide?: boolean;
}) {
  // While you're typing, the field shows your text. Otherwise it shows the real value.
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div
      className={
        wide
          ? "grid grid-cols-[5.5rem_1fr] items-center gap-2"
          : "grid grid-cols-[1.5rem_1fr] items-center gap-2"
      }
    >
      <Label htmlFor={id} className="text-muted-foreground text-sm font-normal">
        {label}
      </Label>
      <Input
        id={id}
        type="number"
        step="any"
        value={draft ?? String(Math.round(value * 100) / 100)}
        className="h-9"
        onChange={(e) => {
          setDraft(e.target.value);
          const n = e.target.valueAsNumber;
          if (Number.isFinite(n)) onChange(n);
        }}
        onBlur={() => setDraft(null)}
      />
    </div>
  );
}

const WEIGHTS = [
  { value: 400, label: "Regular" },
  { value: 500, label: "Medium" },
  { value: 600, label: "Semibold" },
  { value: 700, label: "Bold" },
];

const NO_SHADOW = "none";

// Drop shadow: a preset, or custom offset, blur, spread and color.
function ShadowSection({
  objects,
  onChange,
}: {
  objects: DesignObject[];
  onChange: (patch: Partial<DesignObject>) => void;
}) {
  const first = objects[0];
  const shadow = first.shadow ?? null;
  const preset = shadow
    ? ((Object.keys(SHADOW_PRESETS) as (keyof typeof SHADOW_PRESETS)[]).find(
        (k) => sameShadow(shadow, SHADOW_PRESETS[k]),
      ) ?? "custom")
    : NO_SHADOW;
  // Text and lines have no spread.
  const hasSpread = !["text", "line", "arrow"].includes(first.kind);
  const set = (patch: Partial<Shadow>) =>
    shadow && onChange({ shadow: { ...shadow, ...patch } });

  return (
    <Section title="Shadow">
      <div className="grid grid-cols-[5.5rem_1fr] items-center gap-2">
        <Label
          htmlFor="object-shadow"
          className="text-muted-foreground text-sm font-normal"
        >
          Preset
        </Label>
        <Select
          value={preset}
          onValueChange={(v) => {
            if (v === NO_SHADOW) onChange({ shadow: null });
            else if (v in SHADOW_PRESETS)
              onChange({
                shadow: { ...SHADOW_PRESETS[v as keyof typeof SHADOW_PRESETS] },
              });
          }}
        >
          <SelectTrigger id="object-shadow" className="h-9 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_SHADOW}>None</SelectItem>
            <SelectItem value="small">Small</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="large">Large</SelectItem>
            {preset === "custom" && (
              <SelectItem value="custom">Custom</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
      {shadow && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              id="object-shadow-x"
              label="X"
              value={shadow.x}
              onChange={(x) => set({ x })}
            />
            <NumberField
              id="object-shadow-y"
              label="Y"
              value={shadow.y}
              onChange={(y) => set({ y })}
            />
          </div>
          <NumberField
            id="object-shadow-blur"
            label="Blur"
            wide
            value={shadow.blur}
            onChange={(blur) => set({ blur })}
          />
          {hasSpread && (
            <NumberField
              id="object-shadow-spread"
              label="Spread"
              wide
              value={shadow.spread}
              onChange={(spread) => set({ spread })}
            />
          )}
          <ObjectColor
            id="object-shadow-color"
            label="Color"
            value={shadow.color}
            onChange={(color) => set({ color: color ?? "#00000033" })}
          />
        </>
      )}
    </Section>
  );
}

export type ComponentActions = {
  createComponent: () => void;
  /** Whether the current selection can become a component. */
  canCreateComponent: boolean;
  createInstance: (componentId: string) => void;
  /** Write a component's code again from its layers (replaces the current code). */
  rebuildCode: (componentId: string) => void;
  detach: (instanceId: string) => void;
  goToMain: (componentId: string) => void;
  /** Whether the selection can be grouped. */
  canGroup: boolean;
  group: () => void;
  ungroup: () => void;
};

type AlignOption = { value: string; label: string; icon: LucideIcon };

// A row of icon buttons, one of which can be on. Pressing the one that is on turns it off.
function AlignToggle({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  options: AlignOption[];
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] items-center gap-2">
      <span className="text-muted-foreground text-sm" id={`align-${label}`}>
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={`align-${label}`}
        className="bg-muted flex gap-0.5 rounded-lg p-0.5"
      >
        {options.map((o) => (
          <Button
            key={o.value}
            variant="ghost"
            size="icon"
            disabled={disabled}
            aria-label={o.label}
            title={o.label}
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "h-8 flex-1",
              value === o.value &&
                "bg-background text-foreground shadow-sm hover:bg-background",
            )}
          >
            <o.icon />
          </Button>
        ))}
      </div>
    </div>
  );
}

const HORIZONTAL: AlignOption[] = [
  { value: "left", label: "Align left", icon: TextAlignStart },
  { value: "center", label: "Align center", icon: TextAlignCenter },
  { value: "right", label: "Align right", icon: TextAlignEnd },
  { value: "justify", label: "Justify", icon: TextAlignJustify },
];
const VERTICAL: AlignOption[] = [
  { value: "top", label: "Align top", icon: AlignVerticalJustifyStart },
  { value: "middle", label: "Align middle", icon: AlignVerticalJustifyCenter },
  { value: "bottom", label: "Align bottom", icon: AlignVerticalJustifyEnd },
];

// Horizontal and vertical alignment of text layers.
function TextAlignRows({
  object,
  onChange,
}: {
  object: DesignObject;
  onChange: (patch: Partial<DesignObject>) => void;
}) {
  return (
    <>
      <AlignToggle
        label="Align"
        options={HORIZONTAL}
        value={object.textAlign ?? "left"}
        onChange={(v) =>
          onChange({ textAlign: v as DesignObject["textAlign"] })
        }
      />
      <AlignToggle
        label="Vertical"
        options={VERTICAL}
        value={object.verticalAlign ?? "top"}
        onChange={(v) =>
          onChange({ verticalAlign: v as DesignObject["verticalAlign"] })
        }
      />
    </>
  );
}

// Grouping: several objects that move and select together.
function GroupSection({
  objects,
  actions,
}: {
  objects: DesignObject[];
  actions: ComponentActions;
}) {
  const single = objects.length === 1 ? objects[0] : null;
  if (single?.kind === "group") {
    return (
      <Section title="Group">
        <p className="text-muted-foreground text-sm">
          These objects move and select together. Double-click one on the canvas
          to select it alone.
        </p>
        <Button
          variant="outline"
          className="justify-self-start"
          onClick={actions.ungroup}
        >
          <Ungroup data-icon="inline-start" />
          Ungroup
        </Button>
      </Section>
    );
  }
  if (actions.canGroup) {
    return (
      <Section title="Group">
        <p className="text-muted-foreground text-sm">
          Keep these together so they move as one.
        </p>
        <Button
          variant="outline"
          className="justify-self-start"
          onClick={actions.group}
        >
          <Group data-icon="inline-start" />
          Group
        </Button>
      </Section>
    );
  }
  return null;
}

// Making components and working with instances.
function ComponentSection({
  objects,
  allObjects,
  actions,
}: {
  objects: DesignObject[];
  allObjects: DesignObject[];
  actions: ComponentActions;
}) {
  const single = objects.length === 1 ? objects[0] : null;
  if (single?.kind === "instance") {
    const main = allObjects.find((o) => o.id === single.componentId);
    return (
      <Section title="Instance">
        <p className="text-sm">
          Instance of{" "}
          <span className="font-semibold">
            {main?.name ?? "a deleted component"}
          </span>
          . It follows the main component.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={!main}
            onClick={() => main && actions.goToMain(main.id)}
          >
            <Crosshair data-icon="inline-start" />
            Go to main component
          </Button>
          <Button variant="outline" onClick={() => actions.detach(single.id)}>
            <Unlink data-icon="inline-start" />
            Detach instance
          </Button>
        </div>
      </Section>
    );
  }
  if (single?.kind === "component") {
    return (
      <Section title="Component">
        <p className="text-muted-foreground text-sm">
          Main component. Changes you make here update every instance.
        </p>
        <Button
          variant="outline"
          className="justify-self-start"
          onClick={() => actions.createInstance(single.id)}
        >
          <Copy data-icon="inline-start" />
          Create instance
        </Button>
        {single.code !== undefined && allObjects.some((o) => o.parentId === single.id) && (
          <RebuildCode onConfirm={() => actions.rebuildCode(single.id)} />
        )}
      </Section>
    );
  }
  if (actions.canCreateComponent) {
    return (
      <Section title="Component">
        <p className="text-muted-foreground text-sm">
          Finished with this design? Turn it into a component you can reuse.
        </p>
        <Button
          variant="outline"
          className="justify-self-start"
          onClick={actions.createComponent}
        >
          <Component data-icon="inline-start" />
          Create component
        </Button>
      </Section>
    );
  }
  return null;
}

// Writes the code again from the layers. It replaces whatever the code is now, so it asks first.
function RebuildCode({ onConfirm }: { onConfirm: () => void }) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <Button variant="ghost" className="justify-self-start" onClick={() => setAsking(true)}>
        Rebuild code from layers
      </Button>
    );
  }
  return (
    <div role="alertdialog" aria-label="Rebuild the code from the layers?" className="grid gap-2 rounded-lg border p-3 text-sm">
      <p>This writes the code again from your layers, in a flowing layout. Any changes you made to the code will be replaced.</p>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => {
            onConfirm();
            setAsking(false);
          }}
        >
          Rebuild
        </Button>
        <Button size="sm" variant="outline" onClick={() => setAsking(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// Everything about the selected frame, shape or component: name, position, size, look and text.
function ObjectProps({
  objects,
  allObjects,
  onChange,
  actions,
}: {
  /** What is selected. With several, the panel shows what they can share, and changes apply to all. */
  objects: DesignObject[];
  allObjects: DesignObject[];
  onChange: (patch: Partial<DesignObject>) => void;
  actions: ComponentActions;
}) {
  const object = objects[0];
  const single = objects.length === 1;
  const k = object.kind;
  const isLine = isLineKind(k);
  const some = (f: (kind: DesignObject["kind"]) => boolean) =>
    objects.some((o) => f(o.kind));
  const hasFill = some(
    (x) =>
      x === "frame" ||
      x === "component" ||
      x === "rect" ||
      x === "ellipse" ||
      x === "text",
  );
  const hasStroke = some(
    (x) => x === "rect" || x === "ellipse" || isLineKind(x),
  );
  const setEnds = (x1: number, y1: number, x2: number, y2: number) => {
    const n = withEndpoints(object, x1, y1, x2, y2);
    onChange({
      x1: n.x1,
      y1: n.y1,
      x2: n.x2,
      y2: n.y2,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
    });
  };

  return (
    <div>
      <div className="border-b px-4 py-3">
        <p className="text-sm font-semibold">
          {single ? KIND_LABEL[k] : `${objects.length} objects`}
        </p>
        <p className="text-muted-foreground text-xs">
          {single
            ? `${Math.round(object.width)} × ${Math.round(object.height)}`
            : "Changes apply to all of them"}
        </p>
      </div>

      <ComponentSection
        objects={objects}
        allObjects={allObjects}
        actions={actions}
      />

      {single && (
        <Section title="Name">
          <Label htmlFor="object-name" className="sr-only">
            Name
          </Label>
          <Input
            id="object-name"
            value={object.name}
            maxLength={60}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </Section>
      )}

      {single && k === "text" && (
        <Section title="Text">
          <Label htmlFor="object-text" className="sr-only">
            Text
          </Label>
          <Input
            id="object-text"
            value={object.text ?? ""}
            onChange={(e) => onChange({ text: e.target.value })}
          />
          <NumberField
            id="object-fontSize"
            label="Size"
            wide
            value={object.fontSize ?? 24}
            onChange={(fontSize) => onChange({ fontSize })}
          />
          <div className="grid grid-cols-[5.5rem_1fr] items-center gap-2">
            <Label
              htmlFor="object-fontWeight"
              className="text-muted-foreground text-sm font-normal"
            >
              Weight
            </Label>
            <Select
              value={String(object.fontWeight ?? 500)}
              onValueChange={(v) => onChange({ fontWeight: Number(v) })}
            >
              <SelectTrigger id="object-fontWeight" className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEIGHTS.map((w) => (
                  <SelectItem key={w.value} value={String(w.value)}>
                    {w.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <TextAlignRows object={object} onChange={onChange} />
        </Section>
      )}

      {!single && some((x) => x === "text") && (
        <Section title="Text">
          <TextAlignRows
            object={objects.find((o) => o.kind === "text")!}
            onChange={(patch) => onChange(patch)}
          />
        </Section>
      )}

      {!single ? null : isLine ? (
        <Section title="Points">
          <div className="grid grid-cols-2 gap-2">
            <NumberField
              id="object-X1"
              label="X1"
              value={object.x1 ?? object.x}
              onChange={(v) => setEnds(v, object.y1!, object.x2!, object.y2!)}
            />
            <NumberField
              id="object-Y1"
              label="Y1"
              value={object.y1 ?? object.y}
              onChange={(v) => setEnds(object.x1!, v, object.x2!, object.y2!)}
            />
            <NumberField
              id="object-X2"
              label="X2"
              value={object.x2 ?? object.x}
              onChange={(v) => setEnds(object.x1!, object.y1!, v, object.y2!)}
            />
            <NumberField
              id="object-Y2"
              label="Y2"
              value={object.y2 ?? object.y}
              onChange={(v) => setEnds(object.x1!, object.y1!, object.x2!, v)}
            />
          </div>
        </Section>
      ) : (
        <>
          <Section title="Position">
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                id="object-X"
                label="X"
                value={object.x}
                onChange={(x) => onChange({ x })}
              />
              <NumberField
                id="object-Y"
                label="Y"
                value={object.y}
                onChange={(y) => onChange({ y })}
              />
            </div>
          </Section>
          {k !== "instance" && k !== "group" && (
            <Section title="Size">
              <div className="grid grid-cols-2 gap-2">
                <NumberField
                  id="object-W"
                  label="W"
                  value={object.width}
                  onChange={(width) => onChange({ width })}
                />
                <NumberField
                  id="object-H"
                  label="H"
                  value={object.height}
                  onChange={(height) => onChange({ height })}
                />
              </div>
            </Section>
          )}
        </>
      )}

      {(!single || k !== "instance") && (
        <Section title="Appearance">
          {hasFill && (
            <ObjectColor
              id="object-fill"
              label={k === "text" ? "Color" : "Fill"}
              value={object.fill}
              onChange={(fill) => onChange({ fill })}
            />
          )}
          {hasStroke && (
            <>
              <ObjectColor
                id="object-stroke"
                label="Stroke"
                value={object.stroke}
                onChange={(stroke) => onChange({ stroke })}
              />
              <NumberField
                id="object-strokeWidth"
                label="Stroke width"
                wide
                value={object.strokeWidth ?? 1}
                onChange={(strokeWidth) => onChange({ strokeWidth })}
              />
            </>
          )}
          {single && (k === "rect" || k === "frame" || k === "component") && (
            <NumberField
              id="object-radius"
              label="Radius"
              wide
              value={object.radius ?? (k === "frame" ? 2 : 0)}
              onChange={(radius) => onChange({ radius })}
            />
          )}
          <NumberField
            id="object-opacity"
            label="Opacity"
            wide
            value={object.opacity ?? 100}
            onChange={(opacity) => onChange({ opacity })}
          />
        </Section>
      )}
      {!(single && k === "group") && (
        <ShadowSection objects={objects} onChange={onChange} />
      )}
    </div>
  );
}

export function DesignTab({
  code,
  node,
  onCodeChange,
  objects,
  allObjects,
  onObjectChange,
  actions,
}: {
  code: string;
  node: JsxNodeInfo | null;
  onCodeChange: (code: string) => void;
  /** The selected frames, shapes or component. */
  objects: DesignObject[];
  allObjects: DesignObject[];
  onObjectChange: (patch: Partial<DesignObject>) => void;
  actions: ComponentActions;
}) {
  const [draft, setDraft] = useState(node?.text?.value ?? "");
  useEffect(() => {
    // Follow outside changes (typing in the code editor), but not our own trimming.
    if (node?.text && node.text.value !== draft.trim())
      setDraft(node.text.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.sid, node?.text?.value]);

  if (!node) {
    return objects.length ? (
      <ObjectProps
        objects={objects}
        allObjects={allObjects}
        onChange={onObjectChange}
        actions={actions}
      />
    ) : (
      <p className="text-muted-foreground p-4 text-sm">
        Select something on the canvas to edit it here.
      </p>
    );
  }

  const computed = node.hasClassName && !node.classAttr;
  const sel = (id: string) =>
    GROUPS[id].color ? (
      <ColorControl
        key={id}
        group={GROUPS[id]}
        node={node}
        code={code}
        onCodeChange={onCodeChange}
        disabled={computed}
      />
    ) : (
      <ClassSelect
        key={id}
        group={GROUPS[id]}
        node={node}
        code={code}
        onCodeChange={onCodeChange}
        disabled={computed}
      />
    );

  return (
    <div>
      <div className="border-b px-4 py-3">
        <p className="text-sm font-semibold">
          <span className="font-mono">{`<${node.tag}>`}</span>
        </p>
        <p className="text-muted-foreground text-xs">Line {node.line}</p>
      </div>

      {computed && (
        <p
          role="note"
          className="text-muted-foreground border-b px-4 py-3 text-sm"
        >
          This element&apos;s classes are worked out in code, so they can&apos;t
          be edited here. You can still change them in the editor.
        </p>
      )}

      {node.text && (
        <Section title="Text">
          <Label htmlFor="design-text" className="sr-only">
            Text
          </Label>
          <Input
            id="design-text"
            value={draft}
            onChange={(e) => {
              // Braces and angle brackets would be read as code, so they are left out.
              const v = e.target.value.replace(/[{}<>]/g, "");
              setDraft(v);
              const next = v.trim() ? setText(code, node, v.trim()) : null;
              if (next !== null) onCodeChange(next);
            }}
          />
        </Section>
      )}

      <Section title="Typography">
        {["textSize", "fontWeight"].map(sel)}
        <AlignToggle
          label="Align"
          disabled={computed}
          value={
            currentClass(node, GROUPS.textAlign)?.replace("text-", "") ?? null
          }
          options={HORIZONTAL}
          onChange={(v) => {
            const cur = currentClass(node, GROUPS.textAlign);
            const next = setClass(
              code,
              node,
              GROUPS.textAlign,
              cur === `text-${v}` ? null : `text-${v}`,
            );
            if (next !== null) onCodeChange(next);
          }}
        />
        {sel("textColor")}
      </Section>
      <Section title="Fill">{sel("fill")}</Section>
      <Section title="Shape">{["radius", "border"].map(sel)}</Section>
      <Section title="Layout">
        {["padding", "gap", "width", "height"].map(sel)}
      </Section>
    </div>
  );
}
