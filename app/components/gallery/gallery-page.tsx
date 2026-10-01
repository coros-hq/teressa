import { Search } from "lucide-react";
import { Link, useNavigate } from "react-router";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "~/components/ui/select";
import { galleryHref, SORTS, type GalleryParams, type GalleryResult } from "~/lib/data/gallery";
import { cn } from "~/lib/utils";

import { GalleryCard } from "./gallery-card";

const ALL = "__all__";

/** One filter dropdown. Choosing "All" clears it; the current choice is always listed, so it can be seen and cleared. */
function FilterSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  allLabel: string;
  value: string | null;
  options: { value: string; label: string; total?: number }[];
  onChange: (v: string | null) => void;
  className?: string;
}) {
  const listed = value && !options.some((o) => o.value === value) ? [{ value, label: value }, ...options] : options;
  return (
    <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? null : v)}>
      <SelectTrigger size="lg" aria-label={label} className={cn("h-11 w-full", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{allLabel}</SelectItem>
        {listed.length > 0 && <SelectSeparator />}
        {listed.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
            {o.total !== undefined && <span className="text-muted-foreground ml-2">{o.total}</span>}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function GalleryPage({ result, params, origin }: { result: GalleryResult; params: GalleryParams; origin: string }) {
  const { items, hasMore, categories, tags } = result;
  const filtered = !!params.q || !!params.category || !!params.tag;
  const navigate = useNavigate();
  const go = (change: Partial<GalleryParams>) => navigate(galleryHref(params, change));

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Explore components</h1>
        <p className="text-muted-foreground">Free, ready-to-use components made by people on Teressa. Copy one into your project.</p>
      </div>

      {/* Search, category, tag and order on one row. Picking from a dropdown applies right away. */}
      <form
        role="search"
        action="/explore"
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          go({ q: String(new FormData(e.currentTarget).get("q") ?? "") });
        }}
      >
        <label htmlFor="gallery-search" className="sr-only">
          Search components
        </label>
        <Input id="gallery-search" name="q" type="search" defaultValue={params.q} placeholder="Search components" className="min-w-[14rem] flex-1" autoComplete="off" />
        <FilterSelect
          label="Category"
          allLabel="All categories"
          value={params.category}
          options={categories.map((c) => ({ value: c.category, label: c.category, total: c.total }))}
          onChange={(category) => go({ category })}
          className="sm:w-48"
        />
        <FilterSelect
          label="Tag"
          allLabel="All tags"
          value={params.tag}
          options={tags.map((t) => ({ value: t.tag, label: t.tag, total: t.total }))}
          onChange={(tag) => go({ tag })}
          className="sm:w-44"
        />
        <Select value={params.sort} onValueChange={(sort) => go({ sort: sort as GalleryParams["sort"] })}>
          <SelectTrigger size="lg" aria-label="Sort by" className="h-11 w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" className="min-h-11">
          <Search aria-hidden />
          Search
        </Button>
      </form>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
          <h2 className="text-lg font-semibold">{filtered ? "Nothing matches that" : "Nothing published yet"}</h2>
          <p className="text-muted-foreground max-w-sm text-sm">
            {filtered ? "Try a different word, or clear the filters to see everything." : "Components will show up here as soon as people publish them."}
          </p>
          {filtered && (
            <Button asChild variant="outline" className="min-h-11">
              <Link to="/explore">Clear filters</Link>
            </Button>
          )}
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.id}>
              <GalleryCard item={item} origin={origin} />
            </li>
          ))}
        </ul>
      )}

      {(params.page > 1 || hasMore) && (
        <nav aria-label="Pages" className="flex items-center justify-between gap-3">
          {params.page > 1 ? (
            <Button asChild variant="outline" className="min-h-11">
              <Link to={galleryHref(params, { page: params.page - 1 })} rel="prev">
                Previous
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground text-sm">Page {params.page}</span>
          {hasMore ? (
            <Button asChild variant="outline" className="min-h-11">
              <Link to={galleryHref(params, { page: params.page + 1 })} rel="next">
                Next
              </Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
