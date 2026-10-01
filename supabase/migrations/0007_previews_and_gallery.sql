-- PROPOSAL / APPLIED WITH THE GALLERY: preview images for published components, and what the public
-- gallery reads.
--
-- A preview is two images (light and dark theme) made in the publisher's browser from the component
-- itself and stored in a public "previews" bucket, one pair per published version. Nobody can change
-- or delete them afterwards (a published version never changes). Versions published before this
-- have no preview; the gallery shows a plain placeholder for them.

-- ---- versions carry their previews ----------------------------------------------------------------------------
alter table public.component_versions
  add column preview_light text,
  add column preview_dark text,
  add constraint component_versions_preview_light_path
    check (preview_light is null or preview_light ~ ('^' || component_id::text || '/[0-9a-f-]{36}-light\.(webp|png)$')),
  add constraint component_versions_preview_dark_path
    check (preview_dark is null or preview_dark ~ ('^' || component_id::text || '/[0-9a-f-]{36}-dark\.(webp|png)$'));

-- ---- the previews bucket -------------------------------------------------------------------------------------------
-- Public to read. 1 MB and png/webp only, enforced by the storage service itself. People who are authors of a
-- component can ADD files to that component's folder, and nothing else: no replacing, no deleting.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('previews', 'previews', true, 1048576, array['image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "previews: authors add to their component's folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'previews'
    and case when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
             then public.is_component_author(((storage.foldername(name))[1])::uuid) else false end);
create policy "previews: authors can see their component's files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'previews'
    and case when (storage.foldername(name))[1] ~ '^[0-9a-f-]{36}$'
             then public.is_component_author(((storage.foldername(name))[1])::uuid) else false end);

-- ---- what the public may read ---------------------------------------------------------------------------------------
-- Names and usernames of people who published or commented (already public), plus their avatar.
create or replace view public.public_authors as
  select p.id, p.full_name, p.username, p.avatar_path
  from public.profiles p
  where exists (select 1 from public.components c where c.user_id = p.id and c.status = 'published')
     or exists (select 1 from public.comments m where m.author_id = p.id);
grant select on public.public_authors to anon, authenticated;

-- The gallery's one source: everything about the current published version of each component.
create or replace view public.published_components as
  select c.id, c.slug, c.name, c.description, c.category, c.tags, c.current_version_id, c.updated_at,
         c.user_id as author_id,
         v.published_at,
         c.copies,
         v.version,
         v.preview_light,
         v.preview_dark,
         a.full_name as author_name,
         a.username as author_username,
         a.avatar_path as author_avatar_path
  from public.components c
  left join public.component_versions v on v.id = c.current_version_id
  left join public.public_authors a on a.id = c.user_id
  where c.status = 'published';
grant select on public.published_components to anon, authenticated;

-- The categories in use, most used first, for the gallery's filter.
create function public.gallery_categories() returns table (category text, total bigint)
language sql stable as $$
  select category, count(*) from public.published_components
  where category is not null group by category order by count(*) desc, category limit 24;
$$;
grant execute on function public.gallery_categories() to anon, authenticated;

create index components_published_category_idx on public.components (category) where status = 'published';

-- ---- publishing needs the previews -----------------------------------------------------------------------------
drop function if exists public.publish_component(uuid, text, text, text, text, text, text[], jsonb, jsonb, uuid);

create function public.publish_component(
  p_component_id uuid,
  p_object_id text,            -- which component object in the design to publish
  p_code_sha256 text,          -- hash of the code the caller analysed; must match the saved draft
  p_title text,
  p_description text,
  p_category text,
  p_tags text[],
  p_dependencies jsonb,
  p_check_results jsonb,
  p_idempotency_key uuid,
  p_preview_light text,        -- where the browser-made preview images were stored (see the previews bucket)
  p_preview_dark text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  comp public.components%rowtype;
  existing public.component_versions%rowtype;
  latest public.component_versions%rowtype;
  obj jsonb;
  src text;
  src_hash text;
  base text;
  candidate text;
  n int := 1;
  next_version int;
  new_id uuid;
  max_code_bytes constant int := 204800;   -- 200 KB
  max_per_hour constant int := 10;
begin
  if uid is null then raise exception 'not_signed_in' using errcode = 'P0001'; end if;

  -- Lock the row: two tabs publishing the same component run one after the other.
  select * into comp from public.components where id = p_component_id for update;
  if not found or not public.is_component_author(p_component_id) then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;

  -- A retry of a request that already succeeded returns the same result and uses no rate limit.
  select * into existing from public.component_versions
    where component_id = p_component_id and idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('slug', comp.slug, 'version', existing.version, 'version_id', existing.id, 'repeated', true);
  end if;

  -- Validation (everything that doesn't need a browser).
  if p_title is null or char_length(btrim(p_title)) not between 1 and 80 then
    raise exception 'invalid_title' using errcode = 'P0001'; end if;
  if p_description is null or char_length(btrim(p_description)) not between 1 and 160 then
    raise exception 'invalid_description' using errcode = 'P0001'; end if;
  -- Categories are free text: no fixed list, just a sensible length.
  if p_category is null or char_length(btrim(p_category)) not between 1 and 40 then
    raise exception 'invalid_category' using errcode = 'P0001'; end if;
  if coalesce(array_length(p_tags, 1), 0) > 5
     or exists (select 1 from unnest(coalesce(p_tags, '{}')) t where char_length(t) not between 1 and 24) then
    raise exception 'invalid_tags' using errcode = 'P0001'; end if;
  if jsonb_typeof(p_dependencies) <> 'array' or jsonb_array_length(p_dependencies) > 50 then
    raise exception 'invalid_dependencies' using errcode = 'P0001'; end if;
  if jsonb_typeof(p_check_results) <> 'object' or pg_column_size(p_check_results) > 16384 then
    raise exception 'invalid_check_results' using errcode = 'P0001'; end if;
  -- Every new version needs both previews, stored in this component's own folder of the previews bucket.
  if p_preview_light is null or p_preview_dark is null
     or p_preview_light !~ ('^' || p_component_id::text || '/[0-9a-f-]{36}-light\.(webp|png)$')
     or p_preview_dark !~ ('^' || p_component_id::text || '/[0-9a-f-]{36}-dark\.(webp|png)$') then
    raise exception 'invalid_preview' using errcode = 'P0001'; end if;

  select o into obj from jsonb_array_elements(comp.objects) o
    where o ->> 'id' = p_object_id and o ->> 'kind' = 'component' limit 1;
  src := obj ->> 'code';
  if src is null or btrim(src) = '' then raise exception 'empty_code' using errcode = 'P0001'; end if;
  if octet_length(src) > max_code_bytes then raise exception 'code_too_large' using errcode = 'P0001'; end if;

  src_hash := encode(sha256(convert_to(src, 'UTF8')), 'hex');
  if src_hash <> p_code_sha256 then raise exception 'draft_changed' using errcode = 'P0001'; end if;

  -- No exact copies: the code must differ from every published version, of this component
  -- (nothing changed since the last version) and of anyone else's (duplicate of existing code).
  select * into latest from public.component_versions
    where component_id = p_component_id order by version desc limit 1;
  if exists (select 1 from public.component_versions where component_id = p_component_id and code_sha256 = src_hash) then
    raise exception 'no_code_changes' using errcode = 'P0001'; end if;
  if exists (select 1 from public.component_versions where code_sha256 = src_hash) then
    raise exception 'duplicate_code' using errcode = 'P0001'; end if;

  -- Rate limit (per user, rolling hour).
  if (select count(*) from public.publish_log where user_id = uid and created_at > now() - interval '1 hour') >= max_per_hour then
    raise exception 'rate_limited' using errcode = 'P0001'; end if;
  insert into public.publish_log (user_id) values (uid);

  -- Slug: made once, on first publish, and never changed after that.
  if comp.slug is null then
    base := left(trim(both '-' from regexp_replace(lower(p_title), '[^a-z0-9]+', '-', 'g')), 48);
    if base = '' then base := 'component'; end if;
    candidate := base;
    while exists (select 1 from public.components where slug = candidate) loop
      n := n + 1;
      candidate := base || '-' || n;
    end loop;
    comp.slug := candidate;
  end if;

  next_version := coalesce(latest.version, 0) + 1;
  insert into public.component_versions
    (component_id, version, code, code_sha256, dependencies, details, check_results, published_by, idempotency_key, preview_light, preview_dark)
  values
    (p_component_id, next_version, src, src_hash, p_dependencies,
     jsonb_build_object('title', btrim(p_title), 'description', btrim(p_description),
                        'category', btrim(p_category), 'tags', to_jsonb(coalesce(p_tags, '{}')), 'license', 'MIT'),
     p_check_results, uid, p_idempotency_key, p_preview_light, p_preview_dark)
  returning id into new_id;

  update public.components set
    slug = comp.slug, status = 'published', current_version_id = new_id,
    name = btrim(p_title), description = btrim(p_description), category = btrim(p_category),
    tags = coalesce(p_tags, '{}')
  where id = p_component_id;

  return jsonb_build_object('slug', comp.slug, 'version', next_version, 'version_id', new_id, 'repeated', false);
end $$;

revoke all on function public.publish_component(uuid, text, text, text, text, text, text[], jsonb, jsonb, uuid, text, text) from public, anon;
grant execute on function public.publish_component(uuid, text, text, text, text, text, text[], jsonb, jsonb, uuid, text, text) to authenticated;


-- ---- deleting an account also removes the previews of what is deleted ------------------------------------------
create or replace function public.begin_account_deletion(p_user uuid, p_keep_published boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  intent public.account_deletions%rowtype;
  max_per_hour constant int := 5;
  doomed uuid[];
begin
  if p_user is null then raise exception 'no_such_user' using errcode = 'P0001'; end if;

  -- Safe to repeat, but not unlimited: a few tries an hour is plenty for finishing an interrupted deletion.
  if (select count(*) from public.account_deletion_log where user_id = p_user and created_at > now() - interval '1 hour') >= max_per_hour then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.account_deletion_log (user_id) values (p_user);

  select * into intent from public.account_deletions where user_id = p_user;
  if not found then
    if not exists (select 1 from auth.users where id = p_user) then raise exception 'no_such_user' using errcode = 'P0001'; end if;
    insert into public.account_deletions (user_id, keep_published) values (p_user, p_keep_published) returning * into intent;
  end if;

  delete from public.comments where author_id = p_user;
  -- Remember which components are going, so the route can remove their preview images too.
  select coalesce(array_agg(id), '{}') into doomed from public.components
    where user_id = p_user and (status = 'draft' or not intent.keep_published);
  delete from public.components where id = any (doomed);
  update public.components set user_id = null where user_id = p_user;  -- what is left is published and kept

  return jsonb_build_object('keep_published', intent.keep_published, 'avatar_folder', p_user::text, 'deleted_component_ids', to_jsonb(doomed));
end $$;
