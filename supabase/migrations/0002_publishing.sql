-- PROPOSAL: not applied. Publishing: versions, authors, public read access, and the publish function.
--
-- Security model in one paragraph: clients can only *insert* drafts and edit draft fields. Status,
-- slug and current_version_id are changed only by publish_component() (security definer).
-- component_versions has no insert/update/delete policies and its write privileges are revoked, so
-- the function is the only way a version comes into existence. Public reads go through the
-- published_components view and component_versions, never through the components table, because
-- row-level security cannot hide the draft `objects` column of a published row.

-- ---- components: publishing columns ------------------------------------------------------------
alter table public.components
  add column slug text unique,
  add column status text not null default 'draft' check (status in ('draft', 'published')),
  add column current_version_id uuid,
  add column description text,
  add column category text,
  add column tags text[] not null default '{}';

-- ---- component_authors -----------------------------------------------------------------------------
create table public.component_authors (
  component_id uuid not null references public.components (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'author' check (role in ('owner', 'author')),
  created_at timestamptz not null default now(),
  primary key (component_id, user_id)
);
create index component_authors_user_idx on public.component_authors (user_id);

-- The owner is always the first author, for existing and new components.
insert into public.component_authors (component_id, user_id, role)
select id, user_id, 'owner' from public.components;

create function public.add_owner_as_author() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.component_authors (component_id, user_id, role)
  values (new.id, new.user_id, 'owner');
  return new;
end $$;

create trigger components_add_owner after insert on public.components
  for each row execute function public.add_owner_as_author();

-- Security definer so policies that use it don't recurse into component_authors' own policies.
create function public.is_component_author(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.component_authors
    where component_id = cid and user_id = (select auth.uid())
  );
$$;

-- ---- component_versions: immutable ---------------------------------------------------------------
create table public.component_versions (
  id uuid primary key default gen_random_uuid(),
  component_id uuid not null references public.components (id) on delete cascade,
  version int not null check (version > 0),
  code text not null,
  code_sha256 text not null,
  dependencies jsonb not null default '[]'::jsonb,
  details jsonb not null,            -- snapshot: title, description, category, tags, license
  check_results jsonb not null,      -- reported by the browser: informational only, not proof
  is_published boolean not null default true,
  published_at timestamptz not null default now(),
  published_by uuid not null references auth.users (id),
  idempotency_key uuid not null,
  unique (component_id, version),
  unique (component_id, idempotency_key)
);
create index component_versions_hash_idx on public.component_versions (code_sha256);
create index component_versions_latest_idx on public.component_versions (component_id, version desc);

alter table public.components
  add constraint components_current_version_fk
  foreign key (current_version_id) references public.component_versions (id);

-- Defence in depth: even a role that bypasses RLS cannot edit a published version.
create function public.forbid_version_update() returns trigger
language plpgsql as $$
begin
  raise exception 'published versions are immutable' using errcode = 'P0001';
end $$;

create trigger component_versions_immutable before update on public.component_versions
  for each row execute function public.forbid_version_update();

-- ---- rate limit log ----------------------------------------------------------------------------------
create table public.publish_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index publish_log_user_time_idx on public.publish_log (user_id, created_at desc);
alter table public.publish_log enable row level security;  -- no policies: only the function touches it

-- ---- row level security ------------------------------------------------------------------------------
alter table public.component_authors enable row level security;
alter table public.component_versions enable row level security;

-- components: only authors read the table directly (it holds draft code in `objects`).
drop policy "own components" on public.components;

create policy "authors read components" on public.components
  for select using (user_id = (select auth.uid()) or public.is_component_author(id));
create policy "anyone inserts own components" on public.components
  for insert with check (user_id = (select auth.uid()));
create policy "authors update components" on public.components
  for update using (public.is_component_author(id)) with check (public.is_component_author(id));
-- Only drafts can be deleted, so a published component and its versions can't be removed by the API.
create policy "owner deletes drafts" on public.components
  for delete using (user_id = (select auth.uid()) and status = 'draft');

-- Clients may edit draft fields only. status, slug and current_version_id are not in this list.
revoke insert, update on public.components from anon, authenticated;
grant insert (name, project_name, objects, description, category, tags) on public.components to authenticated;
grant update (name, project_name, objects, version, description, category, tags) on public.components to authenticated;

create policy "authors read author rows" on public.component_authors
  for select using (public.is_component_author(component_id));
-- No insert/update/delete policies: authors are managed server-side for now.
revoke insert, update, delete on public.component_authors from anon, authenticated;

-- versions: public read, no client writes at all.
create policy "published versions are public" on public.component_versions
  for select to anon, authenticated using (is_published);
revoke insert, update, delete on public.component_versions from anon, authenticated;

-- What the public (gallery, public page) may see of a published component. Never includes `objects`.
create view public.published_components as
  select id, slug, name, description, category, tags, current_version_id, updated_at
  from public.components
  where status = 'published';
grant select on public.published_components to anon, authenticated;

-- ---- publish_component ---------------------------------------------------------------------------------
-- Single transaction: lock, check ownership, validate, rate limit, slug, insert version, flip status.
-- The code is read from the SAVED draft (components.objects), never from the browser.
-- p_check_results is whatever the browser reported. It is stored for information; the accessibility,
-- theme and light/dark checks run client-side and can be bypassed, so nothing here relies on them.
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
