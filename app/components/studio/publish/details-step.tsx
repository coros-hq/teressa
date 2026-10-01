import { X } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "~/components/ui/select";
import type { Dependencies } from "~/lib/publish/dependencies.ts";
import { LICENSE, LIMITS, normalizeTags, type Details, type DetailsErrors } from "~/lib/publish/details.ts";

// Categories are free text. These are the common ones; "Other" lets you write your own.
const OTHER = "__other__";
const SUGGESTED_CATEGORIES = ["Buttons", "Cards", "Forms", "Navigation", "Feedback", "Data display", "Layout", "Overlays"];

export const fieldId = (name: string) => `publish-${name}`;

export function DetailsStep({
  value,
  onChange,
  errors,
  dependencies,
}: {
  value: Details;
  onChange: (next: Details) => void;
  errors: DetailsErrors;
  dependencies: Dependencies;
}) {
  const [tagDraft, setTagDraft] = useState("");
  // A category that isn't in the list (typed earlier, or saved with the draft) shows as "Other".
  const [other, setOther] = useState(value.category.trim() !== "" && !SUGGESTED_CATEGORIES.includes(value.category));
  const otherMode = other;
  const focusCustom = useRef(false);
  const set = <K extends keyof Details>(key: K, v: Details[K]) => onChange({ ...value, [key]: v });

  const addTags = (raw: string) => {
    const parts = raw.split(",");
    const next = normalizeTags([...value.tags, ...parts]);
    set("tags", next.slice(0, LIMITS.tags + 1)); // one over the limit stays visible so the error can explain it
    setTagDraft("");
  };

  const described = (name: keyof DetailsErrors, extra?: string) =>
    [errors[name] ? `${fieldId(name)}-error` : null, extra].filter(Boolean).join(" ") || undefined;

  return (
    <FieldGroup>
      <Field data-invalid={!!errors.title}>
        <FieldLabel htmlFor={fieldId("title")}>Title</FieldLabel>
        <Input
          id={fieldId("title")}
          value={value.title}
          maxLength={LIMITS.title + 20}
          required
          aria-required="true"
          aria-invalid={!!errors.title}
          aria-describedby={described("title")}
          onChange={(e) => set("title", e.target.value)}
        />
        {errors.title && <FieldError id={`${fieldId("title")}-error`}>{errors.title}</FieldError>}
      </Field>

      <Field data-invalid={!!errors.description}>
        <FieldLabel htmlFor={fieldId("description")}>Short description</FieldLabel>
        <Input
          id={fieldId("description")}
          value={value.description}
          required
          aria-required="true"
          aria-invalid={!!errors.description}
          aria-describedby={described("description", `${fieldId("description")}-count`)}
          onChange={(e) => set("description", e.target.value)}
        />
        <FieldDescription id={`${fieldId("description")}-count`}>
          {value.description.trim().length}/{LIMITS.description} characters
        </FieldDescription>
        {errors.description && <FieldError id={`${fieldId("description")}-error`}>{errors.description}</FieldError>}
      </Field>

      <Field data-invalid={!!errors.category}>
        <FieldLabel htmlFor={fieldId("category")}>Category</FieldLabel>
        {/* Pick a common category, or "Other" to type your own: categories aren't limited to this list. */}
        <Select
          value={otherMode ? OTHER : value.category || undefined}
          onValueChange={(v) => {
            if (v === OTHER) {
              setOther(true);
              set("category", "");
              focusCustom.current = true; // the Select gives focus back as it closes; see onCloseAutoFocus below
            } else {
              setOther(false);
              set("category", v);
            }
          }}
        >
          <SelectTrigger
            id={fieldId("category")}
            size="lg"
            className="w-full"
            aria-required="true"
            aria-invalid={!!errors.category && !otherMode}
            aria-describedby={described("category", `${fieldId("category")}-hint`)}
          >
            <SelectValue placeholder="Choose a category" />
          </SelectTrigger>
          <SelectContent
            onCloseAutoFocus={(e) => {
              if (!focusCustom.current) return;
              focusCustom.current = false;
              e.preventDefault();
              document.getElementById(`${fieldId("category")}-custom`)?.focus();
            }}
          >
            {SUGGESTED_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
            <SelectSeparator />
            <SelectItem value={OTHER}>Other…</SelectItem>
          </SelectContent>
        </Select>
        {otherMode && (
          <div className="grid gap-1.5">
            <Label htmlFor={`${fieldId("category")}-custom`} className="text-sm font-normal">
              Your category
            </Label>
            <Input
              id={`${fieldId("category")}-custom`}
              value={value.category}
              maxLength={LIMITS.category + 20}
              aria-required="true"
              aria-invalid={!!errors.category}
              aria-describedby={described("category")}
              onChange={(e) => set("category", e.target.value)}
            />
          </div>
        )}
        <FieldDescription id={`${fieldId("category")}-hint`}>Choose the closest one, or pick Other to write your own.</FieldDescription>
        {errors.category && <FieldError id={`${fieldId("category")}-error`}>{errors.category}</FieldError>}
      </Field>

      <Field data-invalid={!!errors.tags}>
        <FieldLabel htmlFor={fieldId("tags")}>Tags (optional, up to {LIMITS.tags})</FieldLabel>
        {value.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Tags added">
            {value.tags.map((t) => (
              <li key={t} className="bg-muted text-foreground flex items-center gap-1 rounded-md py-0.5 pr-0.5 pl-2 text-sm">
                {t}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remove tag ${t}`}
                  onClick={() => set("tags", value.tags.filter((x) => x !== t))}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Input
          id={fieldId("tags")}
          value={tagDraft}
          aria-invalid={!!errors.tags}
          aria-describedby={described("tags", `${fieldId("tags")}-hint`)}
          onChange={(e) => (e.target.value.includes(",") ? addTags(e.target.value) : setTagDraft(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault(); // Enter adds a tag; it doesn't move to the next step
              if (tagDraft.trim()) addTags(tagDraft);
            }
          }}
          onBlur={() => tagDraft.trim() && addTags(tagDraft)}
        />
        <FieldDescription id={`${fieldId("tags")}-hint`}>Press Enter or type a comma to add a tag.</FieldDescription>
        {errors.tags && <FieldError id={`${fieldId("tags")}-error`}>{errors.tags}</FieldError>}
      </Field>

      <dl className="grid gap-3 rounded-lg border p-3 text-sm sm:grid-cols-2">
        <div className="grid gap-1">
          <dt className="text-muted-foreground">Packages it needs</dt>
          <dd>{dependencies.dependencies.length ? dependencies.dependencies.join(", ") : "None"}</dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-muted-foreground">Components it uses</dt>
          <dd>{dependencies.registryDependencies.length ? dependencies.registryDependencies.join(", ") : "None"}</dd>
        </div>
        <div className="grid gap-1">
          <dt className="text-muted-foreground">License</dt>
          <dd>{LICENSE}</dd>
        </div>
        {dependencies.unsupported.length > 0 && (
          <div className="grid gap-1 sm:col-span-2">
            <dt className="text-muted-foreground">Imports we can&apos;t include</dt>
            <dd>{dependencies.unsupported.join(", ")}. Anyone installing it would need these files too.</dd>
          </div>
        )}
      </dl>
    </FieldGroup>
  );
}
