-- In-app notifications. Nothing is stored per notification: the list is worked out from data that
-- already exists, so it can never disagree with it (a deleted component or comment simply stops
-- appearing). The only new state is when each person last looked.
--
-- Three kinds, never about your own actions:
--   feedback       someone left feedback on one of your published components
--   reply          someone replied to a comment of yours
--   new_component  someone else published a component for the first time

create table public.notification_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  seen_at timestamptz not null
);
alter table public.notification_state enable row level security;
create policy "own notification state" on public.notification_state
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.notification_state from anon, authenticated;
grant select on public.notification_state to authenticated;   -- writes only through mark_notifications_seen()

-- One row per notification, newest first. Runs as the signed-in person, reading only public views,
-- so it can't show anything they couldn't already see on the site.
create function public.notifications_union() returns table (
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
$$;

create function public.get_notifications(p_limit int default 20, p_offset int default 0) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  seen timestamptz;
begin
  if uid is null then raise exception 'not_signed_in' using errcode = 'P0001'; end if;
  -- Until someone has looked once, only what happened after they joined counts as new.
  select coalesce(
    (select s.seen_at from public.notification_state s where s.user_id = uid),
    (select p.created_at from public.profiles p where p.id = uid),
    now()) into seen;

  return jsonb_build_object(
    'seen_at', seen,
    'unread', (select count(*) from public.notifications_union() n where n.at > seen),
    'total', (select count(*) from public.notifications_union()),
    'items', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.at desc), '[]'::jsonb) from (
        select n.kind, n.id, n.at, n.actor_name, n.component_name, n.slug, n.body
        from public.notifications_union() n
        order by n.at desc, n.id
        limit greatest(1, least(coalesce(p_limit, 20), 50)) offset greatest(0, coalesce(p_offset, 0))) r)
  );
end $$;

create function public.mark_notifications_seen() returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not_signed_in' using errcode = 'P0001'; end if;
  insert into public.notification_state (user_id, seen_at) values (uid, now())
  on conflict (user_id) do update set seen_at = excluded.seen_at;
end $$;

revoke all on function public.notifications_union() from public, anon;
revoke all on function public.get_notifications(int, int) from public, anon;
revoke all on function public.mark_notifications_seen() from public, anon;
grant execute on function public.notifications_union() to authenticated;
grant execute on function public.get_notifications(int, int) to authenticated;
grant execute on function public.mark_notifications_seen() to authenticated;
