-- PROPOSAL: not applied. Account deletion, where the person chooses whether their published
-- components are deleted too or kept as "Deleted user".
--
-- How a deletion runs (the app's server route, using the service role, never the browser):
--   1. begin_account_deletion(user, keep_published)  - this file: clears the person's data in the database
--   2. the route removes the person's avatar files through the storage service
--   3. the route deletes the sign-in account, which removes the profile and preferences
--   4. finish_account_deletion(user)                  - clears the bookkeeping row
-- Every step is safe to repeat, so a deletion that stopped half way can be finished by running it again.

-- ---- components and versions can outlive their author ------------------------------------------------------
-- A kept component has no owner. Nobody can edit it (there is no author left), but it stays public,
-- keeps working for installs, and shows as by "Deleted user".
alter table public.components alter column user_id drop not null;

alter table public.component_versions alter column published_by drop not null;
alter table public.component_versions drop constraint component_versions_published_by_fkey;
alter table public.component_versions
  add constraint component_versions_published_by_fkey foreign key (published_by) references auth.users (id) on delete set null;

-- Versions stay immutable, with one exception: when their author's account is deleted the database
-- clears the "published by" link. Nothing else about a version can ever change.
create or replace function public.forbid_version_update() returns trigger
language plpgsql as $$
begin
  if new.published_by is null and old.published_by is not null
     and (new.id, new.component_id, new.version, new.code, new.code_sha256, new.dependencies, new.details,
          new.check_results, new.is_published, new.published_at, new.idempotency_key)
         is not distinct from
         (old.id, old.component_id, old.version, old.code, old.code_sha256, old.dependencies, old.details,
          old.check_results, old.is_published, old.published_at, old.idempotency_key) then
    return new;
  end if;
  raise exception 'published versions are immutable' using errcode = 'P0001';
end $$;

-- Components with no author must still show up for feedback ("<>" would hide them, as null isn't equal to anything).
create or replace function public.get_overview() returns jsonb
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
        where pc.author_id is distinct from uid
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


-- ---- bookkeeping ---------------------------------------------------------------------------------------------------
-- No foreign key on purpose: this record has to outlive the account it is about. It remembers which
-- choice the person made, so finishing an interrupted deletion can't change the answer half way.
create table public.account_deletions (
  user_id uuid primary key,
  keep_published boolean not null,
  started_at timestamptz not null default now()
);
create table public.account_deletion_log (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  created_at timestamptz not null default now()
);
create index account_deletion_log_user_time_idx on public.account_deletion_log (user_id, created_at desc);
alter table public.account_deletions enable row level security;
alter table public.account_deletion_log enable row level security;
revoke all on public.account_deletions, public.account_deletion_log from anon, authenticated; -- no policies: server only

-- ---- step 1 -------------------------------------------------------------------------------------------------------
-- The person's own comments and their drafts are always deleted. Published components are deleted or
-- kept (made ownerless) according to the choice. Comments other people left on kept components stay.
create function public.begin_account_deletion(p_user uuid, p_keep_published boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  intent public.account_deletions%rowtype;
  max_per_hour constant int := 5;
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
  delete from public.components where user_id = p_user and (status = 'draft' or not intent.keep_published);
  update public.components set user_id = null where user_id = p_user;  -- what is left is published and kept

  return jsonb_build_object('keep_published', intent.keep_published, 'avatar_folder', p_user::text);
end $$;

-- ---- step 4 --------------------------------------------------------------------------------------------------------
create function public.finish_account_deletion(p_user uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.account_deletions where user_id = p_user;
$$;

-- Only the server (service role) may run these. Signed-in people and visitors can't, even for their own account.
revoke all on function public.begin_account_deletion(uuid, boolean) from public, anon, authenticated;
revoke all on function public.finish_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.begin_account_deletion(uuid, boolean) to service_role;
grant execute on function public.finish_account_deletion(uuid) to service_role;
