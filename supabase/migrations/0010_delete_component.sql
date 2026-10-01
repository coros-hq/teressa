-- Lets the owner delete one of their components, published or not.
--
-- Until now only drafts could be deleted (a table policy), so a published component, its versions and
-- the feedback on it were protected from the API. This is the one controlled way around that: a
-- function that checks the caller owns the component, then removes it. Versions, comments and the
-- author rows go with it (they already cascade). The route removes the preview images afterwards.
create function public.delete_component(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then raise exception 'not_signed_in' using errcode = 'P0001'; end if;
  -- Only the owner. A co-author can edit a component but not remove it.
  delete from public.components where id = p_id and user_id = uid;
  if not found then raise exception 'not_allowed' using errcode = 'P0001'; end if;
end $$;

revoke all on function public.delete_component(uuid) from public, anon;
grant execute on function public.delete_component(uuid) to authenticated;
