-- The tags in use across published components, most used first, for the gallery's tag filter.
-- Reads only the public published view, so it shows nothing a visitor couldn't already see.
create function public.gallery_tags() returns table (tag text, total bigint)
language sql stable as $$
  select t, count(*) from public.published_components, unnest(tags) as t
  where t <> '' group by t order by count(*) desc, t limit 30;
$$;
grant execute on function public.gallery_tags() to anon, authenticated;

-- Filtering by a tag ("tags contains") uses this.
create index components_tags_idx on public.components using gin (tags) where status = 'published';
