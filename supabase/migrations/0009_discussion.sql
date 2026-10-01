-- Discussion on a published component: replies, a public view of comments with who wrote them,
-- spam protection, and a comment count for the gallery.
--
-- "Feedback" is a top-level comment (with a category, and optionally a line of the code). A reply
-- is a comment under one of those. Replies go one level deep, like a thread: you reply to the
-- feedback, not to a reply. Only feedback counts as "open" or "addressed".

alter table public.comments add column parent_id uuid references public.comments (id) on delete cascade;
alter table public.comments alter column category drop not null;
alter table public.comments add constraint comments_reply_shape check (
  (parent_id is null and category is not null)
  or (parent_id is not null and category is null and line_number is null)
);
create index comments_parent_idx on public.comments (parent_id) where parent_id is not null;

grant insert (parent_id) on public.comments to authenticated;

-- A reply goes under feedback (not under another reply) on the same component, and nobody can
-- post more than 30 comments an hour.
create function public.comments_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  parent public.comments%rowtype;
begin
  if new.parent_id is not null then
    select * into parent from public.comments where id = new.parent_id;
    if not found or parent.parent_id is not null or parent.component_id <> new.component_id then
      raise exception 'invalid_reply' using errcode = 'P0001';
    end if;
  end if;
  if (select count(*) from public.comments where author_id = new.author_id and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger comments_before_insert before insert on public.comments
  for each row execute function public.comments_before_insert();

-- Only feedback has a status. (Replaces the earlier guard, with that one extra rule.)
create or replace function public.comments_guard() returns trigger
language plpgsql as $$
declare
  uid uuid := (select auth.uid());
  is_owner boolean := public.is_component_owner(old.component_id);
begin
  if uid is null then return new; end if;
  if old.parent_id is not null and new.status is distinct from old.status then
    raise exception 'only feedback has a status' using errcode = 'P0001';
  end if;
  if uid = old.author_id and not is_owner and new.status is distinct from old.status then
    raise exception 'only the component owner can change a comment''s status' using errcode = 'P0001';
  end if;
  if is_owner and uid <> old.author_id
     and (new.body, new.category, new.line_number) is distinct from (old.body, old.category, old.line_number) then
    raise exception 'only the commenter can edit a comment' using errcode = 'P0001';
  end if;
  return new;
end $$;

-- What the public page reads: every comment on a published component, with its author's public
-- details and which version it was written on. It never shows comments on drafts.
create view public.public_comments as
  select m.id, m.component_id, m.version_id, v.version, m.parent_id, m.author_id, m.body, m.category,
         m.line_number, m.status, m.created_at,
         a.full_name as author_name, a.username as author_username, a.avatar_path as author_avatar_path
  from public.comments m
  join public.component_versions v on v.id = m.version_id
  left join public.public_authors a on a.id = m.author_id
  where public.is_component_published(m.component_id);
grant select on public.public_comments to anon, authenticated;

-- The gallery shows how much discussion a component has.
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
         a.avatar_path as author_avatar_path,
         (select count(*) from public.comments m where m.component_id = c.id) as comment_count
  from public.components c
  left join public.component_versions v on v.id = c.current_version_id
  left join public.public_authors a on a.id = c.user_id
  where c.status = 'published';
grant select on public.published_components to anon, authenticated;

-- Replies aren't "open feedback": the Overview counts and lists only feedback.
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
          where pc.user_id = uid and m.status = 'open' and m.parent_id is null),
        'copies', coalesce(sum(c.copies) filter (where c.status = 'published'), 0)              -- [copies]
      ) from public.components c where c.user_id = uid),

    'recent_drafts', (
      select coalesce(jsonb_agg(d order by d.updated_at desc), '[]'::jsonb) from (
        select id, name, project_name, updated_at from public.components
        where user_id = uid and status = 'draft' order by updated_at desc limit 3) d),

    'published', (
      select coalesce(jsonb_agg(p order by p.published_at desc), '[]'::jsonb) from (
        select c.id, c.name, c.slug, v.version, v.published_at,
               (select count(*) from public.comments m where m.component_id = c.id and m.status = 'open' and m.parent_id is null) as open_feedback,
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
        where c.user_id = uid and m.status = 'open' and m.parent_id is null
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
