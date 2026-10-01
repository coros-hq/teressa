-- Brings publish_component in line with the final design, for databases that already ran an earlier
-- version of 0002: categories are free text, an exact copy of any published code is refused
-- (this component's earlier versions or anyone else's), and the "publish anyway" argument is gone.
-- Safe to run on a fresh database too: it replaces the function whichever version is there.

drop function if exists public.publish_component(uuid, text, text, text, text, text, text[], jsonb, jsonb, uuid, boolean);
drop function if exists public.publish_component(uuid, text, text, text, text, text, text[], jsonb, jsonb, uuid);

create index if not exists component_versions_hash_idx on public.component_versions (code_sha256);

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
  p_idempotency_key uuid
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
    (component_id, version, code, code_sha256, dependencies, details, check_results, published_by, idempotency_key)
  values
    (p_component_id, next_version, src, src_hash, p_dependencies,
     jsonb_build_object('title', btrim(p_title), 'description', btrim(p_description),
                        'category', btrim(p_category), 'tags', to_jsonb(coalesce(p_tags, '{}')), 'license', 'MIT'),
     p_check_results, uid, p_idempotency_key)
  returning id into new_id;

  update public.components set
    slug = comp.slug, status = 'published', current_version_id = new_id,
    name = btrim(p_title), description = btrim(p_description), category = btrim(p_category),
    tags = coalesce(p_tags, '{}')
  where id = p_component_id;

  return jsonb_build_object('slug', comp.slug, 'version', next_version, 'version_id', new_id, 'repeated', false);
end $$;

revoke all on function public.publish_component(uuid, text, text, text, text, text, text[], jsonb, jsonb, uuid) from public, anon;
grant execute on function public.publish_component(uuid, text, text, text, text, text, text[], jsonb, jsonb, uuid) to authenticated;
