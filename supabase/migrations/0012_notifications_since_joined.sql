-- "New component" notifications only cover components published after the person joined, so a
-- new account doesn't open to a backlog of everything ever published. Same function, one more condition.
create or replace function public.notifications_union() returns table (
  kind text, id uuid, at timestamptz, actor_name text, component_name text, slug text, body text
) language sql stable set search_path = '' as $$
  select 'feedback', m.id, m.created_at, m.author_name, pc.name, pc.slug, left(m.body, 160)
  from public.public_comments m
  join public.published_components pc on pc.id = m.component_id
  where m.parent_id is null and pc.author_id = (select auth.uid()) and m.author_id <> (select auth.uid())
  union all
  select 'reply', m.id, m.created_at, m.author_name, pc.name, pc.slug, left(m.body, 160)
  from public.public_comments m
  join public.public_comments parent on parent.id = m.parent_id
  join public.published_components pc on pc.id = m.component_id
  where parent.author_id = (select auth.uid()) and m.author_id <> (select auth.uid())
  union all
  select 'new_component', pc.id, v.published_at, pc.author_name, pc.name, pc.slug, pc.description
  from public.published_components pc
  join public.component_versions v on v.component_id = pc.id and v.version = 1
  where pc.author_id is distinct from (select auth.uid())
    and v.published_at > coalesce((select p.created_at from public.profiles p where p.id = (select auth.uid())), now())
$$;
