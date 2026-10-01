-- PROPOSAL: not applied. Feedback (comments), who-is-who for public display, a copy counter, the
-- indexes the Overview page needs, and one function that returns the whole Overview in one call.
--
-- Lines tagged [copies] belong to the optional copy counter. Remove them all to leave it out.

-- ---- comments --------------------------------------------------------------------------------------
-- A version row must belong to the component it is attached to. This lets comments enforce that.
alter table public.component_versions
  add constraint component_versions_id_component_key unique (id, component_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  component_id uuid not null,
  version_id uuid not null,
  author_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  category text not null check (category in ('accessibility', 'api-design', 'visual-polish')),
  line_number int check (line_number is null or line_number > 0),
  status text not null default 'open' check (status in ('open', 'addressed')),
  created_at timestamptz not null default now(),
  foreign key (version_id, component_id) references public.component_versions (id, component_id) on delete cascade,
  foreign key (component_id) references public.components (id) on delete cascade
);

-- Security definer so these work for signed-out visitors, who can't read the components table.
create function public.is_component_published(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.components where id = cid and status = 'published');
$$;

create function public.is_component_owner(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.components where id = cid and user_id = (select auth.uid()));
$$;

alter table public.comments enable row level security;

-- Anyone, signed in or not, can read comments on published components.
create policy "comments on published components are public" on public.comments
  for select to anon, authenticated using (public.is_component_published(component_id));

-- Signed-in people can comment on published components, as themselves, and always as "open".
create policy "signed-in people can comment" on public.comments
  for insert to authenticated
  with check (author_id = (select auth.uid()) and status = 'open' and public.is_component_published(component_id));

-- The commenter can edit their own comment; the component's owner can mark comments addressed.
-- (Which columns each of them may change is enforced by the trigger below.)
create policy "commenter or owner can update" on public.comments
  for update to authenticated
  using (author_id = (select auth.uid()) or public.is_component_owner(component_id))
  with check (author_id = (select auth.uid()) or public.is_component_owner(component_id));

create policy "commenter can delete" on public.comments
  for delete to authenticated using (author_id = (select auth.uid()));

-- Table privileges are limited to what each action needs. component_id, version_id, author_id and
-- created_at can never be changed after the comment is written.
revoke all on public.comments from anon, authenticated;
grant select on public.comments to anon, authenticated;
grant insert (component_id, version_id, body, category, line_number) on public.comments to authenticated;
grant update (body, category, line_number, status) on public.comments to authenticated;
grant delete on public.comments to authenticated;

create function public.comments_guard() returns trigger
language plpgsql as $$
declare
  uid uuid := (select auth.uid());
  is_owner boolean := public.is_component_owner(old.component_id);
begin
  if uid is null then return new; end if; -- admin tooling, not an app user
  -- The commenter alone may not close their own comment's status...
  if uid = old.author_id and not is_owner and new.status is distinct from old.status then
    raise exception 'only the component owner can change a comment''s status' using errcode = 'P0001';
  end if;
  -- ...and the owner alone may not rewrite someone else's words.
  if is_owner and uid <> old.author_id
     and (new.body, new.category, new.line_number) is distinct from (old.body, old.category, old.line_number) then
    raise exception 'only the commenter can edit a comment' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger comments_guard before update on public.comments
  for each row execute function public.comments_guard();

-- ---- names and the public view of published components -------------------------------------------------
-- profiles is private (each person sees only their own). This exposes just the names of people who
-- have published something or commented, and nothing else about them.
create view public.public_authors as
  select p.id, p.full_name
  from public.profiles p
  where exists (select 1 from public.components c where c.user_id = p.id and c.status = 'published')
     or exists (select 1 from public.comments m where m.author_id = p.id);
grant select on public.public_authors to anon, authenticated;

-- ---- copy counter (optional) ----------------------------------------------------------------------------
-- A plain number on the component, bumped by a tiny function anyone can call, signed in or not.
alter table public.components add column copies bigint not null default 0;                      -- [copies]

create function public.record_copy(p_slug text) returns void                                    -- [copies]
language sql security definer set search_path = '' as $$                                        -- [copies]
  update public.components set copies = copies + 1 where slug = p_slug and status = 'published'; -- [copies]
$$;                                                                                             -- [copies]
revoke all on function public.record_copy(text) from public;                                    -- [copies]
grant execute on function public.record_copy(text) to anon, authenticated;                      -- [copies]

-- "Last edited" must not move when someone copies a component: only real edits touch updated_at.
drop trigger components_touch on public.components;                                             -- [copies]
create trigger components_touch before update of name, project_name, objects, version,          -- [copies]
  description, category, tags, status, slug, current_version_id on public.components            -- [copies]
  for each row execute function public.touch_updated_at();                                      -- [copies]

-- The public view gains who published it, when, and (optionally) the copy count. New columns go last.
create or replace view public.published_components as
  select c.id, c.slug, c.name, c.description, c.category, c.tags, c.current_version_id, c.updated_at,
         c.user_id as author_id,
         (select v.published_at from public.component_versions v where v.id = c.current_version_id) as published_at,
         c.copies                                                                               -- [copies]
  from public.components c
  where c.status = 'published';

-- ---- indexes the Overview needs -----------------------------------------------------------------------
create index comments_component_status_idx on public.comments (component_id, status, created_at desc);
create index comments_author_idx on public.comments (author_id, created_at desc);
create index components_user_status_updated_idx on public.components (user_id, status, updated_at desc);
create index components_published_idx on public.components (updated_at desc) where status = 'published';

-- ---- get_overview ------------------------------------------------------------------------------------------
-- Everything the Overview page shows, in one round trip. It runs as the signed-in person (not as an
-- admin), so row level security still applies, and it always uses their own id from the session,
-- never one passed in.
create function public.get_overview() returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not_signed_in' using errcode = 'P0001'; end if;

  return jsonb_build_object(
    'stats', (
      select jsonb_build_object(
        'drafts', count(*) filter (where c.status = 'draft'),
        'published', count(*) filter (where c.status = 'published'),
        'open_feedback', (
          select count(*) from public.comments m join public.components pc on pc.id = m.component_id
          where pc.user_id = uid and m.status = 'open'),
        'copies', coalesce(sum(c.copies) filter (where c.status = 'published'), 0)              -- [copies]
      ) from public.components c where c.user_id = uid),

    'recent_drafts', (
      select coalesce(jsonb_agg(d order by d.updated_at desc), '[]'::jsonb) from (
        select id, name, project_name, updated_at from public.components
        where user_id = uid and status = 'draft' order by updated_at desc limit 3) d),

    'published', (
      select coalesce(jsonb_agg(p order by p.published_at desc), '[]'::jsonb) from (
        select c.id, c.name, c.slug, v.version, v.published_at,
               (select count(*) from public.comments m where m.component_id = c.id and m.status = 'open') as open_feedback,
               c.copies                                                                         -- [copies]
        from public.components c join public.component_versions v on v.id = c.current_version_id
        where c.user_id = uid and c.status = 'published'
        order by v.published_at desc limit 5) p),

    'open_feedback', (
      select coalesce(jsonb_agg(f order by f.created_at desc), '[]'::jsonb) from (
        select m.id, m.component_id, c.name as component_name, c.slug, m.category,
               left(m.body, 300) as body, m.line_number, m.created_at, a.full_name as author_name
        from public.comments m
        join public.components c on c.id = m.component_id
        left join public.public_authors a on a.id = m.author_id
        where c.user_id = uid and m.status = 'open'
        order by m.created_at desc limit 5) f),

    'feedback_requests', (
      select coalesce(jsonb_agg(r order by r.comment_count, r.published_at desc), '[]'::jsonb) from (
        select pc.id, pc.name, pc.slug, pc.published_at, a.full_name as author_name,
               (select count(*) from public.comments m where m.component_id = pc.id) as comment_count
        from public.published_components pc
        left join public.public_authors a on a.id = pc.author_id
        where pc.author_id <> uid
        order by comment_count, pc.published_at desc limit 4) r),

    'checklist', jsonb_build_object(
      'has_component', exists (select 1 from public.components where user_id = uid),
      'has_published', exists (select 1 from public.components where user_id = uid and status = 'published'),
      -- Not a join on components: someone else's draft rows aren't readable by this person.
      'has_commented', exists (
        select 1 from public.comments m
        where m.author_id = uid and not public.is_component_owner(m.component_id)))
  );
end $$;

revoke all on function public.get_overview() from public, anon;
grant execute on function public.get_overview() to authenticated;
